import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to verify org_admin access
async function getOrgAdminContext(email: string) {
  const { data: user, error } = await supabase
    .from("users")
    .select("id, role, organization_id")
    .eq("email", email)
    .single();

  if (error || !user) {
    return { error: "User not found", status: 404 };
  }

  if (user.role !== "org_admin") {
    return { error: "Access denied", status: 403 };
  }

  if (!user.organization_id) {
    return { error: "No organization assigned", status: 400 };
  }

  return { userId: user.id, organizationId: user.organization_id };
}

// GET - Analytics data for organization
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const context = await getOrgAdminContext(session.user.email);
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const { organizationId } = context;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";

    // Calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const periodStart = period === "7d" ? sevenDaysAgo : period === "30d" ? thirtyDaysAgo : ninetyDaysAgo;

    // Fetch all data in parallel
    const [
      totalUsersResult,
      activeUsersToday,
      activeUsers7d,
      activeUsers30d,
      lessonsCompletedResult,
      totalXpResult,
      progressResult,
      departmentsResult,
      classesResult,
      activityResult,
    ] = await Promise.all([
      // Total users
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("account_status", "approved"),

      // Active today
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("account_status", "approved")
        .gte("last_login", today.toISOString()),

      // Active 7 days
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("account_status", "approved")
        .gte("last_login", sevenDaysAgo.toISOString()),

      // Active 30 days
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("account_status", "approved")
        .gte("last_login", thirtyDaysAgo.toISOString()),

      // Lessons completed total
      supabase
        .from("lesson_progress")
        .select("id, user:users!inner(organization_id)", { count: "exact", head: true })
        .eq("user.organization_id", organizationId)
        .eq("completed", true),

      // Total XP
      supabase
        .from("users")
        .select("xp")
        .eq("organization_id", organizationId)
        .eq("account_status", "approved"),

      // Average progress
      supabase
        .from("course_enrollments")
        .select("progress_percentage, user:users!inner(organization_id)")
        .eq("user.organization_id", organizationId),

      // Departments
      supabase
        .from("departments")
        .select("id, name")
        .eq("organization_id", organizationId),

      // Classes
      supabase
        .from("classes")
        .select("id, name")
        .eq("organization_id", organizationId),

      // Daily activity (lesson completions)
      supabase
        .from("lesson_progress")
        .select("completed_at, user:users!inner(organization_id)")
        .eq("user.organization_id", organizationId)
        .eq("completed", true)
        .gte("completed_at", periodStart.toISOString())
        .order("completed_at", { ascending: true }),
    ]);

    // Calculate average completion rate
    let avgCompletionRate = 0;
    if (progressResult.data && progressResult.data.length > 0) {
      const total = progressResult.data.reduce(
        (sum: number, e: any) => sum + (e.progress_percentage || 0),
        0
      );
      avgCompletionRate = Math.round(total / progressResult.data.length);
    }

    // Calculate total XP
    const totalXpEarned = totalXpResult.data?.reduce((sum: number, u: any) => sum + (u.xp || 0), 0) || 0;

    // Calculate department stats
    const departmentStats = await Promise.all(
      (departmentsResult.data || []).map(async (dept: any) => {
        const [students, teachers, progress, lessons] = await Promise.all([
          supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("department_id", dept.id)
            .eq("role", "student"),
          supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("department_id", dept.id)
            .eq("role", "teacher"),
          supabase
            .from("course_enrollments")
            .select("progress_percentage, user:users!inner(department_id)")
            .eq("user.department_id", dept.id),
          supabase
            .from("lesson_progress")
            .select("id, user:users!inner(department_id)", { count: "exact", head: true })
            .eq("user.department_id", dept.id)
            .eq("completed", true),
        ]);

        const avgProgress = progress.data && progress.data.length > 0
          ? Math.round(progress.data.reduce((s: number, e: any) => s + (e.progress_percentage || 0), 0) / progress.data.length)
          : 0;

        return {
          id: dept.id,
          name: dept.name,
          students: students.count || 0,
          teachers: teachers.count || 0,
          avgProgress,
          lessonsCompleted: lessons.count || 0,
        };
      })
    );

    // Calculate class stats
    const classStats = await Promise.all(
      (classesResult.data || []).map(async (cls: any) => {
        // Get students in class
        const { data: enrollments } = await supabase
          .from("class_enrollments")
          .select("user_id")
          .eq("class_id", cls.id)
          .eq("status", "active");

        const studentIds = enrollments?.map((e: any) => e.user_id) || [];

        if (studentIds.length === 0) {
          return {
            id: cls.id,
            name: cls.name,
            students: 0,
            avgProgress: 0,
            atRiskCount: 0,
            topStudent: null,
          };
        }

        // Get progress and at-risk students
        const [progressData, atRisk, topStudent] = await Promise.all([
          supabase
            .from("course_enrollments")
            .select("progress_percentage")
            .in("user_id", studentIds),
          supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .in("id", studentIds)
            .lt("last_login", sevenDaysAgo.toISOString()),
          supabase
            .from("users")
            .select("name, xp")
            .in("id", studentIds)
            .order("xp", { ascending: false })
            .limit(1)
            .single(),
        ]);

        const avgProgress = progressData.data && progressData.data.length > 0
          ? Math.round(progressData.data.reduce((s: number, e: any) => s + (e.progress_percentage || 0), 0) / progressData.data.length)
          : 0;

        return {
          id: cls.id,
          name: cls.name,
          students: studentIds.length,
          avgProgress,
          atRiskCount: atRisk.count || 0,
          topStudent: topStudent.data ? { name: topStudent.data.name, xp: topStudent.data.xp } : null,
        };
      })
    );

    // Build activity trend
    const activityMap = new Map<string, { activeUsers: Set<string>; lessonsCompleted: number }>();
    (activityResult.data || []).forEach((record: any) => {
      const date = new Date(record.completed_at).toISOString().split("T")[0];
      if (!activityMap.has(date)) {
        activityMap.set(date, { activeUsers: new Set(), lessonsCompleted: 0 });
      }
      const entry = activityMap.get(date)!;
      entry.lessonsCompleted++;
    });

    const activityTrend = Array.from(activityMap.entries())
      .map(([date, data]) => ({
        date,
        activeUsers: data.activeUsers.size,
        lessonsCompleted: data.lessonsCompleted,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      overview: {
        totalUsers: totalUsersResult.count || 0,
        activeUsersToday: activeUsersToday.count || 0,
        activeUsers7d: activeUsers7d.count || 0,
        activeUsers30d: activeUsers30d.count || 0,
        totalLessonsCompleted: lessonsCompletedResult.count || 0,
        avgCompletionRate,
        totalXpEarned,
        avgTimePerLesson: 15, // Placeholder - would need actual tracking
      },
      departmentStats,
      classStats: classStats.sort((a, b) => b.students - a.students),
      activityTrend,
    });
  } catch (error) {
    console.error("Error in org-admin analytics API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
