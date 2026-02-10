import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Export assessment as JSON
export async function GET(
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

    // Fetch assessment
    const { data: assessment, error: fetchError } = await supabase
      .from("assessments")
      .select(`
        *,
        classes (id, name),
        courses (id, title)
      `)
      .eq("id", assessmentId)
      .single();

    if (fetchError || !assessment) {
      console.error("Fetch error:", fetchError);
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Verify teacher has access (if not admin)
    if (user.role === "teacher") {
      const { data: classAccess } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("class_id", assessment.class_id)
        .eq("teacher_id", user.id)
        .single();

      // Also allow if user is the creator
      if (!classAccess && assessment.created_by !== user.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Fetch questions
    const { data: questions } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("order_index");

    // Format for export (remove internal IDs and sensitive data)
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      assessment: {
        title: assessment.title,
        description: assessment.description,
        type: assessment.type,
        durationMinutes: assessment.duration_minutes,
        passingScore: assessment.passing_score,
        isTimed: assessment.is_timed,
        shuffleQuestions: assessment.shuffle_questions,
        showResults: assessment.show_results,
        allowRetakes: assessment.allow_retakes,
        maxAttempts: assessment.max_attempts,
      },
      questions: questions?.map((q) => ({
        type: q.question_type,
        text: q.question_text,
        options: q.options,
        correctAnswer: q.correct_answer,
        points: q.points,
        orderIndex: q.order_index,
        explanation: q.explanation,
        codeTemplate: q.code_template,
        testCases: q.test_cases,
      })) || [],
      metadata: {
        questionCount: questions?.length || 0,
        totalPoints: questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0,
        originalClass: assessment.classes?.name || null,
        originalCourse: assessment.courses?.title || null,
      },
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Error exporting assessment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
