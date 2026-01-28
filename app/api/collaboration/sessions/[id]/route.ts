import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get session details with participants
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    // Fetch session details
    const { data: collabSession, error: sessionError } = await supabase
      .from("collaboration_sessions")
      .select(`
        *,
        creator:created_by(id, name, email),
        class:class_id(id, name, code),
        assignment:assignment_id(id, title)
      `)
      .eq("id", sessionId)
      .single();

    if (sessionError || !collabSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check if user has access to this session
    const { data: user } = await supabase
      .from("users")
      .select("role, class_id")
      .eq("id", session.user.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify access based on role
    if (user.role === "admin") {
      // Admin has access to all sessions
    } else if (user.role === "teacher") {
      // Teacher must be assigned to the class
      const { data: assignment } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", session.user.id)
        .eq("class_id", collabSession.class_id)
        .single();

      if (!assignment) {
        return NextResponse.json(
          { error: "You don't have access to this class" },
          { status: 403 }
        );
      }
    } else if (user.role === "student") {
      // Student must be enrolled in the class
      if (user.class_id !== collabSession.class_id) {
        return NextResponse.json(
          { error: "You are not enrolled in this class" },
          { status: 403 }
        );
      }
    }

    // Fetch participants
    const { data: participants } = await supabase
      .from("session_participants")
      .select(`
        *,
        user:user_id(id, name, email)
      `)
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true });

    return NextResponse.json({
      session: collabSession,
      participants: participants || [],
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// POST - Join session
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    // Check if session exists and is active
    const { data: collabSession, error: sessionError } = await supabase
      .from("collaboration_sessions")
      .select("*, class:class_id(id)")
      .eq("id", sessionId)
      .single();

    if (sessionError || !collabSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!collabSession.is_active) {
      return NextResponse.json(
        { error: "This session has ended" },
        { status: 400 }
      );
    }

    if (new Date(collabSession.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This session has expired" },
        { status: 400 }
      );
    }

    // Check if user has access
    const { data: user } = await supabase
      .from("users")
      .select("role, class_id")
      .eq("id", session.user.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify access based on role
    if (user.role === "admin") {
      // Admin can join any session
    } else if (user.role === "teacher") {
      // Teacher must be assigned to the class
      const { data: assignment } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", session.user.id)
        .eq("class_id", collabSession.class_id)
        .single();

      if (!assignment) {
        return NextResponse.json(
          { error: "You are not assigned to this class" },
          { status: 403 }
        );
      }
    } else if (user.role === "student") {
      // Student must be enrolled in the class
      if (user.class_id !== collabSession.class_id) {
        return NextResponse.json(
          { error: "You are not enrolled in this class" },
          { status: 403 }
        );
      }
    }

    // Check participant limit
    const { count } = await supabase
      .from("session_participants")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId);

    if (count && count >= collabSession.max_participants) {
      return NextResponse.json(
        { error: "Session is full" },
        { status: 400 }
      );
    }

    // Add or update participant
    const { data: participant, error: participantError } = await supabase
      .from("session_participants")
      .upsert(
        {
          session_id: sessionId,
          user_id: session.user.id,
          role: "participant",
          is_online: true,
          last_active: new Date().toISOString(),
        },
        { onConflict: "session_id,user_id" }
      )
      .select()
      .single();

    if (participantError) {
      console.error("Error joining session:", participantError);
      return NextResponse.json(
        { error: "Failed to join session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      participant,
    });
  } catch (error) {
    console.error("Join session error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// PATCH - Update participant (cursor position, online status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const body = await req.json();
    const { cursorPosition, isOnline } = body;

    const updateData: any = {
      last_active: new Date().toISOString(),
    };

    if (cursorPosition !== undefined) {
      updateData.cursor_position = cursorPosition;
    }

    if (isOnline !== undefined) {
      updateData.is_online = isOnline;
    }

    const { error } = await supabase
      .from("session_participants")
      .update(updateData)
      .eq("session_id", sessionId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error updating participant:", error);
      return NextResponse.json(
        { error: "Failed to update participant" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update participant error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// DELETE - Leave session
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    // Mark participant as offline instead of deleting
    const { error } = await supabase
      .from("session_participants")
      .update({ is_online: false })
      .eq("session_id", sessionId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error leaving session:", error);
      return NextResponse.json(
        { error: "Failed to leave session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leave session error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
