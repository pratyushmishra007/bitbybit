import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get single assessment with questions
export async function GET(
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
      .select("id, role")
      .eq("email", session.user.email)
      .single();

    if (!user || !["teacher", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: assessment, error } = await supabase
      .from("assessments")
      .select(`
        *,
        class:classes (id, name, code),
        course:courses (id, title),
        creator:users!created_by (id, name),
        questions:assessment_questions (
          id,
          question_type,
          question_text,
          options,
          correct_answer,
          points,
          order_index,
          explanation,
          code_template,
          test_cases,
          time_limit_seconds
        )
      `)
      .eq("id", id)
      .single();

    if (error || !assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Verify teacher has access
    if (user.role === "teacher") {
      const { data: assignment } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", user.id)
        .eq("class_id", assessment.class_id)
        .single();

      if (!assignment) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Sort questions by order_index
    const sortedQuestions = assessment.questions?.sort(
      (a: any, b: any) => a.order_index - b.order_index
    );

    return NextResponse.json({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        type: assessment.type,
        durationMinutes: assessment.duration_minutes,
        totalPoints: assessment.total_points,
        passingScore: assessment.passing_score,
        startTime: assessment.start_time,
        endTime: assessment.end_time,
        isTimed: assessment.is_timed,
        allowRetakes: assessment.allow_retakes,
        maxRetakes: assessment.max_retakes,
        shuffleQuestions: assessment.shuffle_questions,
        showResults: assessment.show_results,
        isPublished: assessment.is_published,
        createdAt: assessment.created_at,
        class: assessment.class,
        course: assessment.course,
        creator: assessment.creator,
        questions: sortedQuestions?.map((q: any) => ({
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
        })),
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update assessment
export async function PUT(
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
      .select("id, role")
      .eq("email", session.user.email)
      .single();

    if (!user || !["teacher", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check assessment exists and user has access
    const { data: existing } = await supabase
      .from("assessments")
      .select("id, class_id, created_by")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Verify access
    if (user.role === "teacher" && existing.created_by !== user.id) {
      const { data: assignment } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", user.id)
        .eq("class_id", existing.class_id)
        .single();

      if (!assignment) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const body = await req.json();
    const updateData: any = { updated_at: new Date().toISOString() };

    // Map fields
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.durationMinutes !== undefined) updateData.duration_minutes = body.durationMinutes;
    if (body.totalPoints !== undefined) updateData.total_points = body.totalPoints;
    if (body.passingScore !== undefined) updateData.passing_score = body.passingScore;
    if (body.startTime !== undefined) updateData.start_time = body.startTime;
    if (body.endTime !== undefined) updateData.end_time = body.endTime;
    if (body.isTimed !== undefined) updateData.is_timed = body.isTimed;
    if (body.allowRetakes !== undefined) updateData.allow_retakes = body.allowRetakes;
    if (body.maxRetakes !== undefined) updateData.max_retakes = body.maxRetakes;
    if (body.shuffleQuestions !== undefined) updateData.shuffle_questions = body.shuffleQuestions;
    if (body.showResults !== undefined) updateData.show_results = body.showResults;
    if (body.isPublished !== undefined) updateData.is_published = body.isPublished;

    const { data: assessment, error } = await supabase
      .from("assessments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating assessment:", error);
      return NextResponse.json({ error: "Failed to update assessment" }, { status: 500 });
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete assessment
export async function DELETE(
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
      .select("id, role")
      .eq("email", session.user.email)
      .single();

    if (!user || !["teacher", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check assessment exists and user has access
    const { data: existing } = await supabase
      .from("assessments")
      .select("id, class_id, created_by")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Verify access - only creator or admin can delete
    if (user.role === "teacher" && existing.created_by !== user.id) {
      return NextResponse.json(
        { error: "Only the creator can delete this assessment" },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("assessments").delete().eq("id", id);

    if (error) {
      console.error("Error deleting assessment:", error);
      return NextResponse.json({ error: "Failed to delete assessment" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
