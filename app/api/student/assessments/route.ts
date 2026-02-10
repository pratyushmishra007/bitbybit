import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get student's enrolled classes
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("class_enrollments")
      .select("class_id")
      .eq("user_id", userId)
      .eq("status", "active");

    if (enrollmentError) {
      console.error("Error fetching enrollments:", enrollmentError);
      return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
    }

    const classIds = enrollments?.map((e) => e.class_id) || [];

    if (classIds.length === 0) {
      return NextResponse.json({ assessments: [] });
    }

    // Get published assessments for enrolled classes
    const { data: assessments, error: assessmentError } = await supabase
      .from("assessments")
      .select(`
        id,
        title,
        description,
        type,
        duration_minutes,
        total_points,
        passing_score,
        start_time,
        end_time,
        class_id,
        course_id,
        classes (id, name)
      `)
      .in("class_id", classIds)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    console.log("Student assessments query - classIds:", classIds);
    console.log("Student assessments query - results:", assessments?.length || 0);
    console.log("Student assessments query - error:", assessmentError);

    if (assessmentError) {
      console.error("Error fetching assessments:", assessmentError);
      return NextResponse.json({ error: "Failed to fetch assessments" }, { status: 500 });
    }

    // Get question counts
    const assessmentIds = assessments?.map((a) => a.id) || [];
    const { data: questionCounts } = await supabase
      .from("assessment_questions")
      .select("assessment_id")
      .in("assessment_id", assessmentIds);

    const questionCountMap: Record<string, number> = {};
    questionCounts?.forEach((q) => {
      questionCountMap[q.assessment_id] = (questionCountMap[q.assessment_id] || 0) + 1;
    });

    // Get student's submissions
    const { data: submissions } = await supabase
      .from("assessment_submissions")
      .select("id, assessment_id, status, score, passed")
      .eq("student_id", userId)
      .in("assessment_id", assessmentIds);

    const submissionMap: Record<string, { status: string; score: number | null; passed: boolean | null }> = {};
    submissions?.forEach((sub) => {
      // If there's a submitted one, prefer that, otherwise take the latest
      if (!submissionMap[sub.assessment_id] || sub.status === "submitted") {
        submissionMap[sub.assessment_id] = {
          status: sub.status,
          score: sub.score,
          passed: sub.passed,
        };
      }
    });

    // Format response
    const formattedAssessments = assessments?.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type,
      durationMinutes: a.duration_minutes,
      totalPoints: a.total_points,
      passingScore: a.passing_score,
      startTime: a.start_time,
      endTime: a.end_time,
      class: a.classes ? { name: (a.classes as any).name } : { name: "Unknown" },
      questionCount: questionCountMap[a.id] || 0,
      submission: submissionMap[a.id] || null,
    })) || [];

    return NextResponse.json({ assessments: formattedAssessments });
  } catch (error) {
    console.error("Error in student assessments API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
