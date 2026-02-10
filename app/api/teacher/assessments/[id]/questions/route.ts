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
    // Check if creator or assigned to the class
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

// GET - List all questions for an assessment
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

    const { data: questions, error } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error fetching questions:", error);
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }

    const transformed = questions?.map((q) => ({
      id: q.id,
      type: q.question_type,
      text: q.question_text,
      options: q.options,
      correctAnswer: q.correct_answer,
      points: q.points,
      orderIndex: q.order_index,
      explanation: q.explanation,
      codeTemplate: q.code_template,
      testCases: q.test_cases,
      timeLimitSeconds: q.time_limit_seconds,
    }));

    return NextResponse.json({ questions: transformed });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Add question to assessment
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

    const body = await req.json();
    const {
      type = "multiple_choice",
      text,
      options,
      correctAnswer,
      points = 10,
      orderIndex,
      explanation,
      codeTemplate,
      testCases,
      timeLimitSeconds,
    } = body;

    if (!text) {
      return NextResponse.json({ error: "Question text is required" }, { status: 400 });
    }

    // Get max order_index if not provided
    let newOrderIndex = orderIndex;
    if (newOrderIndex === undefined) {
      const { data: maxOrder } = await supabase
        .from("assessment_questions")
        .select("order_index")
        .eq("assessment_id", assessmentId)
        .order("order_index", { ascending: false })
        .limit(1)
        .single();

      newOrderIndex = (maxOrder?.order_index || 0) + 1;
    }

    // Validate options for MCQ
    if (type === "multiple_choice" && (!options || !Array.isArray(options) || options.length < 2)) {
      return NextResponse.json(
        { error: "Multiple choice questions require at least 2 options" },
        { status: 400 }
      );
    }

    const { data: question, error } = await supabase
      .from("assessment_questions")
      .insert({
        assessment_id: assessmentId,
        question_type: type,
        question_text: text,
        options: options || null,
        correct_answer: correctAnswer || null,
        points,
        order_index: newOrderIndex,
        explanation: explanation || null,
        code_template: codeTemplate || null,
        test_cases: testCases || null,
        time_limit_seconds: timeLimitSeconds || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating question:", error);
      return NextResponse.json({ error: "Failed to create question" }, { status: 500 });
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
    }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Bulk update question order
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
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

    const body = await req.json();
    const { questionOrder } = body; // Array of { id, orderIndex }

    if (!questionOrder || !Array.isArray(questionOrder)) {
      return NextResponse.json({ error: "questionOrder array is required" }, { status: 400 });
    }

    // Update each question's order
    for (const item of questionOrder) {
      await supabase
        .from("assessment_questions")
        .update({ order_index: item.orderIndex })
        .eq("id", item.id)
        .eq("assessment_id", assessmentId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
