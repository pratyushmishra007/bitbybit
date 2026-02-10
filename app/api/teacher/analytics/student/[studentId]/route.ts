import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get requesting user
    const { data: requestingUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", session.user.email)
      .single();

    if (!requestingUser || !["teacher", "admin"].includes(requestingUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get student basic info first (without joins that might fail)
    const { data: studentBasic, error: studentError } = await supabase
      .from("users")
      .select(`
        id,
        name,
        email,
        student_id,
        avatar_url,
        total_xp,
        xp,
        level,
        streak_days,
        last_active,
        created_at,
        bio,
        role,
        class_id,
        department_id,
        organization_id
      `)
      .eq("id", studentId)
      .single();

    if (!studentBasic) {
      console.error("Student query error:", studentError);
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get class, department, organization info separately
    let classInfo = null;
    let departmentInfo = null;
    let organizationInfo = null;

    // Try to get class from users.class_id first, then from class_enrollments
    if (studentBasic.class_id) {
      const { data: cls } = await supabase
        .from("classes")
        .select("id, name, code")
        .eq("id", studentBasic.class_id)
        .single();
      classInfo = cls;
    }

    // If no class from users table, try class_enrollments
    if (!classInfo) {
      const { data: enrollment } = await supabase
        .from("class_enrollments")
        .select("class:classes (id, name, code)")
        .eq("user_id", studentId)
        .eq("status", "active")
        .limit(1)
        .single();
      if (enrollment?.class) {
        classInfo = enrollment.class;
      }
    }

    if (studentBasic.department_id) {
      const { data: dept } = await supabase
        .from("departments")
        .select("id, name")
        .eq("id", studentBasic.department_id)
        .single();
      departmentInfo = dept;
    }

    if (studentBasic.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", studentBasic.organization_id)
        .single();
      organizationInfo = org;
    }

    // Combine into student object
    const student = {
      ...studentBasic,
      class: classInfo,
      department: departmentInfo,
      organization: organizationInfo,
    };

    // If teacher, verify they teach a class this student is in
    if (requestingUser.role === "teacher") {
      const { data: teacherClasses } = await supabase
        .from("teacher_assignments")
        .select("class_id")
        .eq("teacher_id", requestingUser.id);

      const teacherClassIds = teacherClasses?.map((tc) => tc.class_id) || [];

      const { data: studentEnrollments } = await supabase
        .from("class_enrollments")
        .select("class_id")
        .eq("user_id", studentId)
        .eq("status", "active");

      const studentClassIds = studentEnrollments?.map((se) => se.class_id) || [];

      const hasAccess = studentClassIds.some((scid) => teacherClassIds.includes(scid));

      if (!hasAccess) {
        return NextResponse.json(
          { error: "You don't have access to this student's data" },
          { status: 403 }
        );
      }
    }

    // Get daily activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailyActivity } = await supabase
      .from("daily_activity")
      .select("*")
      .eq("user_id", studentId)
      .gte("activity_date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("activity_date", { ascending: true });

    // Get course progress
    const { data: courseProgress } = await supabase
      .from("student_course_enrollments")
      .select(`
        id,
        progress_percentage,
        lessons_completed,
        total_lessons,
        started_at,
        completed_at,
        last_accessed,
        grade,
        status,
        class_course:class_courses (
          id,
          course_id,
          semester,
          academic_year,
          course:courses (
            id,
            title,
            description,
            difficulty,
            lessons_count,
            xp_total,
            category
          )
        )
      `)
      .eq("user_id", studentId);

    // Get lesson progress with details
    const { data: lessonProgress } = await supabase
      .from("lesson_progress")
      .select(`
        id,
        lesson_id,
        course_id,
        completed,
        completed_at,
        attempts_count,
        hints_used,
        code_submitted,
        lesson:lessons (
          id,
          title,
          order_index,
          xp_reward,
          difficulty:courses(difficulty)
        )
      `)
      .eq("user_id", studentId)
      .order("completed_at", { ascending: false });

    // Get assessment submissions
    const { data: assessments } = await supabase
      .from("assessment_submissions")
      .select(`
        id,
        total_score,
        percentage_score,
        passed,
        status,
        submitted_at,
        time_taken_seconds,
        attempt_number,
        feedback,
        assessment:assessments (
          id,
          title,
          type,
          total_points,
          passing_score,
          course_id
        )
      `)
      .eq("user_id", studentId)
      .order("submitted_at", { ascending: false });

    // Get help requests
    const { data: helpRequests } = await supabase
      .from("help_requests")
      .select(`
        id,
        message,
        status,
        created_at,
        resolved_at,
        lesson_id,
        course_id,
        priority,
        student_wait_time_seconds
      `)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get achievements
    const { data: achievements } = await supabase
      .from("achievements")
      .select("*")
      .eq("user_id", studentId)
      .order("earned_at", { ascending: false });

    // Calculate comprehensive metrics
    const totalTimeSpentMinutes = dailyActivity?.reduce(
      (sum, da) => sum + (da.time_spent_minutes || 0),
      0
    ) || 0;

    const totalLessonsCompleted = lessonProgress?.filter((lp) => lp.completed).length || 0;

    const totalXPEarned = dailyActivity?.reduce(
      (sum, da) => sum + (da.xp_earned || 0),
      0
    ) || 0;

    // Calculate average assessment score
    const gradedAssessments = assessments?.filter((a) => a.status === "graded") || [];
    const avgAssessmentScore = gradedAssessments.length > 0
      ? Math.round(
          gradedAssessments.reduce((sum, a) => sum + (a.percentage_score || 0), 0) /
          gradedAssessments.length
        )
      : null;

    // Calculate progress trends (weekly averages)
    const weeklyTrends: { week: string; lessons: number; minutes: number; xp: number }[] = [];
    const activityByWeek: Record<string, { lessons: number; minutes: number; xp: number }> = {};

    dailyActivity?.forEach((da) => {
      const weekStart = new Date(da.activity_date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!activityByWeek[weekKey]) {
        activityByWeek[weekKey] = { lessons: 0, minutes: 0, xp: 0 };
      }
      activityByWeek[weekKey].lessons += da.lessons_completed || 0;
      activityByWeek[weekKey].minutes += da.time_spent_minutes || 0;
      activityByWeek[weekKey].xp += da.xp_earned || 0;
    });

    Object.entries(activityByWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([week, data]) => {
        weeklyTrends.push({ week, ...data });
      });

    // Build activity heatmap (30 days)
    const activityHeatmap: { date: string; level: number; lessons: number; minutes: number }[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      
      const dayActivity = dailyActivity?.find((da) => da.activity_date === dateStr);
      const lessons = dayActivity?.lessons_completed || 0;
      const minutes = dayActivity?.time_spent_minutes || 0;

      // Activity level: 0 (none), 1 (low), 2 (medium), 3 (high)
      let level = 0;
      if (lessons > 0 || minutes > 0) {
        if (minutes >= 60 || lessons >= 3) level = 3;
        else if (minutes >= 30 || lessons >= 2) level = 2;
        else level = 1;
      }

      activityHeatmap.push({ date: dateStr, level, lessons, minutes });
    }

    // Calculate strengths and areas for improvement
    const coursePerformance = courseProgress?.map((cp) => {
      const course = (cp.class_course as any)?.course;
      return {
        courseId: course?.id,
        title: course?.title,
        category: course?.category,
        difficulty: course?.difficulty,
        progress: cp.progress_percentage || 0,
      };
    }) || [];

    const strengths = coursePerformance
      .filter((cp) => cp.progress >= 70)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3);

    const areasToImprove = coursePerformance
      .filter((cp) => cp.progress < 50 && cp.progress > 0)
      .sort((a, b) => a.progress - b.progress)
      .slice(0, 3);

    // Calculate engagement score
    const recentActivityDays = dailyActivity?.filter((da) => {
      const daysDiff = Math.floor(
        (new Date().getTime() - new Date(da.activity_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysDiff <= 7;
    }).length || 0;

    const avgProgress = coursePerformance.length > 0
      ? coursePerformance.reduce((sum, cp) => sum + cp.progress, 0) / coursePerformance.length
      : 0;

    const engagementScore = Math.min(100, Math.round(
      (recentActivityDays / 7) * 40 +
      (avgProgress / 100) * 30 +
      ((student as any).streak_days || 0) * 3 +
      (gradedAssessments.filter((a) => a.passed).length * 5)
    ));

    // Recent activity timeline
    const recentLessons = lessonProgress
      ?.filter((lp) => lp.completed && lp.completed_at)
      .slice(0, 10)
      .map((lp) => ({
        type: "lesson_completed" as const,
        id: lp.id,
        title: (lp.lesson as any)?.title,
        lessonId: lp.lesson_id,
        courseId: lp.course_id,
        timestamp: lp.completed_at,
        xpEarned: (lp.lesson as any)?.xp_reward,
      })) || [];

    const recentAssessments = assessments
      ?.filter((a) => a.submitted_at)
      .slice(0, 5)
      .map((a) => ({
        type: "assessment_submitted" as const,
        id: a.id,
        title: (a.assessment as any)?.title,
        score: a.percentage_score,
        passed: a.passed,
        timestamp: a.submitted_at,
      })) || [];

    const timeline = [...recentLessons, ...recentAssessments]
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, 15);

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        studentId: student.student_id,
        avatarUrl: student.avatar_url,
        totalXP: student.total_xp,
        level: student.level,
        streakDays: student.streak_days,
        lastActive: student.last_active,
        joinedAt: student.created_at,
        bio: student.bio,
        class: student.class,
        department: student.department,
        organization: student.organization,
      },
      metrics: {
        totalTimeSpentMinutes,
        totalTimeSpentHours: Math.round(totalTimeSpentMinutes / 60),
        totalLessonsCompleted,
        totalCoursesEnrolled: courseProgress?.length || 0,
        totalCoursesCompleted: courseProgress?.filter(
          (cp) => cp.progress_percentage === 100
        ).length || 0,
        avgProgress: Math.round(avgProgress),
        avgAssessmentScore,
        totalAssessmentsTaken: gradedAssessments.length,
        assessmentPassRate: gradedAssessments.length > 0
          ? Math.round(
              (gradedAssessments.filter((a) => a.passed).length / gradedAssessments.length) * 100
            )
          : null,
        totalXPEarned,
        engagementScore,
        helpRequestsMade: helpRequests?.length || 0,
        achievementsEarned: achievements?.length || 0,
      },
      courses: courseProgress?.map((cp) => {
        const classCourse = cp.class_course as any;
        const course = classCourse?.course;
        return {
          id: cp.id,
          courseId: course?.id,
          title: course?.title,
          description: course?.description,
          difficulty: course?.difficulty,
          category: course?.category,
          lessonsCount: course?.lessons_count,
          xpTotal: course?.xp_total,
          progress: cp.progress_percentage || 0,
          lessonsCompleted: cp.lessons_completed || 0,
          totalLessons: cp.total_lessons || course?.lessons_count || 0,
          startedAt: cp.started_at,
          completedAt: cp.completed_at,
          lastAccessed: cp.last_accessed,
          grade: cp.grade,
          status: cp.status,
          semester: classCourse?.semester,
          academicYear: classCourse?.academic_year,
        };
      }),
      assessments: gradedAssessments.map((a) => ({
        id: a.id,
        title: (a.assessment as any)?.title,
        type: (a.assessment as any)?.type,
        score: a.total_score,
        percentage: a.percentage_score,
        totalPoints: (a.assessment as any)?.total_points,
        passingScore: (a.assessment as any)?.passing_score,
        passed: a.passed,
        submittedAt: a.submitted_at,
        timeTakenSeconds: a.time_taken_seconds,
        attemptNumber: a.attempt_number,
        feedback: a.feedback,
      })),
      activityHeatmap,
      weeklyTrends,
      strengths,
      areasToImprove,
      timeline,
      helpRequests: helpRequests?.map((hr) => ({
        id: hr.id,
        message: hr.message,
        status: hr.status,
        priority: hr.priority,
        createdAt: hr.created_at,
        resolvedAt: hr.resolved_at,
        waitTimeSeconds: hr.student_wait_time_seconds,
      })),
      achievements: achievements?.map((a) => ({
        id: a.id,
        badgeName: a.badge_name,
        earnedAt: a.earned_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching student analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch student analytics" },
      { status: 500 }
    );
  }
}
