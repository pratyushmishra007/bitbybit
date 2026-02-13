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

  if (userRole === "admin" || userRole === "platform_admin") {
    return { allowed: true, role: userRole, isGlobalAdmin: true };
  }

  if (userRole === "org_admin" || userRole === "hod") {
    if (organizationId && organizationId !== userOrgId) {
      return { allowed: false, role: userRole };
    }
    return { allowed: true, role: userRole, orgId: userOrgId, isGlobalAdmin: false };
  }

  return { allowed: false, role: userRole };
}

// GET: List all teacher assignments
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = req.nextUrl.searchParams.get("organizationId");
    const access = await checkAdminAccess(session, organizationId || undefined);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    let query = supabase
      .from("teacher_assignments")
      .select(`
        *,
        teacher:users!teacher_id(id, name, email),
        class:classes(id, name, code, organization_id, organization:organizations(name))
      `)
      .order("assigned_at", { ascending: false });

    const { data: assignments, error } = await query;

    if (error) {
      console.error("Error fetching assignments:", error);
      return NextResponse.json(
        { error: "Failed to fetch assignments" },
        { status: 500 }
      );
    }

    // Filter by organization for org_admin
    let filteredAssignments = assignments || [];
    const targetOrgId = organizationId || access.orgId;
    if (targetOrgId && !access.isGlobalAdmin) {
      filteredAssignments = filteredAssignments.filter(
        (a: any) => a.class?.organization_id === targetOrgId
      );
    }

    return NextResponse.json({ assignments: filteredAssignments });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create teacher assignment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { teacher_id, class_id, subject, organization_id } = body;

    if (!teacher_id || !class_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get class to verify organization
    const { data: classData } = await supabase
      .from("classes")
      .select("organization_id")
      .eq("id", class_id)
      .single();

    const access = await checkAdminAccess(session, classData?.organization_id || organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { data: assignment, error } = await supabase
      .from("teacher_assignments")
      .insert({
        teacher_id,
        class_id,
        subject,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating assignment:", error);
      return NextResponse.json(
        { error: "Failed to create assignment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete assignment
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    // Get assignment to check organization
    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("id, class:classes(organization_id)")
      .eq("id", id)
      .single();

    const access = await checkAdminAccess(session, (assignment?.class as any)?.organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { error } = await supabase
      .from("teacher_assignments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting assignment:", error);
      return NextResponse.json(
        { error: "Failed to delete assignment" },
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