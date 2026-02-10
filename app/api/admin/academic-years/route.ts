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

  if (userRole === "admin") return { allowed: true, role: userRole };
  
  if (userRole === "org_admin") {
    if (organizationId && organizationId !== userOrgId) {
      return { allowed: false, role: userRole };
    }
    return { allowed: true, role: userRole, orgId: userOrgId };
  }
  
  return { allowed: false, role: userRole };
}

// GET: List academic years for an organization
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

    const targetOrgId = organizationId || access.orgId;

    if (!targetOrgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const { data: academicYears, error } = await supabase
      .from("academic_years")
      .select(`
        *,
        organization:organizations(id, name, code)
      `)
      .eq("organization_id", targetOrgId)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Error fetching academic years:", error);
      return NextResponse.json(
        { error: "Failed to fetch academic years" },
        { status: 500 }
      );
    }

    return NextResponse.json({ academicYears: academicYears || [] });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create new academic year
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { organization_id, name, start_date, end_date, is_current } = body;

    const access = await checkAdminAccess(session, organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    if (!organization_id || !name || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Organization ID, name, start date, and end date are required" },
        { status: 400 }
      );
    }

    // If setting as current, unset all others for this org
    if (is_current) {
      await supabase
        .from("academic_years")
        .update({ is_current: false })
        .eq("organization_id", organization_id);
    }

    const { data: academicYear, error } = await supabase
      .from("academic_years")
      .insert({
        organization_id,
        name,
        start_date,
        end_date,
        is_current: is_current || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating academic year:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Academic year name already exists for this organization" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create academic year" },
        { status: 500 }
      );
    }

    return NextResponse.json({ academicYear, success: true }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update academic year
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Academic year ID required" }, { status: 400 });
    }

    const body = await req.json();
    const { name, start_date, end_date, is_current } = body;

    // Get academic year to check organization
    const { data: existing } = await supabase
      .from("academic_years")
      .select("organization_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
    }

    const access = await checkAdminAccess(session, existing.organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // If setting as current, unset all others for this org
    if (is_current) {
      await supabase
        .from("academic_years")
        .update({ is_current: false })
        .eq("organization_id", existing.organization_id);
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (start_date) updateData.start_date = start_date;
    if (end_date) updateData.end_date = end_date;
    if (is_current !== undefined) updateData.is_current = is_current;

    const { data: academicYear, error } = await supabase
      .from("academic_years")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating academic year:", error);
      return NextResponse.json(
        { error: "Failed to update academic year" },
        { status: 500 }
      );
    }

    return NextResponse.json({ academicYear, success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete academic year
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Academic year ID required" }, { status: 400 });
    }

    // Get academic year to check organization
    const { data: existing } = await supabase
      .from("academic_years")
      .select("organization_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
    }

    const access = await checkAdminAccess(session, existing.organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { error } = await supabase
      .from("academic_years")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting academic year:", error);
      return NextResponse.json(
        { error: "Failed to delete academic year. It may have associated semesters." },
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
