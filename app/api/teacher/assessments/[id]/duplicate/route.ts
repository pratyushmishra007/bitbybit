import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Duplicate an assessment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const { data: user } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", session.user.email)
      .single();

    if (!user || !["teacher", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch original assessment
    const { data: original, error: fetchError } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessmentId)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Verify teacher has access to the class (if not admin)
    if (user.role === "teacher") {
      const { data: classAccess } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("class_id", original.class_id)
        .eq("teacher_id", user.id)
        .single();

      if (!classAccess && original.created_by !== user.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Create duplicate assessment
    const { data: newAssessment, error: createError } = await supabase
      .from("assessments")
      .insert({
        title: `${original.title} (Copy)`,
        description: original.description,
        type: original.type,
        class_id: original.class_id,
        course_id: original.course_id,
        created_by: user.id,
        duration_minutes: original.duration_minutes,
        total_points: original.total_points,
        passing_score: original.passing_score,
        is_timed: original.is_timed,
        shuffle_questions: original.shuffle_questions,
        show_results: original.show_results,
        allow_retakes: original.allow_retakes,
        max_attempts: original.max_attempts,
        is_published: false, // Always start as draft
        available_from: null, // Clear availability
        available_until: null,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating duplicate:", createError);
      return NextResponse.json({ error: "Failed to duplicate" }, { status: 500 });
    }

    // Copy questions
    const { data: questions } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("order_index");

    if (questions && questions.length > 0) {
      const newQuestions = questions.map((q) => ({
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
      }));

      await supabase.from("assessment_questions").insert(newQuestions);
    }

    return NextResponse.json({
      success: true,
      assessment: {
        id: newAssessment.id,
        title: newAssessment.title,
      },
    });
  } catch (error) {
    console.error("Error duplicating assessment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
