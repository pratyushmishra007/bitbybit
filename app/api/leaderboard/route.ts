import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Get leaderboard data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "global"; // global, organization, weekly
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Get current user's organization if needed
    let organizationId: string | null = null;
    if (type === "organization") {
      const { data: user } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", session.user.id)
        .single();
      organizationId = user?.organization_id;
    }

    // Build the query
    let query = supabase
      .from("users")
      .select(`
        id,
        name,
        email,
        avatar,
        organization_id,
        user_problem_stats (
          total_problems_solved,
          easy_solved,
          medium_solved,
          hard_solved,
          total_submissions,
          current_streak,
          longest_streak,
          contest_rating
        )
      `, { count: "exact" })
      .not("user_problem_stats", "is", null);

    // Apply organization filter
    if (type === "organization" && organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    // Order by problems solved (need to use raw SQL for this)
    // For now, we'll fetch all and sort client-side (not ideal for large datasets)
    const { data: users, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Leaderboard query error:", error);
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }

    // Transform and sort data
    const leaderboard = (users || [])
      .map((user, index) => {
        const stats = Array.isArray(user.user_problem_stats) 
          ? user.user_problem_stats[0] 
          : user.user_problem_stats;
        
        return {
          id: user.id,
          name: user.name || "Anonymous",
          avatar: user.avatar,
          totalSolved: stats?.total_problems_solved || 0,
          easySolved: stats?.easy_solved || 0,
          mediumSolved: stats?.medium_solved || 0,
          hardSolved: stats?.hard_solved || 0,
          submissions: stats?.total_submissions || 0,
          currentStreak: stats?.current_streak || 0,
          longestStreak: stats?.longest_streak || 0,
          contestRating: stats?.contest_rating || 1500,
          // Calculate score: hard=50, medium=25, easy=10
          score: ((stats?.hard_solved || 0) * 50) + 
                 ((stats?.medium_solved || 0) * 25) + 
                 ((stats?.easy_solved || 0) * 10),
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((user, index) => ({
        ...user,
        rank: offset + index + 1,
      }));

    // Find current user's rank
    const currentUserIndex = leaderboard.findIndex(u => u.id === session.user.id);
    const currentUserRank = currentUserIndex >= 0 ? leaderboard[currentUserIndex] : null;

    return NextResponse.json({
      leaderboard,
      currentUser: currentUserRank,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
