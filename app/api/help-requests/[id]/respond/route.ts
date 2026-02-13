import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NotificationHelpers } from "@/lib/notifications";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Teacher accepts help request and creates collaboration session
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId } = await params;

    // Get teacher's role
    const { data: teacher } = await supabase
      .from("users")
      .select("role, name")
      .eq("id", session.user.id)
      .single();

    if (!teacher || (teacher.role !== "teacher" && teacher.role !== "admin")) {
      return NextResponse.json(
        { error: "Only teachers can respond to help requests" },
        { status: 403 }
      );
    }

    // Get the help request
    const { data: helpRequest, error: fetchError } = await supabase
      .from("help_requests")
      .select(`
        *,
        student:student_id(id, name, email)
      `)
      .eq("id", requestId)
      .single();

    if (fetchError || !helpRequest) {
      return NextResponse.json(
        { error: "Help request not found" },
        { status: 404 }
      );
    }

    if (helpRequest.status !== "pending") {
      return NextResponse.json(
        { error: "This help request has already been handled" },
        { status: 400 }
      );
    }

    // Create collaboration session
    const sessionName = `Help: ${helpRequest.lesson?.title || "Lesson"} - ${helpRequest.student?.name || "Student"}`;
    const sessionDescription = helpRequest.message
      ? `Student question: ${helpRequest.message}`
      : `Teacher helping student with ${helpRequest.lesson?.title || "lesson"}`;

    const { data: collabSession, error: sessionError } = await supabase
      .from("collaboration_sessions")
      .insert({
        created_by: session.user.id,
        session_name: sessionName,
        description: sessionDescription,
        language: helpRequest.language || "javascript",
        is_active: true,
        max_participants: 2, // Only teacher and student
      })
      .select()
      .single();

    if (sessionError || !collabSession) {
      console.error("Error creating collaboration session:", sessionError);
      return NextResponse.json(
        { error: "Failed to create collaboration session" },
        { status: 500 }
      );
    }

    // Add teacher as host participant with edit access
    await supabase.from("session_participants").insert({
      session_id: collabSession.id,
      user_id: session.user.id,
      role: "host",
      is_online: true,
      can_edit: true, // Teacher always has write access
    });

    // Add student as participant with edit access (they raised the hand)
    await supabase.from("session_participants").insert({
      session_id: collabSession.id,
      user_id: helpRequest.student_id,
      role: "participant",
      is_online: false, // They'll join when notified
      can_edit: true, // Original student has write access
    });

    // Create initial code snapshot if student provided code
    if (helpRequest.code_snapshot) {
      await supabase.from("code_snapshots").insert({
        session_id: collabSession.id,
        user_id: helpRequest.student_id,
        code_content: helpRequest.code_snapshot,
        language: helpRequest.language,
        snapshot_type: "checkpoint",
        description: "Student's code when raising hand",
      });
    }

    // Update help request status
    const { error: updateError } = await supabase
      .from("help_requests")
      .update({
        status: "accepted",
        teacher_id: session.user.id,
        collaboration_session_id: collabSession.id,
        responded_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("Error updating help request:", updateError);
      // Session is created, so we continue even if update fails
    }

    console.log("✅ Help request accepted, collaboration session created:", collabSession.id);

    // Notify the student that help is on the way
    try {
      await NotificationHelpers.helpRequestAccepted(
        helpRequest.student_id,
        teacher.name || "A teacher",
        `/collaborate/${collabSession.id}`
      );
    } catch (notifError) {
      console.error("Failed to send help accepted notification:", notifError);
    }

    return NextResponse.json({
      success: true,
      message: "Help request accepted",
      collaborationSession: collabSession,
      helpRequest: {
        ...helpRequest,
        status: "accepted",
        teacher_id: session.user.id,
        collaboration_session_id: collabSession.id,
      },
    });
  } catch (error) {
    console.error("Respond to help request error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// PATCH - Update help request status (mark as completed, etc.)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["pending", "accepted", "in_session", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("help_requests")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      console.error("Error updating help request status:", error);
      return NextResponse.json(
        { error: "Failed to update status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Status updated successfully",
    });
  } catch (error) {
    console.error("Update help request error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
