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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get teacher user
    const { data: teacher } = await supabase
      .from("users")
      .select("id, role, organization_id")
      .eq("email", session.user.email)
      .single();

    if (!teacher || !["teacher", "admin"].includes(teacher.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get teacher's assigned classes
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select(`
        id,
        subject,
        assigned_at,
        class:classes (
          id,
          name,
          code,
          year_level,
          capacity,
          department:departments (id, name, code),
          organization:organizations (id, name)
        )
      `)
      .eq("teacher_id", teacher.id);

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({
        overview: {
          totalClasses: 0,
          totalStudents: 0,
          activeStudents7d: 0,
          atRiskStudents: 0,
          avgCompletionRate: 0,
          totalLearningHours: 0,
          pendingHelpRequests: 0,
          lessonsCompletedToday: 0,
        },
        classes: [],
        recentActivity: [],
        atRiskStudentsList: [],
      });
    }

    const classIds = assignments.map((a) => (a.class as any)?.id).filter(Boolean);

    // 1. Get all students in teacher's classes
    const { data: enrollments } = await supabase
      .from("class_enrollments")
      .select(`
        id,
        user_id,
        status,
        user:users (
          id,
          name,
          email,
          student_id,
          avatar_url,
          last_active,
          total_xp
        )
      `)
      .in("class_id", classIds)
      .eq("status", "active");

    const studentIds = enrollments?.map((e) => e.user_id).filter(Boolean) || [];
    const totalStudents = studentIds.length;

    // 2. Get daily activity for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentActivity } = await supabase
      .from("daily_activity")
      .select("user_id, activity_date, lessons_completed, time_spent_minutes, xp_earned")
      .in("user_id", studentIds)
      .gte("activity_date", sevenDaysAgo.toISOString().split("T")[0]);

    // Calculate active students (activity in last 7 days)
    const activeStudentIds = new Set(recentActivity?.map((a) => a.user_id) || []);
    const activeStudents7d = activeStudentIds.size;

    // 3. Get lesson progress for all students
    const { data: lessonProgress } = await supabase
      .from("lesson_progress")
      .select("user_id, lesson_id, completed, completed_at")
      .in("user_id", studentIds);

    // Calculate lessons completed today
    const today = new Date().toISOString().split("T")[0];
    const lessonsCompletedToday = lessonProgress?.filter(
      (lp) => lp.completed && lp.completed_at?.startsWith(today)
    ).length || 0;

    // 4. Get student course enrollments for progress
    const { data: courseEnrollments } = await supabase
      .from("student_course_enrollments")
      .select(`
        user_id,
        progress_percentage,
        lessons_completed,
        total_lessons,
        last_accessed,
        class_course:class_courses (
          course_id,
          class_id,
          course:courses (id, title)
        )
      `)
      .in("user_id", studentIds);

    // Calculate average completion rate
    const progressValues = courseEnrollments?.map((e) => e.progress_percentage || 0) || [];
    const avgCompletionRate = progressValues.length > 0
      ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
      : 0;

    // 5. Get total learning hours
    const totalMinutes = recentActivity?.reduce((sum, a) => sum + (a.time_spent_minutes || 0), 0) || 0;
    const totalLearningHours = Math.round(totalMinutes / 60);

    // 6. Get pending help requests
    const { count: pendingHelpRequests } = await supabase
      .from("help_requests")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", teacher.id)
      .eq("status", "pending");

    // 7. Identify at-risk students
    // Criteria: No activity in 7+ days OR progress < 20% when 50%+ time elapsed
    const atRiskStudentsList: any[] = [];
    
    if (enrollments) {
      for (const enrollment of enrollments) {
        const user = enrollment.user as any;
        if (!user) continue;

        const hasRecentActivity = activeStudentIds.has(enrollment.user_id);
        const daysSinceActive = daysSince(user.last_active);
        
        // Get this student's course progress
        const studentProgress = courseEnrollments?.filter(
          (ce) => ce.user_id === enrollment.user_id
        ) || [];
        
        const avgProgress = studentProgress.length > 0
          ? studentProgress.reduce((sum, sp) => sum + (sp.progress_percentage || 0), 0) / studentProgress.length
          : 0;

        // At-risk criteria
        const isAtRisk = daysSinceActive > 7 || (!hasRecentActivity && avgProgress < 25);

        if (isAtRisk) {
          atRiskStudentsList.push({
            id: user.id,
            name: user.name,
            email: user.email,
            studentId: user.student_id,
            avatarUrl: user.avatar_url,
            lastActive: user.last_active,
            daysSinceActive,
            avgProgress: Math.round(avgProgress),
            reason: daysSinceActive > 7 ? "No activity in 7+ days" : "Low progress",
          });
        }
      }
    }

    // 8. Get per-class breakdown with course details
    const classAnalytics = await Promise.all(
      assignments.map(async (assignment) => {
        const cls = assignment.class as any;
        if (!cls) return null;

        // Students in this class
        const classEnrollments = enrollments?.filter(
          (e) => {
            // We need to check class enrollment separately
            return true; // Will filter by class in the query
          }
        );

        const { data: classStudents } = await supabase
          .from("class_enrollments")
          .select("user_id")
          .eq("class_id", cls.id)
          .eq("status", "active");

        const classStudentIds = classStudents?.map((s) => s.user_id) || [];
        const studentCount = classStudentIds.length;

        // Active in last 7 days
        const activeInClass = classStudentIds.filter((id) => activeStudentIds.has(id)).length;

        // Get courses assigned to this class
        const { data: classCourses } = await supabase
          .from("class_courses")
          .select(`
            id,
            course_id,
            semester,
            academic_year,
            is_active,
            course:courses (id, title, lessons_count, difficulty)
          `)
          .eq("class_id", cls.id)
          .eq("is_active", true);

        // Calculate avg progress for this class
        const classProgress = courseEnrollments?.filter(
          (ce) => classStudentIds.includes(ce.user_id)
        ) || [];
        
        const classAvgProgress = classProgress.length > 0
          ? Math.round(
              classProgress.reduce((sum, cp) => sum + (cp.progress_percentage || 0), 0) /
              classProgress.length
            )
          : 0;

        // At-risk in this class
        const atRiskInClass = atRiskStudentsList.filter((s) =>
          classStudentIds.includes(s.id)
        ).length;

        return {
          id: cls.id,
          name: cls.name,
          code: cls.code,
          yearLevel: cls.year_level,
          subject: assignment.subject,
          department: cls.department,
          organization: cls.organization,
          studentCount,
          activeStudents: activeInClass,
          avgProgress: classAvgProgress,
          atRiskCount: atRiskInClass,
          courses: classCourses?.map((cc) => ({
            id: cc.course_id,
            title: (cc.course as any)?.title,
            lessonsCount: (cc.course as any)?.lessons_count,
            difficulty: (cc.course as any)?.difficulty,
            semester: cc.semester,
            academicYear: cc.academic_year,
          })) || [],
        };
      })
    );

    // 9. Recent activity feed (last 10 activities)
    const { data: activityFeed } = await supabase
      .from("lesson_progress")
      .select(`
        id,
        completed,
        completed_at,
        user:users (id, name, avatar_url),
        lesson:lessons (id, title, course_id)
      `)
      .in("user_id", studentIds)
      .eq("completed", true)
      .order("completed_at", { ascending: false })
      .limit(10);

    const recentActivityFeed = activityFeed?.map((a) => ({
      id: a.id,
      type: "lesson_completed",
      user: a.user,
      lesson: a.lesson,
      timestamp: a.completed_at,
    })) || [];

    return NextResponse.json({
      overview: {
        totalClasses: classIds.length,
        totalStudents,
        activeStudents7d,
        atRiskStudents: atRiskStudentsList.length,
        avgCompletionRate,
        totalLearningHours,
        pendingHelpRequests: pendingHelpRequests || 0,
        lessonsCompletedToday,
      },
      classes: classAnalytics.filter(Boolean),
      recentActivity: recentActivityFeed,
      atRiskStudentsList: atRiskStudentsList.slice(0, 10),
    });
  } catch (error) {
    console.error("Error fetching teacher analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
