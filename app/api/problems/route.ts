import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List problems (public, with optional filtering)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get("difficulty");
    const topicSlug = searchParams.get("topic");
    const companySlug = searchParams.get("company");
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // "solved", "attempted", "todo"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Base query
    let query = supabase
      .from("problems")
      .select(`
        id,
        title,
        slug,
        difficulty,
        acceptance_rate,
        submission_count,
        is_premium
      `, { count: "exact" })
      .eq("is_active", true);

    // Filter by difficulty
    if (difficulty && ["easy", "medium", "hard"].includes(difficulty)) {
      query = query.eq("difficulty", difficulty);
    }

    // Search by title
    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    // Filter by topic
    if (topicSlug) {
      const { data: topic } = await supabase
        .from("topics")
        .select("id")
        .eq("slug", topicSlug)
        .single();

      if (topic) {
        const { data: problemIds } = await supabase
          .from("problem_topic_tags")
          .select("problem_id")
          .eq("topic_id", topic.id);

        if (problemIds && problemIds.length > 0) {
          query = query.in("id", problemIds.map((p) => p.problem_id));
        } else {
          return NextResponse.json({ problems: [], total: 0, page, limit });
        }
      }
    }

    // Filter by company
    if (companySlug) {
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", companySlug)
        .single();

      if (company) {
        const { data: problemIds } = await supabase
          .from("problem_company_tags")
          .select("problem_id")
          .eq("company_id", company.id);

        if (problemIds && problemIds.length > 0) {
          query = query.in("id", problemIds.map((p) => p.problem_id));
        } else {
          return NextResponse.json({ problems: [], total: 0, page, limit });
        }
      }
    }

    // Pagination
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: problems, error, count } = await query;
    if (error) throw error;

    // Get user's solved status for these problems
    const { data: userSolved } = await supabase
      .from("user_solved_problems")
      .select("problem_id, status")
      .eq("user_id", session.user.id);

    const solvedMap = new Map(userSolved?.map((s) => [s.problem_id, s.status]) || []);

    // Fetch topics for each problem
    const problemIds = problems?.map((p) => p.id) || [];
    const { data: topicTags } = await supabase
      .from("problem_topic_tags")
      .select(`
        problem_id,
        topic:topics(id, name, slug)
      `)
      .in("problem_id", problemIds);

    const topicMap = new Map<string, Array<{ id: string; name: string; slug: string }>>();
    topicTags?.forEach((tag: any) => {
      if (!topicMap.has(tag.problem_id)) {
        topicMap.set(tag.problem_id, []);
      }
      if (tag.topic) {
        topicMap.get(tag.problem_id)!.push({
          id: tag.topic.id,
          name: tag.topic.name,
          slug: tag.topic.slug,
        });
      }
    });

    // Enrich problems with user status and topics
    let enrichedProblems = problems?.map((problem) => ({
      ...problem,
      userStatus: solvedMap.get(problem.id) || null,
      topics: topicMap.get(problem.id) || [],
    })) || [];

    // Filter by user status if requested
    if (status) {
      if (status === "solved") {
        enrichedProblems = enrichedProblems.filter((p) => p.userStatus === "solved");
      } else if (status === "attempted") {
        enrichedProblems = enrichedProblems.filter((p) => p.userStatus === "attempted");
      } else if (status === "todo") {
        enrichedProblems = enrichedProblems.filter((p) => !p.userStatus);
      }
    }

    return NextResponse.json({
      problems: enrichedProblems,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching problems:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
