import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get total problem counts by difficulty
    const { data: problemCounts } = await supabase
      .from("problems")
      .select("difficulty")
      .eq("is_active", true);

    const totalByDifficulty = {
      easy: problemCounts?.filter(p => p.difficulty === "easy").length || 0,
      medium: problemCounts?.filter(p => p.difficulty === "medium").length || 0,
      hard: problemCounts?.filter(p => p.difficulty === "hard").length || 0,
    };

    const totalProblems = (totalByDifficulty.easy + totalByDifficulty.medium + totalByDifficulty.hard);

    // Get user's solved problems
    const { data: solvedProblems } = await supabase
      .from("user_solved_problems")
      .select(`
        problem_id,
        status,
        problem:problems(difficulty)
      `)
      .eq("user_id", userId)
      .eq("status", "solved");

    const solvedByDifficulty = {
      easy: solvedProblems?.filter((s: any) => s.problem?.difficulty === "easy").length || 0,
      medium: solvedProblems?.filter((s: any) => s.problem?.difficulty === "medium").length || 0,
      hard: solvedProblems?.filter((s: any) => s.problem?.difficulty === "hard").length || 0,
    };

    const totalSolved = solvedByDifficulty.easy + solvedByDifficulty.medium + solvedByDifficulty.hard;

    return NextResponse.json({
      total: totalProblems,
      solved: totalSolved,
      easy: {
        total: totalByDifficulty.easy,
        solved: solvedByDifficulty.easy,
      },
      medium: {
        total: totalByDifficulty.medium,
        solved: solvedByDifficulty.medium,
      },
      hard: {
        total: totalByDifficulty.hard,
        solved: solvedByDifficulty.hard,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching problem stats:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
