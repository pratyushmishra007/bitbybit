import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ isParticipant: false });
    }

    const { id: contestId } = await params;

    // Get user
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user?.email)
      .single();

    if (!user) {
      return NextResponse.json({ isParticipant: false });
    }

    // Check if user is participant
    const { data: participant } = await supabase
      .from("contest_participants")
      .select("*")
      .eq("contest_id", contestId)
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({ 
      isParticipant: !!participant,
      participant: participant || null
    });
  } catch (error: any) {
    console.error("Error checking participation:", error);
    return NextResponse.json({ isParticipant: false });
  }
}
