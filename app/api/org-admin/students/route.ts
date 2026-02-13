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

// GET - List students in organization
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const classId = searchParams.get("classId");
    const status = searchParams.get("status"); // active, inactive

    const offset = (page - 1) * limit;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Build query
    let query = supabase
      .from("users")
      .select(`
        id,
        name,
        email,
        student_id,
        avatar_url,
        xp,
        level,
        lessons_completed,
        last_login
      `, { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("role", "student")
      .eq("account_status", "approved")
      .order("name")
      .range(offset, offset + limit - 1);

    // Activity filter
    if (status === "active") {
      query = query.gte("last_login", sevenDaysAgo.toISOString());
    } else if (status === "inactive") {
      query = query.or(`last_login.lt.${sevenDaysAgo.toISOString()},last_login.is.null`);
    }

    const { data: students, error, count } = await query;

    if (error) {
      console.error("Error fetching students:", error);
      return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }

    // Get class enrollments for each student
    const studentsWithDetails = await Promise.all(
      (students || []).map(async (student: any) => {
        // Get class enrollment
        const { data: enrollment } = await supabase
          .from("class_enrollments")
          .select(`
            class:classes(id, name, code)
          `)
          .eq("user_id", student.id)
          .eq("status", "active")
          .single();

        // Get the first class from array (Supabase nested selects return arrays)
        const studentClass = Array.isArray(enrollment?.class) 
          ? enrollment.class[0] 
          : enrollment?.class;

        // If filtering by class, skip students not in that class
        if (classId && studentClass?.id !== classId) {
          return null;
        }

        // Get average progress
        const { data: courseEnrollments } = await supabase
          .from("course_enrollments")
          .select("progress_percentage")
          .eq("user_id", student.id);

        const avgProgress = courseEnrollments && courseEnrollments.length > 0
          ? Math.round(
              courseEnrollments.reduce((sum: number, e: any) => sum + (e.progress_percentage || 0), 0) /
              courseEnrollments.length
            )
          : 0;

        return {
          id: student.id,
          name: student.name,
          email: student.email,
          studentId: student.student_id,
          avatarUrl: student.avatar_url,
          className: studentClass?.name || null,
          classId: studentClass?.id || null,
          xp: student.xp || 0,
          level: student.level || 1,
          lessonsCompleted: student.lessons_completed || 0,
          lastActive: student.last_login,
          progress: avgProgress,
        };
      })
    );

    // Filter out nulls (from class filter)
    const filteredStudents = studentsWithDetails.filter(Boolean);
    const totalCount = classId ? filteredStudents.length : (count || 0);

    return NextResponse.json({
      students: filteredStudents,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Error in org-admin students API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
