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

// PATCH - Toggle participant edit permissions or online status
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: participantId } = await params;
    const body = await request.json();
    const { canEdit, isOnline } = body;

    // Validate at least one field is provided
    if (typeof canEdit !== "boolean" && typeof isOnline !== "boolean") {
      return NextResponse.json(
        { error: "canEdit or isOnline must be provided" },
        { status: 400 }
      );
    }

    // Get participant details
    const { data: participant } = await supabase
      .from("session_participants")
      .select("*, session:session_id(created_by)")
      .eq("id", participantId)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updates: { can_edit?: boolean; is_online?: boolean } = {};
    
    // For canEdit, verify user is host or admin
    if (typeof canEdit === "boolean") {
      if (participant.session.created_by !== session.user.id) {
        const { data: user } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (user?.role !== "admin") {
          return NextResponse.json(
            { error: "Only session host can change permissions" },
            { status: 403 }
          );
        }
      }
      updates.can_edit = canEdit;
    }

    // For isOnline, verify it's the participant themselves
    if (typeof isOnline === "boolean") {
      if (participant.user_id !== session.user.id) {
        return NextResponse.json(
          { error: "You can only update your own online status" },
          { status: 403 }
        );
      }
      updates.is_online = isOnline;
    }

    // Update participant
    const { error: updateError } = await supabase
      .from("session_participants")
      .update(updates)
      .eq("id", participantId);

    if (updateError) {
      console.error("Error updating participant:", updateError);
      return NextResponse.json(
        { error: "Failed to update participant" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Participant updated successfully",
      updates,
    });
  } catch (error) {
    console.error("Update participant error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// DELETE - Remove participant from session
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: participantId } = await params;

    // Get participant details
    const { data: participant } = await supabase
      .from("session_participants")
      .select("*, session:session_id(created_by)")
      .eq("id", participantId)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Verify user is host or the participant themselves
    const isHost = participant.session.created_by === session.user.id;
    const isSelf = participant.user_id === session.user.id;

    if (!isHost && !isSelf) {
      const { data: user } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (user?.role !== "admin") {
        return NextResponse.json(
          { error: "Not authorized to remove this participant" },
          { status: 403 }
        );
      }
    }

    // Remove participant
    const { error: deleteError } = await supabase
      .from("session_participants")
      .delete()
      .eq("id", participantId);

    if (deleteError) {
      console.error("Error removing participant:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove participant" },
        { status: 500 }
      );
    }

    // Check if any participants remain
    const { data: remainingParticipants, count } = await supabase
      .from("session_participants")
      .select("id", { count: "exact" })
      .eq("session_id", participant.session_id);

    // If no participants remain, mark session as inactive
    if (count === 0) {
      await supabase
        .from("collaboration_sessions")
        .update({ is_active: false })
        .eq("id", participant.session_id);
    }

    return NextResponse.json({
      success: true,
      message: "Participant removed from session",
      sessionEnded: count === 0,
    });
  } catch (error) {
    console.error("Remove participant error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
