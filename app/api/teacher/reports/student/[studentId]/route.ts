import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { generateStudentReportHTML, StudentReportData } from "@/lib/pdf-generator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentId } = params;
    const format = req.nextUrl.searchParams.get("format") || "html";

    // Verify teacher access
    const { data: teacher } = await supabase
      .from("users")
      .select("id, role, organization_id")
      .eq("email", session.user.email)
      .single();

    if (!teacher || !["teacher", "org_admin", "admin"].includes(teacher.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get student data
    const { data: student, error: studentError } = await supabase
      .from("users")
      .select(`
        id, name, email, student_id, xp, level, lessons_completed, last_login,
        organization:organizations(id, name)
      `)
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get class enrollment
    const { data: enrollment } = await supabase
      .from("class_enrollments")
      .select(`class:classes(id, name, code)`)
      .eq("user_id", studentId)
      .eq("status", "active")
      .single();

    const studentClass = Array.isArray(enrollment?.class) 
      ? enrollment.class[0] 
      : enrollment?.class;

    // Get course enrollments with progress
    const { data: courseEnrollments } = await supabase
      .from("course_enrollments")
      .select(`
        progress_percentage,
        completed_lessons,
        course:courses(id, name, lessons_count)
      `)
      .eq("user_id", studentId);

    // Get assessment submissions
    const { data: assessmentSubmissions } = await supabase
      .from("assessment_submissions")
      .select(`
        score,
        max_score,
        submitted_at,
        assessment:assessments(id, title, type)
      `)
      .eq("student_id", studentId)
      .eq("status", "graded")
      .order("submitted_at", { ascending: false })
      .limit(10);

    // Get activity data
    const { data: activityData } = await supabase
      .from("daily_activity")
      .select("date, time_spent")
      .eq("user_id", studentId)
      .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .order("date", { ascending: false });

    // Calculate total time spent
    const totalMinutes = activityData?.reduce((sum, a) => sum + (a.time_spent || 0), 0) || 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // Calculate streak
    let streak = 0;
    if (activityData && activityData.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const sortedDates = activityData.map(a => a.date).sort().reverse();
      
      for (let i = 0; i < sortedDates.length; i++) {
        const expectedDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        if (sortedDates.includes(expectedDate)) {
          streak++;
        } else {
          break;
        }
      }
    }

    // Prepare report data
    const org = Array.isArray(student.organization) 
      ? student.organization[0] 
      : student.organization;

    const courses = (courseEnrollments || []).map((ce: any) => {
      const course = Array.isArray(ce.course) ? ce.course[0] : ce.course;
      return {
        name: course?.name || "Unknown Course",
        progress: ce.progress_percentage || 0,
        lessonsCompleted: ce.completed_lessons || 0,
        totalLessons: course?.lessons_count || 0,
      };
    });

    const avgProgress = courses.length > 0
      ? Math.round(courses.reduce((sum: number, c: any) => sum + c.progress, 0) / courses.length)
      : 0;

    const reportData: StudentReportData = {
      studentName: student.name || "Unknown",
      studentId: student.student_id || student.id,
      email: student.email,
      className: studentClass?.name || "Not Assigned",
      organizationName: org?.name || "Unknown Organization",
      generatedAt: new Date(),
      stats: {
        xp: student.xp || 0,
        level: student.level || 1,
        lessonsCompleted: student.lessons_completed || 0,
        averageProgress: avgProgress,
        totalTimeSpent: `${hours}h ${minutes}m`,
        streak,
      },
      courses,
      assessments: (assessmentSubmissions || []).map((sub: any) => {
        const assessment = Array.isArray(sub.assessment) ? sub.assessment[0] : sub.assessment;
        return {
          name: assessment?.title || "Unknown",
          type: assessment?.type || "quiz",
          score: sub.score || 0,
          maxScore: sub.max_score || 100,
          completedAt: new Date(sub.submitted_at).toLocaleDateString(),
        };
      }),
      activitySummary: {
        lastActive: student.last_login 
          ? new Date(student.last_login).toLocaleDateString()
          : "Never",
        activeDays: activityData?.length || 0,
        averageSessionTime: activityData && activityData.length > 0
          ? `${Math.round(totalMinutes / activityData.length)} min`
          : "0 min",
      },
    };

    // Generate HTML report
    const html = generateStudentReportHTML(reportData);

    if (format === "json") {
      return NextResponse.json(reportData);
    }

    // Return HTML for PDF conversion (client-side using html2pdf or similar)
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="student-report-${student.student_id || studentId}.html"`,
      },
    });
  } catch (error) {
    console.error("Error generating student report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
