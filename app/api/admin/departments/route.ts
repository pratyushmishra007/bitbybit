import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to check admin or org_admin role
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
  if (userRole === "admin") return { allowed: true, role: userRole };
  
  // Org admin can only access their organization
  if (userRole === "org_admin") {
    if (organizationId && organizationId !== userOrgId) {
      return { allowed: false, role: userRole };
    }
    return { allowed: true, role: userRole, orgId: userOrgId };
  }
  
  return { allowed: false, role: userRole };
}

// GET: List departments for an organization
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const organizationId = req.nextUrl.searchParams.get("organizationId");
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

    const { data: departments, error } = await supabase
      .from("departments")
      .select(`
        *,
        organization:organizations(id, name, code),
        head:users!departments_head_id_fkey(id, name, email)
      `)
      .eq("organization_id", targetOrgId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching departments:", error);
      return NextResponse.json(
        { error: "Failed to fetch departments" },
        { status: 500 }
      );
    }

    return NextResponse.json({ departments: departments || [] });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create new department
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { organization_id, name, code, description, head_id } = body;

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

    const { data: department, error } = await supabase
      .from("departments")
      .insert({
        organization_id,
        name,
        code: code.toUpperCase(),
        description,
        head_id: head_id || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating department:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Department code already exists in this organization" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create department" },
        { status: 500 }
      );
    }

    return NextResponse.json({ department, success: true }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update department
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Department ID required" }, { status: 400 });
    }

    const body = await req.json();
    const { name, code, description, head_id, is_active } = body;

    // Get department to check organization
    const { data: existing } = await supabase
      .from("departments")
      .select("organization_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const access = await checkAdminAccess(session, existing.organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (code) updateData.code = code.toUpperCase();
    if (description !== undefined) updateData.description = description;
    if (head_id !== undefined) updateData.head_id = head_id || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: department, error } = await supabase
      .from("departments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating department:", error);
      return NextResponse.json(
        { error: "Failed to update department" },
        { status: 500 }
      );
    }

    return NextResponse.json({ department, success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete department
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Department ID required" }, { status: 400 });
    }

    // Get department to check organization
    const { data: existing } = await supabase
      .from("departments")
      .select("organization_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const access = await checkAdminAccess(session, existing.organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { error } = await supabase
      .from("departments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting department:", error);
      return NextResponse.json(
        { error: "Failed to delete department. It may have associated classes." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
