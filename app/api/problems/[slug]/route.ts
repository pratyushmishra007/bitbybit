import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Get single problem by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    console.log("Fetching problem by slug:", slug, "for user:", session.user.id);

    // Fetch problem
    const { data: problem, error } = await supabase
      .from("problems")
      .select(`
        id,
        title,
        slug,
        description,
        examples,
        constraints,
        hints,
        starter_code,
        difficulty,
        acceptance_rate,
        submission_count,
        is_premium,
        time_limit_ms,
        memory_limit_mb
      `)
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    console.log("Problem query result:", { problem: problem?.id, error: error?.message });

    if (error || !problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    // Check premium access (for now, allow all authenticated users or admins)
    if (problem.is_premium) {
      const { data: user } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      // Allow admins and org_admins to access premium content
      const adminRoles = ["admin", "org_admin", "platform_admin"];
      if (!adminRoles.includes(user?.role || "")) {
        return NextResponse.json({ error: "Premium content" }, { status: 403 });
      }
    }

    // Fetch topics
    const { data: topicTags } = await supabase
      .from("problem_topic_tags")
      .select(`topic:topics(id, name, slug)`)
      .eq("problem_id", problem.id);

    // Fetch companies
    const { data: companyTags } = await supabase
      .from("problem_company_tags")
      .select(`company:companies(id, name, slug), frequency`)
      .eq("problem_id", problem.id);

    // Get user's status for this problem
    const { data: userSolved } = await supabase
      .from("user_solved_problems")
      .select("status, best_runtime_ms, best_memory_kb, solve_count, attempt_count")
      .eq("user_id", session.user.id)
      .eq("problem_id", problem.id)
      .single();

    // Get user's recent submissions
    const { data: recentSubmissions } = await supabase
      .from("problem_submissions")
      .select("id, language, status, runtime_ms, memory_kb, submitted_at")
      .eq("user_id", session.user.id)
      .eq("problem_id", problem.id)
      .order("submitted_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      problem: {
        ...problem,
        topics: topicTags?.map((t) => t.topic) || [],
        companies: companyTags?.map((c) => ({ ...c.company, frequency: c.frequency })) || [],
        userStatus: userSolved || null,
        recentSubmissions: recentSubmissions || [],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching problem:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
