import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get assessment for student (without correct answers)
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get assessment
    const { data: assessment, error } = await supabase
      .from("assessments")
      .select(`
        *,
        class:classes (id, name, code),
        course:courses (id, title),
        questions:assessment_questions (
          id,
          question_type,
          question_text,
          options,
          points,
          order_index,
          code_template,
          time_limit_seconds
        )
      `)
      .eq("id", id)
      .single();

    if (error || !assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Check if published
    if (!assessment.is_published && user.role === "student") {
      return NextResponse.json({ error: "Assessment not available" }, { status: 403 });
    }

    // Check if student is enrolled in the class
    if (user.role === "student") {
      const { data: enrollment } = await supabase
        .from("class_enrollments")
        .select("id")
        .eq("class_id", assessment.class_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (!enrollment) {
        return NextResponse.json(
          { error: "You are not enrolled in this class" },
          { status: 403 }
        );
      }
    }

    // Check time availability
    const now = new Date();
    if (assessment.start_time && new Date(assessment.start_time) > now) {
      return NextResponse.json(
        { error: "Assessment has not started yet", startsAt: assessment.start_time },
        { status: 403 }
      );
    }

    if (assessment.end_time && new Date(assessment.end_time) < now) {
      return NextResponse.json(
        { error: "Assessment has ended", endedAt: assessment.end_time },
        { status: 403 }
      );
    }

    // Check existing submissions
    const { data: submissions } = await supabase
      .from("assessment_submissions")
      .select("id, status, attempt_number, submitted_at, percentage_score, passed")
      .eq("assessment_id", id)
      .eq("user_id", user.id)
      .order("attempt_number", { ascending: false });

    const completedAttempts = submissions?.filter((s) => s.status !== "in_progress") || [];
    const inProgressSubmission = submissions?.find((s) => s.status === "in_progress");

    // Check retake limits
    const canRetake =
      assessment.allow_retakes && completedAttempts.length < assessment.max_retakes;
    const canStart = completedAttempts.length === 0 || canRetake;

    // Sort questions by order_index and optionally shuffle
    let sortedQuestions = assessment.questions?.sort(
      (a: any, b: any) => a.order_index - b.order_index
    );

    if (assessment.shuffle_questions && user.role === "student") {
      sortedQuestions = [...sortedQuestions].sort(() => Math.random() - 0.5);
    }

    // Remove correct answers from options for students
    const sanitizedQuestions = sortedQuestions?.map((q: any) => {
      const sanitized: any = {
        id: q.id,
        type: q.question_type,
        text: q.question_text,
        points: q.points,
        orderIndex: q.order_index,
        codeTemplate: q.code_template,
        timeLimitSeconds: q.time_limit_seconds,
      };

      // For MCQ, include options but not which is correct
      if (q.options && Array.isArray(q.options)) {
        sanitized.options = q.options.map((opt: any, idx: number) => ({
          id: idx,
          text: typeof opt === "string" ? opt : opt.text,
        }));
      }

      return sanitized;
    });

    return NextResponse.json({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        type: assessment.type,
        durationMinutes: assessment.duration_minutes,
        totalPoints: assessment.total_points,
        passingScore: assessment.passing_score,
        isTimed: assessment.is_timed,
        showResults: assessment.show_results,
        questionCount: assessment.questions?.length || 0,
        class: assessment.class,
        course: assessment.course,
        questions: sanitizedQuestions,
      },
      submissions: {
        completed: completedAttempts.map((s) => ({
          id: s.id,
          attemptNumber: s.attempt_number,
          submittedAt: s.submitted_at,
          score: s.percentage_score,
          passed: s.passed,
        })),
        inProgress: inProgressSubmission
          ? { id: inProgressSubmission.id, attemptNumber: inProgressSubmission.attempt_number }
          : null,
        canStart,
        canRetake,
        remainingAttempts: assessment.allow_retakes
          ? assessment.max_retakes - completedAttempts.length
          : completedAttempts.length === 0 ? 1 : 0,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
