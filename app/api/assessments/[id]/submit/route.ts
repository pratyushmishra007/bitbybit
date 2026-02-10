import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Answer {
  questionId: string;
  answer: string | number | string[];
  code?: string;
}

// Auto-grade a single answer
function gradeAnswer(
  question: any,
  answer: Answer
): { isCorrect: boolean; pointsAwarded: number; autoGraded: boolean } {
  const questionType = question.question_type;
  const correctAnswer = question.correct_answer;
  const options = question.options;
  const points = question.points || 10;

  // For coding questions, we need manual review or test case execution
  if (questionType === "coding") {
    return { isCorrect: false, pointsAwarded: 0, autoGraded: false };
  }

  // For short answer, we need manual review
  if (questionType === "short_answer") {
    return { isCorrect: false, pointsAwarded: 0, autoGraded: false };
  }

  // For true/false
  if (questionType === "true_false") {
    const isCorrect =
      String(answer.answer).toLowerCase() === String(correctAnswer).toLowerCase();
    return { isCorrect, pointsAwarded: isCorrect ? points : 0, autoGraded: true };
  }

  // For multiple choice
  if (questionType === "multiple_choice") {
    // Check if options have is_correct flag
    if (options && Array.isArray(options)) {
      // Find the correct option
      const correctIndex = options.findIndex(
        (opt: any) => opt.is_correct === true
      );

      // Answer could be the index or the text
      let isCorrect = false;

      if (typeof answer.answer === "number") {
        isCorrect = answer.answer === correctIndex;
      } else if (typeof answer.answer === "string") {
        // Compare text
        const correctOption = options[correctIndex];
        const correctText =
          typeof correctOption === "string" ? correctOption : correctOption?.text;
        isCorrect =
          String(answer.answer).toLowerCase().trim() ===
          String(correctText).toLowerCase().trim();
      }

      return { isCorrect, pointsAwarded: isCorrect ? points : 0, autoGraded: true };
    }

    // Fallback to correctAnswer field
    const isCorrect =
      String(answer.answer).toLowerCase().trim() ===
      String(correctAnswer).toLowerCase().trim();
    return { isCorrect, pointsAwarded: isCorrect ? points : 0, autoGraded: true };
  }

  // For fill_blank
  if (questionType === "fill_blank") {
    // Allow for multiple correct answers separated by |
    const correctAnswers = String(correctAnswer)
      .split("|")
      .map((a) => a.toLowerCase().trim());
    const isCorrect = correctAnswers.includes(
      String(answer.answer).toLowerCase().trim()
    );
    return { isCorrect, pointsAwarded: isCorrect ? points : 0, autoGraded: true };
  }

  // Default: manual grading needed
  return { isCorrect: false, pointsAwarded: 0, autoGraded: false };
}

