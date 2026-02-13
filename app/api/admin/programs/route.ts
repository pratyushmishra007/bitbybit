import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to check admin access
async function checkAdminAccess(session: any, organizationId?: string) {
  let userRole = (session.user as any).role;
  let userOrgId = (session.user as any).organizationId;

  if (!userRole) {
    const { data: userData } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", session.user.id)
      .single();

    userRole = userData?.role;
    userOrgId = userData?.organization_id;
  }

  // Platform admin can access all
  if (userRole === "admin" || userRole === "platform_admin") {
    return { allowed: true, role: userRole };
  }

  // Org admin can only access their organization
  if (userRole === "org_admin") {
    if (organizationId && organizationId !== userOrgId) {
      return { allowed: false, role: userRole };
    }
    return { allowed: true, role: userRole, orgId: userOrgId };
  }

  return { allowed: false, role: userRole };
}

// GET: List programs for an organization
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const organizationId = req.nextUrl.searchParams.get("organizationId");
    const departmentId = req.nextUrl.searchParams.get("departmentId");
    const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true";

    const access = await checkAdminAccess(session, organizationId || undefined);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // If org_admin and no orgId specified, use their org
    const targetOrgId = organizationId || access.orgId;

    if (!targetOrgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("programs")
      .select(`
        *,
        organization:organizations(id, name, code),
        department:departments(id, name, code)
      `)
      .eq("organization_id", targetOrgId)
      .order("name", { ascending: true });

    // Filter by department if provided
    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: programs, error } = await query;

    if (error) {
      console.error("Error fetching programs:", error);
      return NextResponse.json(
        { error: "Failed to fetch programs" },
        { status: 500 }
      );
    }

    return NextResponse.json({ programs: programs || [] });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create new program
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const {
      organization_id,
      department_id,
      name,
      code,
      short_name,
      duration_years,
      total_semesters,
      degree_type,
    } = body;

    const access = await checkAdminAccess(session, organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    if (!organization_id || !name || !code) {
      return NextResponse.json(
        { error: "Organization ID, name, and code are required" },
        { status: 400 }
      );
    }

    // Check if program code already exists for this org
    const { data: existing } = await supabase
      .from("programs")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("code", code.toUpperCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A program with this code already exists in this organization" },
        { status: 400 }
      );
    }

    // Verify department belongs to organization if provided
    if (department_id) {
      const { data: dept } = await supabase
        .from("departments")
        .select("id")
        .eq("id", department_id)
        .eq("organization_id", organization_id)
        .single();

      if (!dept) {
        return NextResponse.json(
          { error: "Department not found or does not belong to this organization" },
          { status: 400 }
        );
      }
    }

    const { data: program, error } = await supabase
      .from("programs")
      .insert({
        organization_id,
        department_id: department_id || null,
        name,
        code: code.toUpperCase(),
        short_name,
        duration_years: duration_years || 4,
        total_semesters: total_semesters || 8,
        degree_type: degree_type || "undergraduate",
        is_active: true,
      })
      .select(`
        *,
        department:departments(id, name, code)
      `)
      .single();

    if (error) {
      console.error("Error creating program:", error);
      return NextResponse.json(
        { error: "Failed to create program" },
        { status: 500 }
      );
    }

    return NextResponse.json({ program }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update program
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      department_id,
      name,
      code,
      short_name,
      duration_years,
      total_semesters,
      degree_type,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Program ID is required" },
        { status: 400 }
      );
    }

    // Get the program to check organization
    const { data: existingProgram } = await supabase
      .from("programs")
      .select("organization_id")
      .eq("id", id)
      .single();

    if (!existingProgram) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const access = await checkAdminAccess(session, existingProgram.organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Check for code uniqueness if code is being changed
    if (code) {
      const { data: codeExists } = await supabase
        .from("programs")
        .select("id")
        .eq("organization_id", existingProgram.organization_id)
        .eq("code", code.toUpperCase())
        .neq("id", id)
        .single();

      if (codeExists) {
        return NextResponse.json(
          { error: "A program with this code already exists" },
          { status: 400 }
        );
      }
    }

    // Verify department if being changed
    if (department_id !== undefined && department_id !== null) {
      const { data: dept } = await supabase
        .from("departments")
        .select("id")
        .eq("id", department_id)
        .eq("organization_id", existingProgram.organization_id)
        .single();

      if (!dept) {
        return NextResponse.json(
          { error: "Department not found or does not belong to this organization" },
          { status: 400 }
        );
      }
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (department_id !== undefined) updateData.department_id = department_id;
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (short_name !== undefined) updateData.short_name = short_name;
    if (duration_years !== undefined) updateData.duration_years = duration_years;
    if (total_semesters !== undefined) updateData.total_semesters = total_semesters;
    if (degree_type !== undefined) updateData.degree_type = degree_type;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: program, error } = await supabase
      .from("programs")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        department:departments(id, name, code)
      `)
      .single();

    if (error) {
      console.error("Error updating program:", error);
      return NextResponse.json(
        { error: "Failed to update program" },
        { status: 500 }
      );
    }

    return NextResponse.json({ program });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete program (soft delete by setting is_active = false)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const programId = req.nextUrl.searchParams.get("id");

    if (!programId) {
      return NextResponse.json(
        { error: "Program ID is required" },
        { status: 400 }
      );
    }

    // Get the program to check organization
    const { data: existingProgram } = await supabase
      .from("programs")
      .select("organization_id")
      .eq("id", programId)
      .single();

    if (!existingProgram) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const access = await checkAdminAccess(session, existingProgram.organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Soft delete
    const { error } = await supabase
      .from("programs")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", programId);

    if (error) {
      console.error("Error deleting program:", error);
      return NextResponse.json(
        { error: "Failed to delete program" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Program deactivated" });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
