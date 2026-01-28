import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: contestId } = await params;

    // Get user ID
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user?.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if contest exists and is active/upcoming
    const { data: contest } = await supabase
      .from("contests")
      .select("*, contest_participants(count)")
      .eq("id", contestId)
      .single();

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    if (contest.status === "ended") {
      return NextResponse.json({ error: "Contest has ended" }, { status: 400 });
    }

    // Check if max participants reached
    const participantCount = contest.contest_participants?.[0]?.count || 0;
    if (contest.max_participants && participantCount >= contest.max_participants) {
      return NextResponse.json({ error: "Contest is full" }, { status: 400 });
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from("contest_participants")
      .select("id")
      .eq("contest_id", contestId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Already joined this contest" }, { status: 400 });
    }

    // Join contest
    const { data: participant, error } = await supabase
      .from("contest_participants")
      .insert({
        contest_id: contestId,
        user_id: user.id,
        total_score: 0,
        problems_solved: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, participant });
  } catch (error: any) {
    console.error("Error joining contest:", error);
    return NextResponse.json(
      { error: error.message || "Failed to join contest" },
      { status: 500 }
    );
  }
}
