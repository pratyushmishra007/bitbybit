import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Clone/duplicate a course
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, role, organization_id")
      .eq("email", session.user.email)
      .single();

    if (!user || !["teacher", "admin", "org_admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { newTitle, includeAssessments = false } = body;

    // Fetch the original course
    const { data: originalCourse, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .single();

    if (courseError || !originalCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Fetch lessons
    const { data: originalLessons } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", id)
      .order("order_index", { ascending: true });

    // Create new course
    const { data: newCourse, error: createError } = await supabase
      .from("courses")
      .insert({
        title: newTitle || `${originalCourse.title} (Copy)`,
        description: originalCourse.description,
        difficulty: originalCourse.difficulty,
        category: originalCourse.category,
        language: originalCourse.language,
        thumbnail_url: originalCourse.thumbnail_url,
        is_published: false, // Start as draft
        is_public: false,
        organization_id: user.organization_id || originalCourse.organization_id,
        created_by: user.id,
        estimated_hours: originalCourse.estimated_hours,
        learning_objectives: originalCourse.learning_objectives,
        prerequisites: originalCourse.prerequisites,
        tags: originalCourse.tags,
      })
      .select()
      .single();

    if (createError || !newCourse) {
      console.error("Error creating course:", createError);
      return NextResponse.json(
        { error: "Failed to clone course" },
        { status: 500 }
      );
    }

    // Clone lessons
    if (originalLessons && originalLessons.length > 0) {
      const newLessons = originalLessons.map((lesson) => ({
        course_id: newCourse.id,
        title: lesson.title,
        description: lesson.description,
        content: lesson.content,
        order_index: lesson.order_index,
        xp_reward: lesson.xp_reward,
        duration_minutes: lesson.duration_minutes,
        language: lesson.language,
        starter_code: lesson.starter_code,
        solution_code: lesson.solution_code,
        expected_output: lesson.expected_output,
        test_cases: lesson.test_cases,
        hints: lesson.hints,
        hints_enabled: lesson.hints_enabled,
        resources: lesson.resources,
      }));

      const { error: lessonsError } = await supabase
        .from("lessons")
        .insert(newLessons);

      if (lessonsError) {
        console.error("Error cloning lessons:", lessonsError);
        // Don't fail the whole operation, just log
      }
    }

    // Optionally clone assessments
    if (includeAssessments) {
      const { data: originalAssessments } = await supabase
        .from("assessments")
        .select("*, questions:assessment_questions(*)")
        .eq("course_id", id);

      if (originalAssessments && originalAssessments.length > 0) {
        for (const assessment of originalAssessments) {
          const { data: newAssessment, error: assessmentError } = await supabase
            .from("assessments")
            .insert({
              course_id: newCourse.id,
              title: assessment.title,
              description: assessment.description,
              type: assessment.type,
              duration_minutes: assessment.duration_minutes,
              total_points: assessment.total_points,
              passing_score: assessment.passing_score,
              is_timed: assessment.is_timed,
              allow_retakes: assessment.allow_retakes,
              max_retakes: assessment.max_retakes,
              shuffle_questions: assessment.shuffle_questions,
              show_results: assessment.show_results,
              is_published: false,
              created_by: user.id,
            })
            .select()
            .single();

          if (!assessmentError && newAssessment && assessment.questions) {
            const newQuestions = assessment.questions.map((q: any) => ({
              assessment_id: newAssessment.id,
              question_type: q.question_type,
              question_text: q.question_text,
              options: q.options,
              correct_answer: q.correct_answer,
              points: q.points,
              order_index: q.order_index,
              explanation: q.explanation,
              code_template: q.code_template,
              test_cases: q.test_cases,
              time_limit_seconds: q.time_limit_seconds,
            }));

            await supabase.from("assessment_questions").insert(newQuestions);
          }
        }
      }
    }

    // Count cloned items
    const { count: lessonCount } = await supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("course_id", newCourse.id);

    return NextResponse.json({
      success: true,
      course: newCourse,
      clonedLessons: lessonCount || 0,
      message: `Course cloned successfully with ${lessonCount || 0} lessons`,
    });
  } catch (error) {
    console.error("Error cloning course:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
