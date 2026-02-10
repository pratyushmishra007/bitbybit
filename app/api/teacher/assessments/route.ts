import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all assessments for teacher's classes
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, role, organization_id")
      .eq("email", session.user.email)
      .single();

    if (!user || !["teacher", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const courseId = searchParams.get("courseId");

    // Get teacher's assigned classes
    const { data: teacherClasses } = await supabase
      .from("teacher_assignments")
      .select("class_id")
      .eq("teacher_id", user.id);

    const classIds = teacherClasses?.map((tc) => tc.class_id) || [];

    // Build query
    let query = supabase
      .from("assessments")
      .select(`
        *,
        class:classes (id, name, code),
        course:courses (id, title),
        creator:users!created_by (id, name),
        questions:assessment_questions (id),
        submissions:assessment_submissions (id, status)
      `)
      .order("created_at", { ascending: false });

    // Filter by class if specified
    if (classId) {
      query = query.eq("class_id", classId);
    } else if (classIds.length > 0 && user.role === "teacher") {
      query = query.in("class_id", classIds);
    }

    // Filter by course if specified
    if (courseId) {
      query = query.eq("course_id", courseId);
    }

    const { data: assessments, error } = await query;

    if (error) {
      console.error("Error fetching assessments:", error);
      return NextResponse.json({ error: "Failed to fetch assessments" }, { status: 500 });
    }

    // Transform data
    const transformed = assessments?.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type,
      durationMinutes: a.duration_minutes,
      totalPoints: a.total_points,
      passingScore: a.passing_score,
      startTime: a.start_time,
      endTime: a.end_time,
      isTimed: a.is_timed,
      allowRetakes: a.allow_retakes,
      maxRetakes: a.max_retakes,
      shuffleQuestions: a.shuffle_questions,
      showResults: a.show_results,
      isPublished: a.is_published,
      createdAt: a.created_at,
      class: a.class,
      course: a.course,
      creator: a.creator,
      questionCount: a.questions?.length || 0,
      submissionCount: a.submissions?.length || 0,
      gradedCount: a.submissions?.filter((s: any) => s.status === "graded").length || 0,
    }));

    return NextResponse.json({ assessments: transformed });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new assessment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", session.user.email)
      .single();

    if (!user || !["teacher", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      type = "quiz",
      classId,
      courseId,
      durationMinutes,
      totalPoints = 100,
      passingScore = 60,
      startTime,
      endTime,
      isTimed = true,
      allowRetakes = false,
      maxRetakes = 1,
      shuffleQuestions = false,
      showResults = true,
    } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!classId) {
      return NextResponse.json({ error: "Class is required" }, { status: 400 });
    }

    // Verify teacher has access to this class
    if (user.role === "teacher") {
      const { data: assignment } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", user.id)
        .eq("class_id", classId)
        .single();

      if (!assignment) {
        return NextResponse.json(
          { error: "You don't have access to this class" },
          { status: 403 }
        );
      }
    }

    const { data: assessment, error } = await supabase
      .from("assessments")
      .insert({
        title,
        description,
        type,
        class_id: classId,
        course_id: courseId || null,
        created_by: user.id,
        duration_minutes: durationMinutes,
        total_points: totalPoints,
        passing_score: passingScore,
        start_time: startTime || null,
        end_time: endTime || null,
        is_timed: isTimed,
        allow_retakes: allowRetakes,
        max_retakes: maxRetakes,
        shuffle_questions: shuffleQuestions,
        show_results: showResults,
        is_published: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating assessment:", error);
      return NextResponse.json({ error: "Failed to create assessment" }, { status: 500 });
    }

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
