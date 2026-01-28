import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contestId } = await params;

    const { data, error } = await supabase
      .from("contest_participants")
      .select(`
        *,
        user:users(id, name, email, level, xp)
      `)
      .eq("contest_id", contestId)
      .order("total_score", { ascending: false })
      .order("joined_at", { ascending: true });

    if (error) throw error;

    // Add ranks
    const leaderboard = data.map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }));

    return NextResponse.json(leaderboard);
  } catch (error: any) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
