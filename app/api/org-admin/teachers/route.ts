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

// GET - List all teachers in organization
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

    // Get teachers with their department and class counts
    const { data: teachers, error } = await supabase
      .from("users")
      .select(`
        id,
        name,
        email,
        avatar_url,
        department_id,
        created_at,
        last_login,
        department:departments(id, name, code)
      `)
      .eq("organization_id", organizationId)
      .eq("role", "teacher")
      .eq("account_status", "approved")
      .order("name");

    if (error) {
      console.error("Error fetching teachers:", error);
      return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 });
    }

    // Get class assignments and student counts for each teacher
    const teachersWithCounts = await Promise.all(
      (teachers || []).map(async (teacher: any) => {
        // Get assigned classes
        const { data: assignments } = await supabase
          .from("teacher_assignments")
          .select("class_id")
          .eq("teacher_id", teacher.id);

        const classIds = assignments?.map((a: any) => a.class_id) || [];

        // Get total students in assigned classes
        let totalStudents = 0;
        if (classIds.length > 0) {
          const { count } = await supabase
            .from("class_enrollments")
            .select("id", { count: "exact", head: true })
            .in("class_id", classIds)
            .eq("status", "active");
          totalStudents = count || 0;
        }

        return {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          avatarUrl: teacher.avatar_url,
          department: teacher.department,
          assignedClasses: classIds.length,
          totalStudents,
          createdAt: teacher.created_at,
          lastLogin: teacher.last_login,
        };
      })
    );

    return NextResponse.json({ teachers: teachersWithCounts });
  } catch (error) {
    console.error("Error in org-admin teachers API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new teacher
export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const { name, email, departmentId } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Create the teacher user
    const { data: newTeacher, error } = await supabase
      .from("users")
      .insert({
        name,
        email,
        role: "teacher",
        organization_id: organizationId,
        department_id: departmentId || null,
        account_status: "approved", // Auto-approved when created by org admin
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating teacher:", error);
      return NextResponse.json(
        { error: "Failed to create teacher" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Teacher created successfully",
      teacher: newTeacher,
    });
  } catch (error) {
    console.error("Error in org-admin teachers POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
