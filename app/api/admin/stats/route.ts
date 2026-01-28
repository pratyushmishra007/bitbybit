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
      return NextResponse.json({ success: false }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from("users")
      .select("role")
      .eq("email", session.user.email)
      .single();

    if (adminUser?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // Fetch comprehensive stats
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalSharedCode },
      { count: totalContests },
      { count: studentsCount },
      { count: teachersCount },
      { count: totalLessons },
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("shared_code").select("*", { count: "exact", head: true }),
      supabase.from("contests").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "teacher"),
      supabase.from("lesson_progress").select("*", { count: "exact", head: true }),
    ]);

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalCourses: 3, // Hardcoded for now - you can make this dynamic
      totalLessons: totalLessons || 0,
      totalSharedCode: totalSharedCode || 0,
      totalContests: totalContests || 0,
      studentsCount: studentsCount || 0,
      teachersCount: teachersCount || 0,
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
