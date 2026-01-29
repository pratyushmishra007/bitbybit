import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Approve or reject join request
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId } = await params;
    const body = await request.json();
    const { action, grantEditAccess } = body; // action: 'approve' or 'reject'

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Get join request
    const { data: joinRequest } = await supabase
      .from("session_join_requests")
      .select("*, session:session_id(created_by)")
      .eq("id", requestId)
      .single();

    if (!joinRequest) {
      return NextResponse.json(
        { error: "Join request not found" },
        { status: 404 }
      );
    }

    // Verify user is host
    if (joinRequest.session.created_by !== session.user.id) {
      const { data: user } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (user?.role !== "admin") {
        return NextResponse.json(
          { error: "Only session host can respond to requests" },
          { status: 403 }
        );
      }
    }

    if (joinRequest.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been processed" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Add user as participant with read-only access by default
      const { error: participantError } = await supabase
        .from("session_participants")
        .insert({
          session_id: joinRequest.session_id,
          user_id: joinRequest.user_id,
          role: "participant",
          is_online: true,
          can_edit: grantEditAccess === true, // Default false (read-only)
        });

      if (participantError) {
        console.error("Error adding participant:", participantError);
        return NextResponse.json(
          { error: "Failed to add participant" },
          { status: 500 }
        );
      }
    }

    // Update request status
    const { error: updateError } = await supabase
      .from("session_join_requests")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        responded_at: new Date().toISOString(),
        responded_by: session.user.id,
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("Error updating join request:", updateError);
      return NextResponse.json(
        { error: "Failed to update request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Join request ${action}d successfully`,
      action,
    });
  } catch (error) {
    console.error("Respond to join request error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// PATCH - Approve all pending requests
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const body = await request.json();
    const { grantEditAccess } = body;

    // Verify user is host
    const { data: collabSession } = await supabase
      .from("collaboration_sessions")
      .select("created_by")
      .eq("id", sessionId)
      .single();

    if (!collabSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (collabSession.created_by !== session.user.id) {
      const { data: user } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (user?.role !== "admin") {
        return NextResponse.json(
          { error: "Only session host can approve requests" },
          { status: 403 }
        );
      }
    }

    // Get all pending requests
    const { data: pendingRequests } = await supabase
      .from("session_join_requests")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "pending");

    if (!pendingRequests || pendingRequests.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending requests to approve",
        count: 0,
      });
    }

    // Add all as participants
    const participants = pendingRequests.map((req) => ({
      session_id: sessionId,
      user_id: req.user_id,
      role: "participant",
      is_online: false,
      can_edit: grantEditAccess === true,
    }));

    const { error: participantError } = await supabase
      .from("session_participants")
      .insert(participants);

    if (participantError) {
      console.error("Error adding participants:", participantError);
      return NextResponse.json(
        { error: "Failed to add participants" },
        { status: 500 }
      );
    }

    // Update all requests to approved
    const { error: updateError } = await supabase
      .from("session_join_requests")
      .update({
        status: "approved",
        responded_at: new Date().toISOString(),
        responded_by: session.user.id,
      })
      .eq("session_id", sessionId)
      .eq("status", "pending");

    if (updateError) {
      console.error("Error updating requests:", updateError);
    }

    return NextResponse.json({
      success: true,
      message: `Approved ${pendingRequests.length} join requests`,
      count: pendingRequests.length,
    });
  } catch (error) {
    console.error("Approve all requests error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
