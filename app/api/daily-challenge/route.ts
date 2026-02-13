import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Get today's daily challenge
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Get today's challenge
    const { data: challenge, error } = await supabase
      .from("daily_challenges")
      .select(`
        id,
        challenge_date,
        bonus_xp,
        problem:problems(
          id,
          title,
          slug,
          description,
          difficulty,
          acceptance_rate,
          submission_count
        )
      `)
      .eq("challenge_date", today)
      .eq("is_active", true)
      .single();

    if (error || !challenge) {
      // No challenge for today - try to get the most recent one
      const { data: recentChallenge } = await supabase
        .from("daily_challenges")
        .select(`
          id,
          challenge_date,
          bonus_xp,
          problem:problems(
            id,
            title,
            slug,
            description,
            difficulty,
            acceptance_rate,
            submission_count
          )
        `)
        .eq("is_active", true)
        .order("challenge_date", { ascending: false })
        .limit(1)
        .single();

      if (recentChallenge) {
        // Check if user completed this challenge
        const { data: completion } = await supabase
          .from("daily_challenge_completions")
          .select("id, completed_at, xp_earned")
          .eq("user_id", session.user.id)
          .eq("challenge_id", recentChallenge.id)
          .single();

        return NextResponse.json({
          challenge: {
            ...recentChallenge,
            isToday: false,
            userCompletion: completion || null,
          },
        });
      }

      return NextResponse.json({ challenge: null, message: "No daily challenge available" });
    }

    // Check if user completed today's challenge
    const { data: completion } = await supabase
      .from("daily_challenge_completions")
      .select("id, completed_at, xp_earned")
      .eq("user_id", session.user.id)
      .eq("challenge_id", challenge.id)
      .single();

    // Get user's streak
    const { data: stats } = await supabase
      .from("user_problem_stats")
      .select("current_streak, longest_streak")
      .eq("user_id", session.user.id)
      .single();

    return NextResponse.json({
      challenge: {
        ...challenge,
        isToday: true,
        userCompletion: completion || null,
      },
      streak: stats || { current_streak: 0, longest_streak: 0 },
    });
  } catch (error) {
    console.error("Daily challenge API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Complete a daily challenge (called after successful submission)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { challengeId, submissionId } = body;

    if (!challengeId) {
      return NextResponse.json({ error: "Challenge ID required" }, { status: 400 });
    }

    // Get the challenge
    const { data: challenge, error: challengeError } = await supabase
      .from("daily_challenges")
      .select("id, bonus_xp")
      .eq("id", challengeId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Check if already completed
    const { data: existing } = await supabase
      .from("daily_challenge_completions")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("challenge_id", challengeId)
      .single();

    if (existing) {
      return NextResponse.json({ message: "Already completed", completion: existing });
    }

    // Record completion
    const { data: completion, error: completionError } = await supabase
      .from("daily_challenge_completions")
      .insert({
        user_id: session.user.id,
        challenge_id: challengeId,
        submission_id: submissionId,
        xp_earned: challenge.bonus_xp,
      })
      .select()
      .single();

    if (completionError) {
      throw completionError;
    }

    // Award bonus XP
    await supabase.rpc("increment_user_xp", {
      user_id: session.user.id,
      xp_amount: challenge.bonus_xp,
    });

    // Update streak
    await updateStreak(session.user.id);

    return NextResponse.json({
      message: "Daily challenge completed!",
      completion,
      xpEarned: challenge.bonus_xp,
    });
  } catch (error) {
    console.error("Daily challenge completion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function updateStreak(userId: string) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Get current stats
    const { data: stats } = await supabase
      .from("user_problem_stats")
      .select("current_streak, longest_streak, last_submission_date")
      .eq("user_id", userId)
      .single();

    if (!stats) {
      // Create stats record
      await supabase
        .from("user_problem_stats")
        .insert({
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          last_submission_date: today,
        });
      return;
    }

    let newStreak = 1;
    if (stats.last_submission_date === yesterday) {
      // Continue streak
      newStreak = (stats.current_streak || 0) + 1;
    } else if (stats.last_submission_date === today) {
      // Already submitted today
      newStreak = stats.current_streak || 1;
    }

    await supabase
      .from("user_problem_stats")
      .update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, stats.longest_streak || 0),
        last_submission_date: today,
      })
      .eq("user_id", userId);
  } catch (error) {
    console.error("Error updating streak:", error);
  }
}
