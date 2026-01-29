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

// POST - Mark participant as online
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: participantId } = await params;

    // Verify the participant belongs to the current user
    const { data: participant } = await supabase
      .from("session_participants")
      .select("user_id")
      .eq("id", participantId)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    if (participant.user_id !== session.user.id) {
      return NextResponse.json(
        { error: "You can only update your own online status" },
        { status: 403 }
      );
    }

    // Mark as online
    const { error: updateError } = await supabase
      .from("session_participants")
      .update({ is_online: true })
      .eq("id", participantId);

    if (updateError) {
      console.error("Error marking participant online:", updateError);
      return NextResponse.json(
        { error: "Failed to update online status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Marked as online",
    });
  } catch (error) {
    console.error("Mark online error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
