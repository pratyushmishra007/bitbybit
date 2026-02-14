import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { generateClassReportHTML, ClassReportData } from "@/lib/pdf-generator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { classId } = await params;
    const format = req.nextUrl.searchParams.get("format") || "html";

    // Verify teacher access
    const { data: teacher } = await supabase
      .from("users")
      .select("id, role, organization_id, name")
      .eq("email", session.user.email)
      .single();

    if (!teacher || !["teacher", "org_admin", "admin"].includes(teacher.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get class data
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select(`
        id, name, code,
        organization:organizations(id, name),
        semester:semesters(id, name)
      `)
      .eq("id", classId)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Get all students in class
    const { data: enrollments } = await supabase
      .from("class_enrollments")
      .select(`
        user:users(id, name, student_id, xp, level, lessons_completed, last_login)
      `)
      .eq("class_id", classId)
      .eq("status", "active");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get detailed student data
    const studentsData = await Promise.all(
      (enrollments || []).map(async (enrollment: any) => {
        const user = Array.isArray(enrollment.user) ? enrollment.user[0] : enrollment.user;
        if (!user) return null;

        // Get course progress
        const { data: courseEnrollments } = await supabase
          .from("course_enrollments")
          .select("progress_percentage, completed_lessons")
          .eq("user_id", user.id);

        const avgProgress = courseEnrollments && courseEnrollments.length > 0
          ? Math.round(
              courseEnrollments.reduce((sum: number, e: any) => sum + (e.progress_percentage || 0), 0) /
              courseEnrollments.length
            )
          : 0;

        const totalLessons = courseEnrollments?.reduce((sum: number, e: any) => sum + (e.completed_lessons || 0), 0) || 0;

        // Get assessment grades
        const { data: submissions } = await supabase
          .from("assessment_submissions")
          .select("score, max_score")
          .eq("student_id", user.id)
          .eq("status", "graded");

        const avgGrade = submissions && submissions.length > 0
          ? Math.round(
              submissions.reduce((sum: number, s: any) => sum + (s.score / s.max_score * 100), 0) /
              submissions.length
            )
          : null;

        // Determine status
        let status: 'active' | 'at-risk' | 'inactive' = 'active';
        if (!user.last_login || new Date(user.last_login) < sevenDaysAgo) {
          status = 'inactive';
        } else if (avgProgress < 25) {
          status = 'at-risk';
        }

        return {
          name: user.name || "Unknown",
          studentId: user.student_id || user.id,
          progress: avgProgress,
          lessonsCompleted: totalLessons,
          grade: avgGrade ? `${avgGrade}%` : undefined,
          status,
          lastLogin: user.last_login,
        };
      })
    );

    const students = studentsData.filter(Boolean) as NonNullable<typeof studentsData[number]>[];

    // Get course performance for this class
    const { data: classCourses } = await supabase
      .from("class_courses")
      .select(`
        course:courses(id, name)
      `)
      .eq("class_id", classId);

    const coursePerformance = await Promise.all(
      (classCourses || []).map(async (cc: any) => {
        const course = Array.isArray(cc.course) ? cc.course[0] : cc.course;
        if (!course) return null;

        const { data: enrollments } = await supabase
          .from("course_enrollments")
          .select("progress_percentage")
          .eq("course_id", course.id)
          .in("user_id", students.map(s => s.studentId));

        const avgProgress = enrollments && enrollments.length > 0
          ? Math.round(
              enrollments.reduce((sum: number, e: any) => sum + (e.progress_percentage || 0), 0) /
              enrollments.length
            )
          : 0;

        const completedCount = enrollments?.filter((e: any) => e.progress_percentage >= 100).length || 0;
        const completionRate = enrollments && enrollments.length > 0
          ? Math.round((completedCount / enrollments.length) * 100)
          : 0;

        return {
          courseName: course.name,
          averageProgress: avgProgress,
          completionRate,
        };
      })
    );

    // Calculate class stats
    const activeStudents = students.filter(s => s.status === 'active').length;
    const avgProgress = students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + s.progress, 0) / students.length)
      : 0;
    
    const gradesWithValues = students.filter(s => s.grade).map(s => parseInt(s.grade!));
    const avgGrade = gradesWithValues.length > 0
      ? Math.round(gradesWithValues.reduce((sum, g) => sum + g, 0) / gradesWithValues.length)
      : 0;

    const completedStudents = students.filter(s => s.progress >= 100).length;
    const completionRate = students.length > 0
      ? Math.round((completedStudents / students.length) * 100)
      : 0;

    const org = Array.isArray(classData.organization) 
      ? classData.organization[0] 
      : classData.organization;
    const semester = Array.isArray(classData.semester) 
      ? classData.semester[0] 
      : classData.semester;

    const reportData: ClassReportData = {
      className: classData.name,
      classCode: classData.code,
      teacherName: teacher.name || "Unknown",
      organizationName: org?.name || "Unknown Organization",
      semester: semester?.name || "Current Semester",
      generatedAt: new Date(),
      stats: {
        totalStudents: students.length,
        activeStudents,
        averageProgress: avgProgress,
        averageGrade: avgGrade,
        completionRate,
      },
      students: students.map(s => ({
        name: s.name,
        studentId: s.studentId,
        progress: s.progress,
        lessonsCompleted: s.lessonsCompleted,
        grade: s.grade,
        status: s.status,
      })),
      coursePerformance: coursePerformance.filter(Boolean) as NonNullable<typeof coursePerformance[number]>[],
    };

    // Generate HTML report
    const html = generateClassReportHTML(reportData);

    if (format === "json") {
      return NextResponse.json(reportData);
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="class-report-${classData.code}.html"`,
      },
    });
  } catch (error) {
    console.error("Error generating class report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
