import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get all submissions for an assessment (teacher view)
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

    // Verify teacher has access to this assessment
    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, class_id, title, total_points, passing_score")
      .eq("id", assessmentId)
      .single();

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

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

    // Get submissions with student info
    const { data: submissions, error } = await supabase
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
        grader:users!graded_by (
          id,
          name
        )
      `)
      .eq("assessment_id", assessmentId)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Error fetching submissions:", error);
      return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
    }

    // Get class enrollment count for statistics
    const { data: enrollments } = await supabase
      .from("class_enrollments")
      .select("user_id")
      .eq("class_id", assessment.class_id)
      .eq("status", "active");

    const totalStudents = enrollments?.length || 0;

    // Calculate statistics
    const completedSubmissions = submissions?.filter((s) => s.status !== "in_progress") || [];
    const gradedSubmissions = submissions?.filter((s) => s.status === "graded") || [];
    const passedStudents = gradedSubmissions.filter((s) => s.passed).length;
    const avgScore =
      gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, s) => sum + (s.percentage_score || 0), 0) /
          gradedSubmissions.length
        : 0;

    const transformed = submissions?.map((s) => ({
      id: s.id,
      student: s.student,
      attemptNumber: s.attempt_number,
      startedAt: s.started_at,
      submittedAt: s.submitted_at,
      timeTakenSeconds: s.time_taken_seconds,
      score: s.total_score,
      percentageScore: s.percentage_score,
      passed: s.passed,
      status: s.status,
      grader: s.grader,
      gradedAt: s.graded_at,
      feedback: s.feedback,
    }));

    return NextResponse.json({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        totalPoints: assessment.total_points,
        passingScore: assessment.passing_score,
      },
      statistics: {
        totalStudents,
        submissionCount: completedSubmissions.length,
        submissionRate: totalStudents > 0 ? (completedSubmissions.length / totalStudents) * 100 : 0,
        gradedCount: gradedSubmissions.length,
        pendingGrading: completedSubmissions.length - gradedSubmissions.length,
        passedCount: passedStudents,
        passRate: gradedSubmissions.length > 0 ? (passedStudents / gradedSubmissions.length) * 100 : 0,
        averageScore: Math.round(avgScore * 100) / 100,
      },
      submissions: transformed,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
