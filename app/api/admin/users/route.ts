import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to check admin access (admin or org_admin)
async function checkAdminAccess(session: any, organizationId?: string) {
  let userRole = (session.user as any).role;
  let userOrgId = (session.user as any).organizationId || (session.user as any).organization_id;

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
    return { allowed: true, role: userRole, isGlobalAdmin: true };
  }

  // Org admin can only access their organization
  if (userRole === "org_admin" || userRole === "hod") {
    if (organizationId && organizationId !== userOrgId) {
      return { allowed: false, role: userRole };
    }
    return { allowed: true, role: userRole, orgId: userOrgId, isGlobalAdmin: false };
  }

  return { allowed: false, role: userRole };
}

// GET: List all users with optional filters
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

    const role = req.nextUrl.searchParams.get("role");
    const unassigned = req.nextUrl.searchParams.get("unassigned") === "true";

    // Determine target organization
    const targetOrgId = organizationId || access.orgId;

    let query = supabase
      .from("users")
      .select(`
        *,
        organization:organizations(id, name, code),
        class:classes(id, name, code)
      `)
      .order("created_at", { ascending: false });

    // Filter by organization if org_admin or if org filter specified
    if (targetOrgId && !access.isGlobalAdmin) {
      query = query.eq("organization_id", targetOrgId);
    } else if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    if (role) {
      query = query.eq("role", role);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // If unassigned filter is requested, filter out students who have active registrations
    let filteredUsers = users || [];
    if (unassigned && role === "student") {
      const { data: registrations } = await supabase
        .from("student_registrations")
        .select("student_id")
        .eq("status", "active");

      const registeredIds = new Set((registrations || []).map(r => r.student_id));
      filteredUsers = filteredUsers.filter(u => !registeredIds.has(u.id));
    }

    return NextResponse.json({ users: filteredUsers, success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete user
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check role from session OR fetch from database
    let userRole = (session.user as any).role;
    
    if (!userRole) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("email", session.user.email)
        .single();
      
      userRole = userData?.role;
    }

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json(
        { error: "Failed to delete user" },
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
