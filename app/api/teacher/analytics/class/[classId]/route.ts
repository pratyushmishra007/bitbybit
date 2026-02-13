import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to calculate days since date
function daysSince(date: string | null): number {
  if (!date) return 999;
  const then = new Date(date);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

// Get day of week name
function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get teacher user
    const { data: teacher } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", session.user.email)
      .single();

    if (!teacher || !["teacher", "admin"].includes(teacher.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify teacher is assigned to this class (skip for admin)
    if (teacher.role === "teacher") {
      const { data: assignment } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", teacher.id)
        .eq("class_id", classId)
        .single();

      if (!assignment) {
        return NextResponse.json(
          { error: "You are not assigned to this class" },
          { status: 403 }
        );
      }
    }

    // Get class details
    const { data: classData } = await supabase
      .from("classes")
      .select(`
        id,
        name,
        code,
        year_level,
        capacity,
        current_semester,
        academic_year,
        department:departments (id, name, code),
        organization:organizations (id, name)
      `)
      .eq("id", classId)
      .single();

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Get all students in this class
    const { data: enrollments } = await supabase
      .from("class_enrollments")
      .select(`
        id,
        user_id,
        status,
        enrollment_date,
        user:users (
          id,
          name,
          email,
          student_id,
          avatar_url,
          last_active,
          total_xp,
          level,
          streak_days
        )
      `)
      .eq("class_id", classId)
      .eq("status", "active");

    const studentIds = enrollments?.map((e) => e.user_id).filter(Boolean) || [];

    // Get courses assigned to this class
    const { data: classCourses } = await supabase
      .from("class_courses")
      .select(`
        id,
        course_id,
        semester,
        academic_year,
        start_date,
        end_date,
        is_active,
        course:courses (
          id,
          title,
          description,
          difficulty,
          lessons_count,
          xp_total,
          category
        )
      `)
      .eq("class_id", classId)
      .eq("is_active", true);

    // Get student course enrollments for progress
    const { data: studentCourseProgress } = await supabase
      .from("student_course_enrollments")
      .select(`
        id,
        user_id,
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
          class_id
        )
      `)
      .in("user_id", studentIds);

    // Get daily activity for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: dailyActivity } = await supabase
      .from("daily_activity")
      .select("*")
      .in("user_id", studentIds)
      .gte("activity_date", sevenDaysAgo.toISOString().split("T")[0])
      .order("activity_date", { ascending: true });

    // Get lesson progress for detailed analysis
    const { data: lessonProgress } = await supabase
      .from("lesson_progress")
      .select(`
        id,
        user_id,
        lesson_id,
        course_id,
        completed,
        completed_at,
        attempts_count,
        hints_used
      `)
      .in("user_id", studentIds);

    // Get assessment submissions
    const { data: assessmentSubmissions } = await supabase
      .from("assessment_submissions")
      .select(`
        id,
        user_id,
        assessment_id,
        total_score,
        percentage_score,
        passed,
        status,
        submitted_at
      `)
      .in("user_id", studentIds)
      .eq("status", "graded");

    // Build per-student analytics
    const studentAnalytics = enrollments?.map((enrollment) => {
      const user = enrollment.user as any;
      if (!user) return null;

      // Student's course progress
      const studentProgress = studentCourseProgress?.filter(
        (scp) => scp.user_id === enrollment.user_id
      ) || [];

      const avgProgress = studentProgress.length > 0
        ? Math.round(
            studentProgress.reduce((sum, sp) => sum + (sp.progress_percentage || 0), 0) /
            studentProgress.length
          )
        : 0;

      // Lessons completed by this student
      const studentLessons = lessonProgress?.filter(
        (lp) => lp.user_id === enrollment.user_id && lp.completed
      ) || [];

      // Time spent (last 7 days)
      const studentActivity = dailyActivity?.filter(
        (da) => da.user_id === enrollment.user_id
      ) || [];
      
      const totalMinutes = studentActivity.reduce(
        (sum, da) => sum + (da.time_spent_minutes || 0),
        0
      );

      // XP earned this week
      const weeklyXP = studentActivity.reduce(
        (sum, da) => sum + (da.xp_earned || 0),
        0
      );

      // Assessment performance
      const studentAssessments = assessmentSubmissions?.filter(
        (as) => as.user_id === enrollment.user_id
      ) || [];
      
      const avgAssessmentScore = studentAssessments.length > 0
        ? Math.round(
            studentAssessments.reduce((sum, sa) => sum + (sa.percentage_score || 0), 0) /
            studentAssessments.length
          )
        : null;

      // Days since last active
      const daysSinceActive = daysSince(user.last_active);

      // Risk assessment
      const isAtRisk = daysSinceActive > 7 || (avgProgress < 25 && daysSinceActive > 3);

      // Engagement score (0-100)
      const engagementScore = Math.min(100, Math.round(
        (studentActivity.length / 7) * 40 + // Activity frequency
        (avgProgress / 100) * 30 + // Progress
        (user.streak_days || 0) * 3 // Streak bonus
      ));

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        studentId: user.student_id,
        avatarUrl: user.avatar_url,
        enrollmentDate: enrollment.enrollment_date,
        lastActive: user.last_active,
        daysSinceActive,
        totalXP: user.total_xp,
        level: user.level,
        streakDays: user.streak_days,
        avgProgress,
        lessonsCompleted: studentLessons.length,
        timeSpentMinutes: totalMinutes,
        weeklyXP,
        avgAssessmentScore,
        assessmentsTaken: studentAssessments.length,
        engagementScore,
        isAtRisk,
        riskReason: isAtRisk
          ? daysSinceActive > 7
            ? "Inactive for 7+ days"
            : "Low progress"
          : null,
        courseProgress: studentProgress.map((sp) => ({
          courseId: (sp.class_course as any)?.course_id,
          progress: sp.progress_percentage,
          lessonsCompleted: sp.lessons_completed,
          totalLessons: sp.total_lessons,
          lastAccessed: sp.last_accessed,
          grade: sp.grade,
          status: sp.status,
        })),
      };
    }).filter(Boolean);

    // Build per-course analytics
    const courseAnalytics = classCourses?.map((cc) => {
      const course = cc.course as any;
      if (!course) return null;

      // Get progress for this course
      const courseProgress = studentCourseProgress?.filter(
        (scp) => (scp.class_course as any)?.course_id === cc.course_id
      ) || [];

      const enrolledCount = courseProgress.length;
      const avgProgress = enrolledCount > 0
        ? Math.round(
            courseProgress.reduce((sum, cp) => sum + (cp.progress_percentage || 0), 0) /
            enrolledCount
          )
        : 0;

      const completedCount = courseProgress.filter(
        (cp) => cp.progress_percentage === 100
      ).length;

      const inProgressCount = courseProgress.filter(
        (cp) => (cp.progress_percentage || 0) > 0 && (cp.progress_percentage || 0) < 100
      ).length;

      const notStartedCount = enrolledCount - completedCount - inProgressCount;

      // Lesson completion breakdown
      const courseLessons = lessonProgress?.filter(
        (lp) => lp.course_id === cc.course_id
      ) || [];

      return {
        id: cc.course_id,
        title: course.title,
        description: course.description,
        difficulty: course.difficulty,
        category: course.category,
        lessonsCount: course.lessons_count,
        xpTotal: course.xp_total,
        semester: cc.semester,
        academicYear: cc.academic_year,
        startDate: cc.start_date,
        endDate: cc.end_date,
        enrolledCount,
        avgProgress,
        completedCount,
        inProgressCount,
        notStartedCount,
        completionRate: enrolledCount > 0
          ? Math.round((completedCount / enrolledCount) * 100)
          : 0,
      };
    }).filter(Boolean);

    // Build activity heatmap (last 7 days by day)
    const activityByDay: Record<string, { lessons: number; minutes: number; xp: number }> = {};
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      activityByDay[dateStr] = { lessons: 0, minutes: 0, xp: 0 };
    }

    dailyActivity?.forEach((da) => {
      if (activityByDay[da.activity_date]) {
        activityByDay[da.activity_date].lessons += da.lessons_completed || 0;
        activityByDay[da.activity_date].minutes += da.time_spent_minutes || 0;
        activityByDay[da.activity_date].xp += da.xp_earned || 0;
      }
    });

    const activityHeatmap = Object.entries(activityByDay).map(([date, data]) => ({
      date,
      dayName: getDayName(new Date(date)),
      ...data,
    }));

    // Build lesson heatmap data (student × lesson progress matrix)
    // Get all lessons from assigned courses for this class
    const courseIds = classCourses?.map(cc => (cc.course as any)?.id).filter(Boolean) || [];
    
    let lessonsForHeatmap: { id: string; title: string; course_id: string; order: number }[] = [];
    if (courseIds.length > 0) {
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, title, course_id, order_index")
        .in("course_id", courseIds)
        .order("course_id")
        .order("order_index");
      lessonsForHeatmap = (lessons || []).map(l => ({
        id: l.id,
        title: l.title,
        course_id: l.course_id,
        order: l.order_index
      }));
    }

    // Build the heatmap matrix
    const lessonHeatmap = {
      lessons: lessonsForHeatmap.slice(0, 20).map(l => ({ // Limit to 20 lessons for display
        id: l.id,
        title: l.title.length > 25 ? l.title.substring(0, 22) + "..." : l.title,
        courseId: l.course_id
      })),
      students: (studentAnalytics || []).slice(0, 30).map(student => { // Limit to 30 students
        if (!student) return null;
        const studentLessonData = lessonProgress?.filter(lp => lp.user_id === student.id) || [];
        return {
          id: student.id,
          name: student.name.length > 20 ? student.name.substring(0, 17) + "..." : student.name,
          progress: lessonsForHeatmap.slice(0, 20).map(lesson => {
            const lp = studentLessonData.find(slp => slp.lesson_id === lesson.id);
            return {
              lessonId: lesson.id,
              completed: lp?.completed || false,
              attempts: lp?.attempts_count || 0
            };
          })
        };
      }).filter(Boolean)
    };

    // Insights and analytics summary
    const insights = {
      mostStruggledLesson: lessonsForHeatmap.length > 0 ? (() => {
        const lessonCompletionRates = lessonsForHeatmap.map(lesson => {
          const completions = lessonProgress?.filter(lp => lp.lesson_id === lesson.id && lp.completed).length || 0;
          const attempts = lessonProgress?.filter(lp => lp.lesson_id === lesson.id).length || 0;
          return { lesson, completionRate: attempts > 0 ? completions / attempts * 100 : 100, attempts };
        });
        const struggled = lessonCompletionRates
          .filter(l => l.attempts >= 3)
          .sort((a, b) => a.completionRate - b.completionRate)[0];
        return struggled ? { title: struggled.lesson.title, completionRate: Math.round(struggled.completionRate) } : null;
      })() : null,
      topPerformers: (studentAnalytics || [])
        .filter(s => s)
        .sort((a, b) => (b?.avgProgress || 0) - (a?.avgProgress || 0))
        .slice(0, 3)
        .map(s => ({ name: s!.name, progress: s!.avgProgress })),
      needsAttention: (studentAnalytics || [])
        .filter(s => s?.isAtRisk)
        .map(s => ({ name: s!.name, reason: s!.riskReason, daysSinceActive: s!.daysSinceActive })),
      weeklyTrend: (() => {
        const firstHalf = activityHeatmap.slice(0, 3).reduce((sum, d) => sum + d.lessons, 0);
        const secondHalf = activityHeatmap.slice(4).reduce((sum, d) => sum + d.lessons, 0);
        if (secondHalf > firstHalf * 1.2) return "improving";
        if (secondHalf < firstHalf * 0.8) return "declining";
        return "stable";
      })()
    };

    // Calculate class summary metrics
    const totalStudents = studentAnalytics?.length || 0;
    const activeStudents = studentAnalytics?.filter(
      (s) => s && s.daysSinceActive <= 7
    ).length || 0;
    const atRiskStudents = studentAnalytics?.filter((s) => s?.isAtRisk).length || 0;
    
    const classAvgProgress = totalStudents > 0
      ? Math.round(
          studentAnalytics!.reduce((sum, s) => sum + (s?.avgProgress || 0), 0) / totalStudents
        )
      : 0;

    const totalTimeSpent = dailyActivity?.reduce(
      (sum, da) => sum + (da.time_spent_minutes || 0),
      0
    ) || 0;

    const avgEngagement = totalStudents > 0
      ? Math.round(
          studentAnalytics!.reduce((sum, s) => sum + (s?.engagementScore || 0), 0) / totalStudents
        )
      : 0;

    return NextResponse.json({
      class: {
        id: classData.id,
        name: classData.name,
        code: classData.code,
        yearLevel: classData.year_level,
        capacity: classData.capacity,
        currentSemester: classData.current_semester,
        academicYear: classData.academic_year,
        department: classData.department,
        organization: classData.organization,
      },
      summary: {
        totalStudents,
        activeStudents,
        atRiskStudents,
        avgProgress: classAvgProgress,
        totalCoursesAssigned: classCourses?.length || 0,
        totalTimeSpentMinutes: totalTimeSpent,
        avgEngagementScore: avgEngagement,
      },
      students: studentAnalytics,
      courses: courseAnalytics,
      activityHeatmap,
      lessonHeatmap,
      insights,
    });
  } catch (error) {
    console.error("Error fetching class analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch class analytics" },
      { status: 500 }
    );
  }
}
