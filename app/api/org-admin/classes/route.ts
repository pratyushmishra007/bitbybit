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

// GET - List classes in organization
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

    const { data: classes, error } = await supabase
      .from("classes")
      .select(`
        id,
        name,
        code,
        year_level,
        subject,
        department:departments(id, name, code)
      `)
      .eq("organization_id", organizationId)
      .order("name");

    if (error) {
      console.error("Error fetching classes:", error);
      return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
    }

    // Get student and teacher counts for each class
    const classesWithCounts = await Promise.all(
      (classes || []).map(async (cls: any) => {
        const [studentCount, teacherAssignments] = await Promise.all([
          supabase
            .from("class_enrollments")
            .select("id", { count: "exact", head: true })
            .eq("class_id", cls.id)
            .eq("status", "active"),
          supabase
            .from("teacher_assignments")
            .select(`
              teacher:users(id, name, email)
            `)
            .eq("class_id", cls.id),
        ]);

        return {
          id: cls.id,
          name: cls.name,
          code: cls.code,
          yearLevel: cls.year_level,
          subject: cls.subject,
          department: cls.department,
          studentCount: studentCount.count || 0,
          teachers: teacherAssignments.data?.map((a: any) => a.teacher).filter(Boolean) || [],
        };
      })
    );

    return NextResponse.json({ classes: classesWithCounts });
  } catch (error) {
    console.error("Error in org-admin classes API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new class
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
    const { name, code, yearLevel, subject, departmentId } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const { data: existing } = await supabase
      .from("classes")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("code", code)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A class with this code already exists" },
        { status: 400 }
      );
    }

    const { data: newClass, error } = await supabase
      .from("classes")
      .insert({
        name,
        code,
        year_level: yearLevel || 1,
        subject,
        organization_id: organizationId,
        department_id: departmentId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating class:", error);
      return NextResponse.json(
        { error: "Failed to create class" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Class created successfully",
      class: newClass,
    });
  } catch (error) {
    console.error("Error in org-admin classes POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
