import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to verify org_admin access and get org_id
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

// GET - Dashboard statistics
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
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch all stats in parallel
    const [
      teachersResult,
      studentsResult,
      activeStudentsResult,
      departmentsResult,
      classesResult,
      pendingApprovalsResult,
      progressResult,
      topPerformersResult,
      recentActivityResult,
    ] = await Promise.all([
      // Total teachers
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("role", "teacher")
        .eq("account_status", "approved"),

      // Total students
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("role", "student")
        .eq("account_status", "approved"),

      // Active students (7 days)
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("role", "student")
        .eq("account_status", "approved")
        .gte("last_login", sevenDaysAgo.toISOString()),

      // Departments
      supabase
        .from("departments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),

      // Classes
      supabase
        .from("classes")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),

      // Pending approvals
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("account_status", "pending"),

      // Average progress (from course enrollments)
      supabase
        .from("course_enrollments")
        .select("progress_percentage, user:users!inner(organization_id)")
        .eq("user.organization_id", organizationId),

      // Top performing students
      supabase
        .from("users")
        .select(`
          id,
          name,
          email,
          avatar_url,
          xp,
          lessons_completed
        `)
        .eq("organization_id", organizationId)
        .eq("role", "student")
        .eq("account_status", "approved")
        .order("xp", { ascending: false })
        .limit(5),

      // Recent activity (lesson completions)
      supabase
        .from("lesson_progress")
        .select(`
          id,
          completed_at,
          user:users!inner(id, name, avatar_url, organization_id),
          lesson:lessons(id, title, course_id)
        `)
        .eq("user.organization_id", organizationId)
        .eq("completed", true)
        .order("completed_at", { ascending: false })
        .limit(10),
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

    // Calculate at-risk students (< 25% progress and not active)
    const atRiskStudentsResult = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "student")
      .eq("account_status", "approved")
      .lt("last_login", sevenDaysAgo.toISOString());

    // Format top performers
    const topPerformers = (topPerformersResult.data || []).map((s: any) => ({
      id: s.id,
      name: s.name || "Unknown",
      email: s.email,
      avatar: s.avatar_url,
      score: s.xp || 0,
      completedLessons: s.lessons_completed || 0,
    }));

    // Format recent activity
    const recentActivity = (recentActivityResult.data || [])
      .filter((a: any) => a.user && a.lesson)
      .slice(0, 5)
      .map((a: any) => ({
        id: a.id,
        type: "completion" as const,
        user: {
          name: a.user?.name || "Unknown",
          email: "",
          avatar: a.user?.avatar_url,
        },
        description: `completed "${a.lesson?.title || "a lesson"}"`,
        timestamp: a.completed_at,
      }));

    // Fetch new signups for activity
    const { data: newSignups } = await supabase
      .from("users")
      .select("id, name, email, avatar_url, created_at")
      .eq("organization_id", organizationId)
      .eq("role", "student")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    // Add signups to activity
    const signupActivity = (newSignups || []).map((u: any) => ({
      id: `signup-${u.id}`,
      type: "signup" as const,
      user: {
        name: u.name || u.email,
        email: u.email,
        avatar: u.avatar_url,
      },
      description: "joined the platform",
      timestamp: u.created_at,
    }));

    // Combine and sort activities
    const allActivity = [...recentActivity, ...signupActivity]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    const stats = {
      totalTeachers: teachersResult.count || 0,
      totalStudents: studentsResult.count || 0,
      activeStudents7d: activeStudentsResult.count || 0,
      totalDepartments: departmentsResult.count || 0,
      totalClasses: classesResult.count || 0,
      pendingApprovals: pendingApprovalsResult.count || 0,
      avgCompletionRate,
      atRiskStudents: atRiskStudentsResult.count || 0,
    };

    return NextResponse.json({
      stats,
      topPerformers,
      recentActivity: allActivity,
    });
  } catch (error) {
    console.error("Error in org-admin dashboard API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
