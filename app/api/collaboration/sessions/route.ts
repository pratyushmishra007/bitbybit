import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List collaboration sessions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    // Fetch user role to determine what sessions they can see
    const { data: user } = await supabase
      .from("users")
      .select("role, class_id, organization_id")
      .eq("id", session.user.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let query = supabase
      .from("collaboration_sessions")
      .select(`
        *,
        creator:created_by(id, name, email),
        class:class_id(id, name, code),
        participants:session_participants(count)
      `)
      .order("created_at", { ascending: false });

    // Filter by role
    if (user.role === "admin") {
      // Admin can see all sessions
    } else if (user.role === "teacher") {
      // Teacher sees sessions for classes they teach
      const { data: teacherClasses } = await supabase
        .from("teacher_assignments")
        .select("class_id")
        .eq("teacher_id", session.user.id);

      const classIds = teacherClasses?.map((tc) => tc.class_id) || [];
      
      if (classIds.length > 0) {
        query = query.in("class_id", classIds);
      } else {
        // No classes assigned, return empty
        return NextResponse.json({ sessions: [] });
      }
    } else if (user.role === "student") {
      // Student sees sessions for their class
      if (user.class_id) {
        query = query.eq("class_id", user.class_id);
      } else {
        return NextResponse.json({ sessions: [] });
      }
    }

    // Additional filters
    if (classId) {
      query = query.eq("class_id", classId);
    }

    if (activeOnly) {
      query = query.eq("is_active", true).gte("expires_at", new Date().toISOString());
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error("Error fetching sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Sessions API error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// POST - Create new collaboration session
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      sessionName,
      description,
      classId,
      assignmentId,
      language = "javascript",
      maxParticipants = 10,
      expiresInHours = 24,
    } = body;

    if (!sessionName || !classId) {
      return NextResponse.json(
        { error: "Session name and class ID are required" },
        { status: 400 }
      );
    }

    // Check if user has permission to create session for this class
    const { data: user } = await supabase
      .from("users")
      .select("role, class_id")
      .eq("id", session.user.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only teachers and admins can create sessions
    if (user.role === "student") {
      return NextResponse.json(
        { error: "Only teachers and admins can create collaboration sessions" },
        { status: 403 }
      );
    }

    // If teacher, verify they teach this class
    if (user.role === "teacher") {
      const { data: assignment } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", session.user.id)
        .eq("class_id", classId)
        .single();

      if (!assignment) {
        return NextResponse.json(
          { error: "You are not assigned to this class" },
          { status: 403 }
        );
      }
    }

    // Create the session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const { data: newSession, error: sessionError } = await supabase
      .from("collaboration_sessions")
      .insert({
        session_name: sessionName,
        description,
        class_id: classId,
        assignment_id: assignmentId,
        created_by: session.user.id,
        language,
        max_participants: maxParticipants,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating session:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Add creator as first participant (host)
    await supabase.from("session_participants").insert({
      session_id: newSession.id,
      user_id: session.user.id,
      role: "host",
      is_online: false, // They'll join when they open the editor
    });

    return NextResponse.json({
      success: true,
      session: newSession,
    });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// DELETE - Delete/end session
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Fetch session to check ownership
    const { data: collabSession } = await supabase
      .from("collaboration_sessions")
      .select("created_by")
      .eq("id", sessionId)
      .single();

    if (!collabSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check if user has permission (creator or admin)
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (
      user?.role !== "admin" &&
      collabSession.created_by !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You don't have permission to delete this session" },
        { status: 403 }
      );
    }

    // Soft delete - just mark as inactive
    const { error } = await supabase
      .from("collaboration_sessions")
      .update({ is_active: false })
      .eq("id", sessionId);

    if (error) {
      console.error("Error deleting session:", error);
      return NextResponse.json(
        { error: "Failed to delete session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
