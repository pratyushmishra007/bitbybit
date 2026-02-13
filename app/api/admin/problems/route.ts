import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Check if user has admin access
async function checkAdminAccess(userId: string) {
  const { data: user, error } = await supabase
    .from("users")
    .select("role, organization_id")
    .eq("id", userId)
    .single();

  if (error || !user) return null;

  // Allow admin and org_admin roles
  const adminRoles = ["admin", "org_admin", "platform_admin"];
  if (!adminRoles.includes(user.role)) return null;

  return user;
}

// GET: List problems with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await checkAdminAccess(session.user.id);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get("difficulty");
    const topicIds = searchParams.get("topicIds");
    const companyIds = searchParams.get("companyIds");
    const search = searchParams.get("search");
    const includeInactive = searchParams.get("includeInactive") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("problems")
      .select(`
        *,
        created_by_user:users!created_by(id, name, email)
      `, { count: "exact" });

    // Filtering
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    if (difficulty) {
      query = query.eq("difficulty", difficulty);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    // If filtering by topic (supports multiple)
    if (topicIds) {
      const topicIdArray = topicIds.split(',').filter(Boolean);
      const { data: problemIds } = await supabase
        .from("problem_topic_tags")
        .select("problem_id")
        .in("topic_id", topicIdArray);

      if (problemIds && problemIds.length > 0) {
        query = query.in("id", problemIds.map((p) => p.problem_id));
      } else {
        return NextResponse.json({ problems: [], total: 0 });
      }
    }

    // If filtering by company (supports multiple)
    if (companyIds) {
      const companyIdArray = companyIds.split(',').filter(Boolean);
      const { data: problemIds } = await supabase
        .from("problem_company_tags")
        .select("problem_id")
        .in("company_id", companyIdArray);

      if (problemIds && problemIds.length > 0) {
        query = query.in("id", problemIds.map((p) => p.problem_id));
      } else {
        return NextResponse.json({ problems: [], total: 0 });
      }
    }

    // Pagination and ordering
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: problems, error, count } = await query;

    if (error) throw error;

    // Fetch topic and company tags for each problem
    const problemsWithTags = await Promise.all(
      (problems || []).map(async (problem) => {
        const [topicsResult, companiesResult] = await Promise.all([
          supabase
            .from("problem_topic_tags")
            .select("topic:topics(*)")
            .eq("problem_id", problem.id),
          supabase
            .from("problem_company_tags")
            .select("company:companies(*)")
            .eq("problem_id", problem.id),
        ]);

        return {
          ...problem,
          topics: topicsResult.data?.map((t) => t.topic) || [],
          companies: companiesResult.data?.map((c) => c.company) || [],
        };
      })
    );

    return NextResponse.json({
      problems: problemsWithTags,
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

// POST: Create a new problem
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await checkAdminAccess(session.user.id);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      slug,
      description,
      examples,
      constraints,
      hints,
      starter_code,
      solution_code,
      solution_explanation,
      test_cases,
      difficulty,
      is_premium,
      source,
      source_url,
      time_limit_ms,
      memory_limit_mb,
      topic_ids,
      company_ids,
    } = body;

    if (!title || !slug || !description || !difficulty || !test_cases) {
      return NextResponse.json(
        { error: "Missing required fields: title, slug, description, difficulty, test_cases" },
        { status: 400 }
      );
    }

    console.log("Creating problem:", { title, slug, difficulty, testCasesCount: test_cases?.length });

    // Create the problem
    const { data: problem, error } = await supabase
      .from("problems")
      .insert({
        title,
        slug: slug.toLowerCase().replace(/\s+/g, "-"),
        description,
        examples: examples || [],
        constraints,
        hints: hints || [],
        starter_code: starter_code || {},
        solution_code: solution_code || {},
        solution_explanation,
        test_cases,
        difficulty,
        is_premium: is_premium || false,
        is_active: true, // Explicitly set to active
        source: source || "original",
        source_url,
        time_limit_ms: time_limit_ms || 2000,
        memory_limit_mb: memory_limit_mb || 256,
        created_by: session.user.id,
      })
      .select()
      .single();

    console.log("Create result:", { problemId: problem?.id, error: error?.message });

    if (error) throw error;

    // Add topic tags
    if (topic_ids && topic_ids.length > 0) {
      await supabase.from("problem_topic_tags").insert(
        topic_ids.map((topicId: string) => ({
          problem_id: problem.id,
          topic_id: topicId,
        }))
      );
    }

    // Add company tags
    if (company_ids && company_ids.length > 0) {
      await supabase.from("problem_company_tags").insert(
        company_ids.map((companyId: string) => ({
          problem_id: problem.id,
          company_id: companyId,
        }))
      );
    }

    return NextResponse.json({ problem }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating problem:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT: Update a problem
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await checkAdminAccess(session.user.id);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Problem ID required" }, { status: 400 });
    }

    const body = await request.json();
    console.log("Updating problem:", id, "with data:", JSON.stringify(body).slice(0, 500));
    console.log("Topic IDs received:", body.topic_ids);
    console.log("Company IDs received:", body.company_ids);
    
    const {
      title,
      slug,
      description,
      examples,
      constraints,
      hints,
      starter_code,
      solution_code,
      solution_explanation,
      test_cases,
      difficulty,
      is_premium,
      is_active,
      source,
      source_url,
      time_limit_ms,
      memory_limit_mb,
      topic_ids,
      company_ids,
    } = body;

    // Build update object
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug.toLowerCase().replace(/\s+/g, "-");
    if (description !== undefined) updates.description = description;
    if (examples !== undefined) updates.examples = examples;
    if (constraints !== undefined) updates.constraints = constraints;
    if (hints !== undefined) updates.hints = hints;
    if (starter_code !== undefined) updates.starter_code = starter_code;
    if (solution_code !== undefined) updates.solution_code = solution_code;
    if (solution_explanation !== undefined) updates.solution_explanation = solution_explanation;
    if (test_cases !== undefined) updates.test_cases = test_cases;
    if (difficulty !== undefined) updates.difficulty = difficulty;
    if (is_premium !== undefined) updates.is_premium = is_premium;
    if (is_active !== undefined) updates.is_active = is_active;
    if (source !== undefined) updates.source = source;
    if (source_url !== undefined) updates.source_url = source_url;
    if (time_limit_ms !== undefined) updates.time_limit_ms = time_limit_ms;
    if (memory_limit_mb !== undefined) updates.memory_limit_mb = memory_limit_mb;

    console.log("Update fields:", Object.keys(updates));

    const { data: problem, error } = await supabase
      .from("problems")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    console.log("Update result:", { problemId: problem?.id, error: error?.message });

    if (error) throw error;

    // Update topic tags if provided
    console.log("Checking topic_ids:", topic_ids, "Type:", typeof topic_ids, "Is undefined:", topic_ids === undefined);
    if (topic_ids !== undefined) {
      console.log("Deleting old topic tags...");
      const deleteResult = await supabase.from("problem_topic_tags").delete().eq("problem_id", id);
      console.log("Delete result:", deleteResult);
      if (topic_ids.length > 0) {
        console.log("Inserting new topic tags:", topic_ids);
        const insertResult = await supabase.from("problem_topic_tags").insert(
          topic_ids.map((topicId: string) => ({
            problem_id: id,
            topic_id: topicId,
          }))
        );
        console.log("Insert result:", insertResult);
      }
    }

    // Update company tags if provided
    console.log("Checking company_ids:", company_ids, "Type:", typeof company_ids, "Is undefined:", company_ids === undefined);
    if (company_ids !== undefined) {
      console.log("Deleting old company tags...");
      await supabase.from("problem_company_tags").delete().eq("problem_id", id);
      if (company_ids.length > 0) {
        console.log("Inserting new company tags:", company_ids);
        const insertResult = await supabase.from("problem_company_tags").insert(
          company_ids.map((companyId: string) => ({
            problem_id: id,
            company_id: companyId,
          }))
        );
        console.log("Company insert result:", insertResult);
      }
    }

    return NextResponse.json({ problem });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error updating problem:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Delete a problem
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await checkAdminAccess(session.user.id);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Problem ID required" }, { status: 400 });
    }

    // Delete related tags first (cascade should handle this, but just in case)
    await Promise.all([
      supabase.from("problem_topic_tags").delete().eq("problem_id", id),
      supabase.from("problem_company_tags").delete().eq("problem_id", id),
    ]);

    const { error } = await supabase.from("problems").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error deleting problem:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