// POST - Submit assessment answers
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
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { submissionId, answers } = body as {
      submissionId: string;
      answers: Answer[];
    };

    if (!submissionId) {
      return NextResponse.json({ error: "Submission ID is required" }, { status: 400 });
    }

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Answers array is required" }, { status: 400 });
    }

    // Verify submission exists and belongs to user
    const { data: submission } = await supabase
      .from("assessment_submissions")
      .select("*")
      .eq("id", submissionId)
      .eq("user_id", user.id)
      .single();

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.status !== "in_progress") {
      return NextResponse.json(
        { error: "This submission has already been completed" },
        { status: 400 }
      );
    }

    // Get assessment and questions
    const { data: assessment } = await supabase
      .from("assessments")
      .select(`
        *,
        questions:assessment_questions (*)
      `)
      .eq("id", assessmentId)
      .single();

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Check if timed and expired
    if (assessment.is_timed && assessment.duration_minutes) {
      const startTime = new Date(submission.started_at);
      const endTime = new Date(startTime.getTime() + assessment.duration_minutes * 60 * 1000);
      const now = new Date();

      // Allow 1 minute grace period
      if (now > new Date(endTime.getTime() + 60000)) {
        // Mark as late
        await supabase
          .from("assessment_submissions")
          .update({
            status: "late",
            submitted_at: now.toISOString(),
            time_taken_seconds: Math.floor((now.getTime() - startTime.getTime()) / 1000),
          })
          .eq("id", submissionId);

        return NextResponse.json(
          { error: "Time limit exceeded. Submission marked as late." },
          { status: 400 }
        );
      }
    }

    // Create question lookup map
    const questionMap = new Map<string, any>();
    assessment.questions?.forEach((q: any) => {
      questionMap.set(q.id, q);
    });

    // Grade answers and save
    let totalScore = 0;
    let totalPossible = 0;
    let allAutoGraded = true;

    const answerRecords = [];

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      totalPossible += question.points || 10;

      const gradeResult = gradeAnswer(question, answer);
      totalScore += gradeResult.pointsAwarded;

      if (!gradeResult.autoGraded) {
        allAutoGraded = false;
      }

      answerRecords.push({
        submission_id: submissionId,
        question_id: answer.questionId,
        answer_text: typeof answer.answer === "string" ? answer.answer : JSON.stringify(answer.answer),
        answer_code: answer.code || null,
        is_correct: gradeResult.isCorrect,
        points_awarded: gradeResult.pointsAwarded,
        auto_graded: gradeResult.autoGraded,
      });
    }

    // Save all answers
    if (answerRecords.length > 0) {
      const { error: answersError } = await supabase
        .from("assessment_answers")
        .insert(answerRecords);

      if (answersError) {
        console.error("Error saving answers:", answersError);
        return NextResponse.json({ error: "Failed to save answers" }, { status: 500 });
      }
    }

    // Calculate final score
    const percentageScore = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
    const passed = percentageScore >= (assessment.passing_score || 60);

    const submittedAt = new Date();
    const timeTaken = Math.floor(
      (submittedAt.getTime() - new Date(submission.started_at).getTime()) / 1000
    );

    // Update submission
    const { data: updatedSubmission, error: updateError } = await supabase
      .from("assessment_submissions")
      .update({
        submitted_at: submittedAt.toISOString(),
        time_taken_seconds: timeTaken,
        total_score: totalScore,
        percentage_score: Math.round(percentageScore * 100) / 100,
        passed,
        status: allAutoGraded ? "graded" : "submitted",
        graded_at: allAutoGraded ? submittedAt.toISOString() : null,
      })
      .eq("id", submissionId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating submission:", updateError);
      return NextResponse.json({ error: "Failed to complete submission" }, { status: 500 });
    }

    // Award XP if passed
    if (passed) {
      const xpEarned = Math.round(assessment.total_points * (percentageScore / 100) * 0.5);

      // Try to update XP - ignore errors if RPC doesn't exist
      try {
        const { data: currentUser } = await supabase
          .from("users")
          .select("xp, total_xp")
          .eq("id", user.id)
          .single();

        if (currentUser) {
          await supabase
            .from("users")
            .update({
              xp: (currentUser.xp || 0) + xpEarned,
              total_xp: (currentUser.total_xp || 0) + xpEarned,
            })
            .eq("id", user.id);
        }
      } catch {
        // XP update is optional, ignore errors
      }
    }

    // Update daily_activity for analytics
    try {
      const today = new Date().toISOString().split("T")[0];
      const xpForActivity = passed ? Math.round(assessment.total_points * (percentageScore / 100) * 0.5) : 0;
      const minutesSpent = Math.ceil(timeTaken / 60);

      // Check if record exists for today
      const { data: existingActivity } = await supabase
        .from("daily_activity")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      if (existingActivity) {
        await supabase
          .from("daily_activity")
          .update({
            assessments_completed: (existingActivity.assessments_completed || 0) + 1,
            xp_earned: (existingActivity.xp_earned || 0) + xpForActivity,
            time_spent_minutes: (existingActivity.time_spent_minutes || 0) + minutesSpent,
          })
          .eq("user_id", user.id)
          .eq("date", today);
      } else {
        await supabase.from("daily_activity").insert({
          user_id: user.id,
          date: today,
          lessons_completed: 0,
          assessments_completed: 1,
          xp_earned: xpForActivity,
          time_spent_minutes: minutesSpent,
        });
      }
    } catch {
      // Daily activity tracking is optional
    }

    // Prepare response
    const response: any = {
      submission: {
        id: updatedSubmission.id,
        status: updatedSubmission.status,
        submittedAt: updatedSubmission.submitted_at,
        timeTakenSeconds: updatedSubmission.time_taken_seconds,
        score: totalScore,
        totalPoints: totalPossible,
        percentageScore: Math.round(percentageScore * 100) / 100,
        passed,
      },
    };

    // Include results if show_results is true
    if (assessment.show_results) {
      response.results = {
        score: totalScore,
        totalPossible,
        percentage: Math.round(percentageScore * 100) / 100,
        passed,
        passingScore: assessment.passing_score,
        needsManualGrading: !allAutoGraded,
        answers: answerRecords.map((a) => ({
          questionId: a.question_id,
          isCorrect: a.is_correct,
          pointsAwarded: a.points_awarded,
          autoGraded: a.auto_graded,
        })),
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
