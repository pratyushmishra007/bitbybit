import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to verify teacher access
async function verifyAccess(userId: string, assessmentId: string, role: string) {
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, class_id, created_by")
    .eq("id", assessmentId)
    .single();

  if (!assessment) return { allowed: false, error: "Assessment not found" };

  if (role === "admin") return { allowed: true, assessment };

  if (role === "teacher") {
    if (assessment.created_by === userId) return { allowed: true, assessment };

    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_id", userId)
      .eq("class_id", assessment.class_id)
      .single();

    if (assignment) return { allowed: true, assessment };
  }

  return { allowed: false, error: "Access denied" };
}

// GET - Get single question
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const { id: assessmentId, questionId } = await params;
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

    const access = await verifyAccess(user.id, assessmentId, user.role);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { data: question, error } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("id", questionId)
      .eq("assessment_id", assessmentId)
      .single();

    if (error || !question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json({
      question: {
        id: question.id,
        type: question.question_type,
        text: question.question_text,
        options: question.options,
        correctAnswer: question.correct_answer,
        points: question.points,
        orderIndex: question.order_index,
        explanation: question.explanation,
        codeTemplate: question.code_template,
        testCases: question.test_cases,
        timeLimitSeconds: question.time_limit_seconds,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update question
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const { id: assessmentId, questionId } = await params;
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

    const access = await verifyAccess(user.id, assessmentId, user.role);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // Verify question exists
    const { data: existing } = await supabase
      .from("assessment_questions")
      .select("id")
      .eq("id", questionId)
      .eq("assessment_id", assessmentId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.type !== undefined) updateData.question_type = body.type;
    if (body.text !== undefined) updateData.question_text = body.text;
    if (body.options !== undefined) updateData.options = body.options;
    if (body.correctAnswer !== undefined) updateData.correct_answer = body.correctAnswer;
    if (body.points !== undefined) updateData.points = body.points;
    if (body.orderIndex !== undefined) updateData.order_index = body.orderIndex;
    if (body.explanation !== undefined) updateData.explanation = body.explanation;
    if (body.codeTemplate !== undefined) updateData.code_template = body.codeTemplate;
    if (body.testCases !== undefined) updateData.test_cases = body.testCases;
    if (body.timeLimitSeconds !== undefined) updateData.time_limit_seconds = body.timeLimitSeconds;

    const { data: question, error } = await supabase
      .from("assessment_questions")
      .update(updateData)
      .eq("id", questionId)
      .select()
      .single();

    if (error) {
      console.error("Error updating question:", error);
      return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
    }

    // Update assessment total points
    const { data: allQuestions } = await supabase
      .from("assessment_questions")
      .select("points")
      .eq("assessment_id", assessmentId);

    const totalPoints = allQuestions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0;

    await supabase
      .from("assessments")
      .update({ total_points: totalPoints, updated_at: new Date().toISOString() })
      .eq("id", assessmentId);

    return NextResponse.json({
      question: {
        id: question.id,
        type: question.question_type,
        text: question.question_text,
        options: question.options,
        correctAnswer: question.correct_answer,
        points: question.points,
        orderIndex: question.order_index,
        explanation: question.explanation,
        codeTemplate: question.code_template,
        testCases: question.test_cases,
        timeLimitSeconds: question.time_limit_seconds,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete question
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const { id: assessmentId, questionId } = await params;
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

    const access = await verifyAccess(user.id, assessmentId, user.role);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { error } = await supabase
      .from("assessment_questions")
      .delete()
      .eq("id", questionId)
      .eq("assessment_id", assessmentId);

    if (error) {
      console.error("Error deleting question:", error);
      return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
    }

    // Update assessment total points
    const { data: allQuestions } = await supabase
      .from("assessment_questions")
      .select("points")
      .eq("assessment_id", assessmentId);

    const totalPoints = allQuestions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0;

    await supabase
      .from("assessments")
      .update({ total_points: totalPoints, updated_at: new Date().toISOString() })
      .eq("id", assessmentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
