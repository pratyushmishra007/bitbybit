import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: contests, error } = await supabase
      .from("contests")
      .select("*")
      .order("start_time", { ascending: false });

    if (error) throw error;

    // Determine status based on dates
    const now = new Date();
    const contestsWithStatus = (contests || []).map((contest) => {
      const startDate = new Date(contest.start_time);
      const endDate = new Date(contest.end_time);
      
      let status: "upcoming" | "active" | "ended";
      if (now < startDate) {
        status = "upcoming";
      } else if (now >= startDate && now <= endDate) {
        status = "active";
      } else {
        status = "ended";
      }

      return { ...contest, status };
    });

    return NextResponse.json({
      success: true,
      contests: contestsWithStatus,
    });
  } catch (error) {
    console.error("Error fetching contests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch contests" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and check if admin/teacher
    const { data: user } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", session.user.email)
      .single();

    if (!user || !["admin", "teacher"].includes(user.role)) {
      return NextResponse.json(
        { error: "Only admins and teachers can create contests" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      difficulty,
      start_time,
      end_time,
      max_participants,
      problems,
    } = body;

    // Create contest
    const { data: contest, error: contestError } = await supabase
      .from("contests")
      .insert({
        title,
        description,
        difficulty,
        start_time,
        end_time,
        max_participants,
        created_by: user.id,
        total_points: problems.reduce((sum: number, p: any) => sum + p.points, 0),
      })
      .select()
      .single();

    if (contestError) throw contestError;

    // Create problems
    if (problems && problems.length > 0) {
      const problemsToInsert = problems.map((p: any) => ({
        contest_id: contest.id,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        points: p.points,
        language: p.language,
        starter_code: p.starter_code,
        solution_code: p.solution_code || "",
        test_cases: p.test_cases,
        order_index: p.order_index,
      }));

      const { error: problemsError } = await supabase
        .from("contest_problems")
        .insert(problemsToInsert);

      if (problemsError) throw problemsError;
    }

    return NextResponse.json({ success: true, contest });
  } catch (error: any) {
    console.error("Error creating contest:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create contest" },
      { status: 500 }
    );
  }
}
