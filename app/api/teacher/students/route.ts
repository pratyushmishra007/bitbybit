import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List all students in a class
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check role from session or database
    let userRole = (session.user as any).role;
    if (!userRole && session?.user?.id) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();
      userRole = userData?.role;
    }

    if (!session?.user || (userRole !== "teacher" && userRole !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classId = req.nextUrl.searchParams.get("classId");

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 }
      );
    }

    // Verify teacher has access to this class
    const teacherId = (session.user as any).id;
    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("class_id", classId)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: "You don't have access to this class" },
        { status: 403 }
      );
    }

    // Get students in this class
    const { data: enrollments, error } = await supabase
      .from("class_enrollments")
      .select(`
        user:users(
          id,
          name,
          email,
          student_id
        )
      `)
      .eq("class_id", classId)
      .eq("status", "active");

    if (error) {
      console.error("Error fetching students:", error);
      return NextResponse.json(
        { error: "Failed to fetch students" },
        { status: 500 }
      );
    }

    // For now, mark all students as offline (will be updated with real-time later)
    const students = (enrollments || []).map((enrollment: any) => ({
      ...enrollment.user,
      is_online: false,
      last_seen: null,
    }));

    return NextResponse.json({ students });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
