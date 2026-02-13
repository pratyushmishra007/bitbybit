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

// GET - List departments in organization
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

    const { data: departments, error } = await supabase
      .from("departments")
      .select(`
        id,
        name,
        code,
        description,
        head_of_department:users!departments_head_of_department_fkey(id, name, email)
      `)
      .eq("organization_id", organizationId)
      .order("name");

    if (error) {
      console.error("Error fetching departments:", error);
      return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
    }

    // Get teacher and student counts for each department
    const departmentsWithCounts = await Promise.all(
      (departments || []).map(async (dept: any) => {
        const [teacherCount, studentCount] = await Promise.all([
          supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("department_id", dept.id)
            .eq("role", "teacher"),
          supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("department_id", dept.id)
            .eq("role", "student"),
        ]);

        return {
          ...dept,
          teacherCount: teacherCount.count || 0,
          studentCount: studentCount.count || 0,
        };
      })
    );

    return NextResponse.json({ departments: departmentsWithCounts });
  } catch (error) {
    console.error("Error in org-admin departments API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new department
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
    const { name, code, description, headOfDepartmentId } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Check if code already exists in this organization
    const { data: existing } = await supabase
      .from("departments")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("code", code)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A department with this code already exists" },
        { status: 400 }
      );
    }

    const { data: newDept, error } = await supabase
      .from("departments")
      .insert({
        name,
        code,
        description,
        organization_id: organizationId,
        head_of_department: headOfDepartmentId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating department:", error);
      return NextResponse.json(
        { error: "Failed to create department" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Department created successfully",
      department: newDept,
    });
  } catch (error) {
    console.error("Error in org-admin departments POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
