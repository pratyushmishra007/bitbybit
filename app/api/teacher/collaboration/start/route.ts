import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Start a collaboration session with a student
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role from session or database
    let userRole = (session.user as any).role;
    if (!userRole && session.user.id) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();
      userRole = userData?.role;
    }

    if (userRole !== "teacher" && userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const teacherId = (session.user as any).id;

    // Get student's class
    const { data: student } = await supabase
      .from("users")
      .select("class_id, name")
      .eq("id", studentId)
      .single();

    if (!student || !student.class_id) {
      return NextResponse.json(
        { error: "Student not found or not enrolled in a class" },
        { status: 404 }
      );
    }

    // Verify teacher is assigned to this class
    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("class_id", student.class_id)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this student's class" },
        { status: 403 }
      );
    }

    // Create collaboration session with correct schema
    const { data: collaborationSession, error } = await supabase
      .from("collaboration_sessions")
      .insert({
        class_id: student.class_id,
        created_by: teacherId,
        session_name: `Session with ${student.name}`,
        description: "Teacher-student collaboration session",
        language: "javascript",
        is_active: true,
        max_participants: 2,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Add both teacher and student as participants
    await supabase.from("session_participants").insert([
      {
        session_id: collaborationSession.id,
        user_id: teacherId,
        role: "host",
      },
      {
        session_id: collaborationSession.id,
        user_id: studentId,
        role: "participant",
      },
    ]);

    return NextResponse.json({
      sessionId: collaborationSession.id,
      message: "Session started successfully",
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Get active sessions for a teacher
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role from session or database
    let userRole = (session.user as any).role;
    if (!userRole && session.user.id) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();
      userRole = userData?.role;
    }

    if (userRole !== "teacher" && userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = (session.user as any).id;

    const { data: sessions, error } = await supabase
      .from("collaboration_sessions")
      .select(`
        *,
        class:classes(id, name, code)
      `)
      .eq("created_by", teacherId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
