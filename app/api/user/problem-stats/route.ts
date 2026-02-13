import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DifficultyStats {
  total: number;
  solved: number;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's organization (for filtering problems)
    const { data: user } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", userId)
      .single();

    // Get all problems count by difficulty
    let problemsQuery = supabase
      .from("problems")
      .select("id, difficulty, is_active")
      .eq("is_active", true);

    if (user?.organization_id) {
      problemsQuery = problemsQuery.or(`organization_id.is.null,organization_id.eq.${user.organization_id}`);
    }

    const { data: allProblems } = await problemsQuery;

    // Get user's solved problems (use user_solved_problems table from migration)
    const { data: solvedProblems } = await supabase
      .from("user_solved_problems")
      .select("problem_id, status, problems!inner(difficulty)")
      .eq("user_id", userId)
      .eq("status", "solved");

    // Calculate stats
    const totalByDifficulty: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    const solvedByDifficulty: Record<string, number> = { easy: 0, medium: 0, hard: 0 };

    allProblems?.forEach((problem) => {
      if (problem.difficulty && totalByDifficulty[problem.difficulty] !== undefined) {
        totalByDifficulty[problem.difficulty]++;
      }
    });

    solvedProblems?.forEach((status: any) => {
      const difficulty = status.problems?.difficulty;
      if (difficulty && solvedByDifficulty[difficulty] !== undefined) {
        solvedByDifficulty[difficulty]++;
      }
    });

    // Get recent submissions (use problem_submissions table from migration)
    const { data: recentSubmissions } = await supabase
      .from("problem_submissions")
      .select(`
        id,
        language,
        status,
        runtime_ms,
        memory_kb,
        submitted_at,
        problems!inner(id, title, slug, difficulty)
      `)
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(10);

    // Get streak data (submissions by day for last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailySubmissions } = await supabase
      .from("problem_submissions")
      .select("submitted_at")
      .eq("user_id", userId)
      .gte("submitted_at", thirtyDaysAgo.toISOString());

    // Group by day
    const submissionsByDay: Record<string, number> = {};
    dailySubmissions?.forEach((sub) => {
      const day = sub.submitted_at.split("T")[0];
      submissionsByDay[day] = (submissionsByDay[day] || 0) + 1;
    });

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];
      
      if (submissionsByDay[dateStr]) {
        currentStreak++;
      } else if (i > 0) {
        // Allow today to not have submissions
        break;
      }
    }

    // Get total XP
    const { data: userXP } = await supabase
      .from("users")
      .select("xp, level")
      .eq("id", userId)
      .single();

    // Get leaderboard rank (by XP)
    const { count: rankAbove } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gt("xp", userXP?.xp || 0);

    const rank = (rankAbove || 0) + 1;

    // Get topics mastery (using user_solved_problems and problem_topic_tags)
    const { data: topicStats } = await supabase
      .from("user_solved_problems")
      .select(`
        problem_id,
        status,
        problems!inner(
          id,
          problem_topic_tags!inner(
            topics!inner(id, name, slug)
          )
        )
      `)
      .eq("user_id", userId)
      .eq("status", "solved");

    // Count solved per topic
    const topicSolvedCount: Record<string, { name: string; count: number }> = {};
    topicStats?.forEach((stat: any) => {
      stat.problems?.problem_topics?.forEach((pt: any) => {
        const topic = pt.topics;
        if (topic) {
          if (!topicSolvedCount[topic.id]) {
            topicSolvedCount[topic.id] = { name: topic.name, count: 0 };
          }
          topicSolvedCount[topic.id].count++;
        }
      });
    });

    const topicsArray = Object.entries(topicSolvedCount)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      stats: {
        total: allProblems?.length || 0,
        solved: solvedProblems?.length || 0,
        byDifficulty: {
          easy: { total: totalByDifficulty.easy, solved: solvedByDifficulty.easy },
          medium: { total: totalByDifficulty.medium, solved: solvedByDifficulty.medium },
          hard: { total: totalByDifficulty.hard, solved: solvedByDifficulty.hard },
        },
        xp: userXP?.xp || 0,
        level: userXP?.level || 1,
        rank,
        currentStreak,
        submissionsByDay,
        topTopics: topicsArray,
      },
      recentSubmissions: recentSubmissions?.map((sub: any) => ({
        id: sub.id,
        problem: {
          id: sub.problems.id,
          title: sub.problems.title,
          slug: sub.problems.slug,
          difficulty: sub.problems.difficulty,
        },
        language: sub.language,
        status: sub.status,
        runtime_ms: sub.runtime_ms,
        memory_kb: sub.memory_kb,
        submitted_at: sub.submitted_at,
      })) || [],
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
