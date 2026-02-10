import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user basic info
    const { data: userBasic, error: userError } = await supabase
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
        class_id,
        department_id,
        organization_id
      `)
      .eq("email", session.user.email)
      .single();

    if (!userBasic) {
      console.error("User query error:", userError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get class, department, organization info separately
    let classInfo = null;
    let departmentInfo = null;
    let organizationInfo = null;

    if (userBasic.class_id) {
      const { data: cls } = await supabase
        .from("classes")
        .select("id, name, code")
        .eq("id", userBasic.class_id)
        .single();
      classInfo = cls;
    }

    // If no class from users table, try class_enrollments
    if (!classInfo) {
      const { data: enrollment } = await supabase
        .from("class_enrollments")
        .select("class:classes (id, name, code)")
        .eq("user_id", userBasic.id)
        .eq("status", "active")
        .limit(1)
        .single();
      if (enrollment?.class) {
        classInfo = enrollment.class;
      }
    }

    if (userBasic.department_id) {
      const { data: dept } = await supabase
        .from("departments")
        .select("id, name")
        .eq("id", userBasic.department_id)
        .single();
      departmentInfo = dept;
    }

    if (userBasic.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", userBasic.organization_id)
        .single();
      organizationInfo = org;
    }

    // Combine into user object
    const user = {
      ...userBasic,
      class: classInfo,
      department: departmentInfo,
      organization: organizationInfo,
    };

    const userId = user.id;

    // Get daily activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailyActivity } = await supabase
      .from("daily_activity")
      .select("*")
      .eq("user_id", userId)
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
          class_id,
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
      .eq("user_id", userId);

    // Get lesson progress
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
        lesson:lessons (
          id,
          title,
          order_index,
          xp_reward,
          duration_minutes
        )
      `)
      .eq("user_id", userId)
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
        assessment:assessments (
          id,
          title,
          type,
          total_points,
          passing_score,
          course_id
        )
      `)
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false });

    // Get achievements
    const { data: achievements } = await supabase
      .from("achievements")
      .select("*")
      .eq("user_id", userId)
      .order("earned_at", { ascending: false });

    // ===== CLASS COMPARISON (ANONYMOUS) =====
    let classComparison = null;

    if (user.class_id) {
      // Get all students in the same class
      const { data: classmates } = await supabase
        .from("class_enrollments")
        .select("user_id")
        .eq("class_id", user.class_id)
        .eq("status", "active");

      const classmateIds = classmates?.map((c) => c.user_id).filter((id) => id !== userId) || [];

      if (classmateIds.length > 0) {
        // Get classmates' course progress
        const { data: classmateProgress } = await supabase
          .from("student_course_enrollments")
          .select("user_id, progress_percentage")
          .in("user_id", classmateIds);

        // Get classmates' daily activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: classmateActivity } = await supabase
          .from("daily_activity")
          .select("user_id, lessons_completed, time_spent_minutes, xp_earned")
          .in("user_id", classmateIds)
          .gte("activity_date", sevenDaysAgo.toISOString().split("T")[0]);

        // Calculate class averages
        const classAvgProgress = classmateProgress && classmateProgress.length > 0
          ? Math.round(
              classmateProgress.reduce((sum, cp) => sum + (cp.progress_percentage || 0), 0) /
              classmateProgress.length
            )
          : 0;

        // Calculate user's average progress
        const userAvgProgress = courseProgress && courseProgress.length > 0
          ? Math.round(
              courseProgress.reduce((sum, cp) => sum + (cp.progress_percentage || 0), 0) /
              courseProgress.length
            )
          : 0;

        // Weekly metrics comparison
        const userWeeklyActivity = dailyActivity?.filter((da) => {
          const actDate = new Date(da.activity_date);
          return actDate >= sevenDaysAgo;
        }) || [];

        const userWeeklyLessons = userWeeklyActivity.reduce(
          (sum, da) => sum + (da.lessons_completed || 0), 0
        );
        const userWeeklyMinutes = userWeeklyActivity.reduce(
          (sum, da) => sum + (da.time_spent_minutes || 0), 0
        );
        const userWeeklyXP = userWeeklyActivity.reduce(
          (sum, da) => sum + (da.xp_earned || 0), 0
        );

        // Class averages for weekly metrics
        const uniqueClassmates = new Set(classmateActivity?.map((ca) => ca.user_id) || []);
        const numActiveClassmates = uniqueClassmates.size || 1;

        const classWeeklyLessons = classmateActivity
          ? Math.round(
              classmateActivity.reduce((sum, ca) => sum + (ca.lessons_completed || 0), 0) /
              numActiveClassmates
            )
          : 0;

        const classWeeklyMinutes = classmateActivity
          ? Math.round(
              classmateActivity.reduce((sum, ca) => sum + (ca.time_spent_minutes || 0), 0) /
              numActiveClassmates
            )
          : 0;

        const classWeeklyXP = classmateActivity
          ? Math.round(
              classmateActivity.reduce((sum, ca) => sum + (ca.xp_earned || 0), 0) /
              numActiveClassmates
            )
          : 0;

        // Calculate percentile rank
        const allProgressValues = [
          ...(classmateProgress?.map((cp) => cp.progress_percentage || 0) || []),
          userAvgProgress,
        ].sort((a, b) => a - b);

        const userRank = allProgressValues.indexOf(userAvgProgress) + 1;
        const percentile = Math.round((userRank / allProgressValues.length) * 100);

        classComparison = {
          classSize: classmateIds.length + 1,
          yourProgress: userAvgProgress,
          classAvgProgress,
          progressDifference: userAvgProgress - classAvgProgress,
          percentile,
          weeklyComparison: {
            lessons: {
              you: userWeeklyLessons,
              classAvg: classWeeklyLessons,
              difference: userWeeklyLessons - classWeeklyLessons,
            },
            timeMinutes: {
              you: userWeeklyMinutes,
              classAvg: classWeeklyMinutes,
              difference: userWeeklyMinutes - classWeeklyMinutes,
            },
            xp: {
              you: userWeeklyXP,
              classAvg: classWeeklyXP,
              difference: userWeeklyXP - classWeeklyXP,
            },
          },
        };
      }
    }

    // ===== CALCULATE PERSONAL METRICS =====
    const totalTimeSpentMinutes = dailyActivity?.reduce(
      (sum, da) => sum + (da.time_spent_minutes || 0), 0
    ) || 0;

    const totalLessonsCompleted = lessonProgress?.filter((lp) => lp.completed).length || 0;

    const totalXPEarned = dailyActivity?.reduce(
      (sum, da) => sum + (da.xp_earned || 0), 0
    ) || 0;

    const gradedAssessments = assessments?.filter((a) => a.status === "graded") || [];
    const avgAssessmentScore = gradedAssessments.length > 0
      ? Math.round(
          gradedAssessments.reduce((sum, a) => sum + (a.percentage_score || 0), 0) /
          gradedAssessments.length
        )
      : null;

    // Build activity heatmap (30 days)
    const activityHeatmap: { date: string; level: number; lessons: number; minutes: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayActivity = dailyActivity?.find((da) => da.activity_date === dateStr);
      const lessons = dayActivity?.lessons_completed || 0;
      const minutes = dayActivity?.time_spent_minutes || 0;

      let level = 0;
      if (lessons > 0 || minutes > 0) {
        if (minutes >= 60 || lessons >= 3) level = 3;
        else if (minutes >= 30 || lessons >= 2) level = 2;
        else level = 1;
      }

      activityHeatmap.push({ date: dateStr, level, lessons, minutes });
    }

    // Weekly trends
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

    // Strengths and areas to improve
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

    // Consistency score (based on activity in last 30 days)
    const activeDays = activityHeatmap.filter((ah) => ah.level > 0).length;
    const consistencyScore = Math.round((activeDays / 30) * 100);

    // Calculate XP needed for next level
    const currentLevel = user.level || 1;
    const xpForNextLevel = currentLevel * 100;
    const currentLevelXP = (user.total_xp || 0) % 100;
    const xpNeeded = xpForNextLevel - currentLevelXP;

    // Goals progress (example goals)
    const goals = [
      {
        id: "weekly_lessons",
        title: "Complete 5 lessons this week",
        target: 5,
        current: weeklyTrends[weeklyTrends.length - 1]?.lessons || 0,
        unit: "lessons",
      },
      {
        id: "streak",
        title: `Maintain ${user.streak_days || 0}+ day streak`,
        target: (user.streak_days || 0) + 1,
        current: user.streak_days || 0,
        unit: "days",
      },
      {
        id: "course_progress",
        title: "Reach 50% in all courses",
        target: courseProgress?.length || 0,
        current: courseProgress?.filter((cp) => (cp.progress_percentage || 0) >= 50).length || 0,
        unit: "courses",
      },
    ];

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

    const recentAssessments = gradedAssessments
      .slice(0, 5)
      .map((a) => ({
        type: "assessment_submitted" as const,
        id: a.id,
        title: (a.assessment as any)?.title,
        score: a.percentage_score,
        passed: a.passed,
        timestamp: a.submitted_at,
      }));

    const timeline = [...recentLessons, ...recentAssessments]
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, 10);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        studentId: user.student_id,
        avatarUrl: user.avatar_url,
        totalXP: user.total_xp,
        level: user.level,
        streakDays: user.streak_days,
        lastActive: user.last_active,
        joinedAt: user.created_at,
        class: user.class,
        department: user.department,
        organization: user.organization,
      },
      metrics: {
        totalTimeSpentMinutes,
        totalTimeSpentHours: Math.round(totalTimeSpentMinutes / 60),
        totalLessonsCompleted,
        totalCoursesEnrolled: courseProgress?.length || 0,
        totalCoursesCompleted: courseProgress?.filter(
          (cp) => cp.progress_percentage === 100
        ).length || 0,
        avgProgress: coursePerformance.length > 0
          ? Math.round(
              coursePerformance.reduce((sum, cp) => sum + cp.progress, 0) / coursePerformance.length
            )
          : 0,
        avgAssessmentScore,
        totalAssessmentsTaken: gradedAssessments.length,
        assessmentPassRate: gradedAssessments.length > 0
          ? Math.round(
              (gradedAssessments.filter((a) => a.passed).length / gradedAssessments.length) * 100
            )
          : null,
        totalXPEarned,
        consistencyScore,
        achievementsEarned: achievements?.length || 0,
      },
      leveling: {
        currentLevel,
        currentXP: user.total_xp || 0,
        xpInCurrentLevel: currentLevelXP,
        xpForNextLevel,
        xpNeeded,
        progressPercent: Math.round((currentLevelXP / xpForNextLevel) * 100),
      },
      classComparison,
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
          status: cp.status,
        };
      }),
      activityHeatmap,
      weeklyTrends,
      strengths,
      areasToImprove,
      goals,
      timeline,
      achievements: achievements?.map((a) => ({
        id: a.id,
        badgeName: a.badge_name,
        earnedAt: a.earned_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching self analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
