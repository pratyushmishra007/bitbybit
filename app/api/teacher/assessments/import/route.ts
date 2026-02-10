import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Import assessment from JSON
export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json();
    const { classId, importData } = body;

    if (!classId) {
      return NextResponse.json({ error: "Class ID is required" }, { status: 400 });
    }

    if (!importData || !importData.assessment) {
      return NextResponse.json({ error: "Invalid import data" }, { status: 400 });
    }

    // Verify teacher has access to the target class (if not admin)
    if (user.role === "teacher") {
      const { data: classAccess } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("class_id", classId)
        .eq("teacher_id", user.id)
        .single();

      if (!classAccess) {
        return NextResponse.json({ error: "Access denied to this class" }, { status: 403 });
      }
    }

    const { assessment: assessmentData, questions: questionsData } = importData;

    // Validate required fields
    if (!assessmentData.title) {
      return NextResponse.json({ error: "Assessment title is required" }, { status: 400 });
    }

    // Calculate total points from questions
    const totalPoints = questionsData?.reduce((sum: number, q: any) => sum + (q.points || 10), 0) || 0;

    // Create assessment
    const { data: newAssessment, error: createError } = await supabase
      .from("assessments")
      .insert({
        title: `${assessmentData.title} (Imported)`,
        description: assessmentData.description || "",
        type: assessmentData.type || "quiz",
        class_id: classId,
        course_id: null, // Can be assigned later
        created_by: user.id,
        duration_minutes: assessmentData.durationMinutes || null,
        total_points: totalPoints,
        passing_score: assessmentData.passingScore || 70,
        is_timed: assessmentData.isTimed ?? false,
        shuffle_questions: assessmentData.shuffleQuestions ?? false,
        show_results: assessmentData.showResults ?? true,
        allow_retakes: assessmentData.allowRetakes ?? false,
        max_retakes: assessmentData.maxAttempts || 1,
        is_published: false, // Always start as draft
        start_time: null,
        end_time: null,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating assessment:", createError);
      return NextResponse.json({ error: "Failed to create assessment" }, { status: 500 });
    }

    // Import questions
    let importedQuestions = 0;
    if (questionsData && Array.isArray(questionsData) && questionsData.length > 0) {
      const newQuestions = questionsData.map((q: any, index: number) => ({
        assessment_id: newAssessment.id,
        question_type: q.type || "multiple_choice",
        question_text: q.text || q.questionText || "",
        options: q.options || null,
        correct_answer: q.correctAnswer || null,
        points: q.points || 10,
        order_index: q.orderIndex ?? index,
        explanation: q.explanation || null,
        code_template: q.codeTemplate || null,
        test_cases: q.testCases || null,
      }));

      const { error: questionsError } = await supabase
        .from("assessment_questions")
        .insert(newQuestions);

      if (questionsError) {
        console.error("Error importing questions:", questionsError);
      } else {
        importedQuestions = newQuestions.length;
      }
    }

    return NextResponse.json({
      success: true,
      assessment: {
        id: newAssessment.id,
        title: newAssessment.title,
      },
      importedQuestions,
    });
  } catch (error) {
    console.error("Error importing assessment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
