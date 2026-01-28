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
    if (!session?.user?.email) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    // Check if user is teacher
    const { data: teacherUser } = await supabase
      .from("users")
      .select("role, id")
      .eq("email", session.user.email)
      .single();

    if (teacherUser?.role !== "teacher" && teacherUser?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // Get teacher's assigned classes
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("class_id")
      .eq("teacher_id", teacherUser.id);

    const classIds = assignments?.map(a => a.class_id) || [];

    // Fetch stats based on teacher's classes
    let totalStudents = 0;
    if (classIds.length > 0) {
      const { count } = await supabase
        .from("class_enrollments")
        .select("*", { count: "exact", head: true })
        .in("class_id", classIds)
        .eq("status", "active");
      totalStudents = count || 0;
    }

    const stats = {
      totalStudents,
      activeCourses: classIds.length,
      totalLessons: 0, // Will be calculated based on courses
      avgProgress: 0, // Will be calculated based on lesson progress
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching teacher stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
