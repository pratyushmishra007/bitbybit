import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NotificationHelpers } from "@/lib/notifications";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get submission details with answers
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { id: assessmentId, submissionId } = await params;
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

    // Get submission with student and answers
    const { data: submission, error } = await supabase
      .from("assessment_submissions")
      .select(`
        *,
        student:users!user_id (
          id,
          name,
          email,
          student_id,
          avatar_url
        ),
        answers:assessment_answers (
          id,
          question_id,
          answer_text,
          answer_code,
          is_correct,
          points_awarded,
          auto_graded,
          manual_feedback
        )
      `)
      .eq("id", submissionId)
      .eq("assessment_id", assessmentId)
      .single();

    if (error || !submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Get assessment with questions
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

    // Verify access
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

    // Map answers to questions
    const answerMap = new Map<string, any>();
    submission.answers?.forEach((a: any) => {
      answerMap.set(a.question_id, a);
    });

    const questionsWithAnswers = assessment.questions
      ?.sort((a: any, b: any) => a.order_index - b.order_index)
      .map((q: any) => {
        const answer = answerMap.get(q.id);
        return {
          id: q.id,
          type: q.question_type,
          text: q.question_text,
          options: q.options,
          correctAnswer: q.correct_answer,
          points: q.points,
          explanation: q.explanation,
          codeTemplate: q.code_template,
          testCases: q.test_cases,
          studentAnswer: answer
            ? {
                id: answer.id,
                text: answer.answer_text,
                code: answer.answer_code,
                isCorrect: answer.is_correct,
                pointsAwarded: answer.points_awarded,
                autoGraded: answer.auto_graded,
                feedback: answer.manual_feedback,
              }
            : null,
        };
      });

    return NextResponse.json({
      submission: {
        id: submission.id,
        student: submission.student,
        attemptNumber: submission.attempt_number,
        startedAt: submission.started_at,
        submittedAt: submission.submitted_at,
        timeTakenSeconds: submission.time_taken_seconds,
        totalScore: submission.total_score,
        percentageScore: submission.percentage_score,
        passed: submission.passed,
        status: submission.status,
        feedback: submission.feedback,
      },
      assessment: {
        id: assessment.id,
        title: assessment.title,
        totalPoints: assessment.total_points,
        passingScore: assessment.passing_score,
      },
      questions: questionsWithAnswers,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Grade/update submission
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { id: assessmentId, submissionId } = await params;
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
    const { answerGrades, answers, feedback } = body;

    // Support both answerGrades and answers formats from frontend
    const gradesToApply = answerGrades || answers;

    // Get submission
    const { data: submission } = await supabase
      .from("assessment_submissions")
      .select("*")
      .eq("id", submissionId)
      .eq("assessment_id", assessmentId)
      .single();

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Get assessment
    const { data: assessment } = await supabase
      .from("assessments")
      .select("*, questions:assessment_questions (*)")
      .eq("id", assessmentId)
      .single();

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Verify access
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

    // Update individual answer grades
    if (gradesToApply && Array.isArray(gradesToApply)) {
      for (const grade of gradesToApply) {
        if (!grade.questionId && !grade.answerId) continue;

        // Check if answer record exists
        let existingAnswer = null;
        if (grade.answerId) {
          const { data } = await supabase
            .from("assessment_answers")
            .select("id")
            .eq("id", grade.answerId)
            .eq("submission_id", submissionId)
            .single();
          existingAnswer = data;
        } else if (grade.questionId) {
          const { data } = await supabase
            .from("assessment_answers")
            .select("id")
            .eq("question_id", grade.questionId)
            .eq("submission_id", submissionId)
            .single();
          existingAnswer = data;
        }

        if (existingAnswer) {
          // Update existing answer
          const updateData: any = {};
          if (grade.pointsAwarded !== undefined) updateData.points_awarded = grade.pointsAwarded;
          if (grade.isCorrect !== undefined) updateData.is_correct = grade.isCorrect;
          if (grade.feedback !== undefined) updateData.manual_feedback = grade.feedback;

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from("assessment_answers")
              .update(updateData)
              .eq("id", existingAnswer.id);
            
            if (updateError) {
              console.error("Error updating answer:", updateError);
            }
          }
        } else if (grade.questionId) {
          // Create new answer record for unanswered question
          const { error: insertError } = await supabase
            .from("assessment_answers")
            .insert({
              submission_id: submissionId,
              question_id: grade.questionId,
              answer_text: null,
              is_correct: grade.pointsAwarded > 0,
              points_awarded: grade.pointsAwarded || 0,
              auto_graded: false,
              manual_feedback: grade.feedback || null,
            });
          
          if (insertError) {
            console.error("Error inserting answer:", insertError);
          }
        }
      }
    }

    // Recalculate total score
    const { data: allAnswers } = await supabase
      .from("assessment_answers")
      .select("points_awarded")
      .eq("submission_id", submissionId);

    const totalScore = allAnswers?.reduce((sum, a) => sum + (a.points_awarded || 0), 0) || 0;
    const totalPossible = assessment.questions?.reduce((sum: number, q: any) => sum + (q.points || 0), 0) || 0;
    const percentageScore = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
    const passed = percentageScore >= (assessment.passing_score || 60);

    // Update submission
    const { data: updatedSubmission, error } = await supabase
      .from("assessment_submissions")
      .update({
        total_score: totalScore,
        percentage_score: Math.round(percentageScore * 100) / 100,
        passed,
        status: "graded",
        graded_by: user.id,
        graded_at: new Date().toISOString(),
        feedback: feedback !== undefined ? feedback : submission.feedback,
      })
      .eq("id", submissionId)
      .select()
      .single();

    if (error) {
      console.error("Error updating submission:", error);
      return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
    }

    // Notify student that their assessment was graded
    try {
      await NotificationHelpers.assessmentGraded(
        submission.user_id,
        assessment.title,
        updatedSubmission.percentage_score,
        updatedSubmission.passed
      );
    } catch (notifError) {
      console.error("Failed to send assessment graded notification:", notifError);
    }

    return NextResponse.json({
      submission: {
        id: updatedSubmission.id,
        totalScore: updatedSubmission.total_score,
        percentageScore: updatedSubmission.percentage_score,
        passed: updatedSubmission.passed,
        status: updatedSubmission.status,
        feedback: updatedSubmission.feedback,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
