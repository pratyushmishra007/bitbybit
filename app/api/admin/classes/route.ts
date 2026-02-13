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

// GET: List all classes with enrollments count
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = req.nextUrl.searchParams.get("organizationId");
    const access = await checkAdminAccess(session, organizationId || undefined);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    let query = supabase
      .from("classes")
      .select(`
        *,
        organization:organizations(id, name, code),
        department:departments(id, name, code),
        semester:semesters(id, name, semester_number)
      `)
      .order("created_at", { ascending: false });

    // Filter by organization for org_admin
    const targetOrgId = organizationId || access.orgId;
    if (targetOrgId && !access.isGlobalAdmin) {
      query = query.eq("organization_id", targetOrgId);
    } else if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data: classes, error } = await query;

    if (error) {
      console.error("Error fetching classes:", error);
      return NextResponse.json(
        { error: "Failed to fetch classes" },
        { status: 500 }
      );
    }

    // Get enrollment counts for each class
    const classesWithCounts = await Promise.all(
      (classes || []).map(async (cls) => {
        const { count } = await supabase
          .from("class_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("class_id", cls.id)
          .eq("status", "active");

        return {
          ...cls,
          _count: { enrollments: count || 0 },
        };
      })
    );

    return NextResponse.json({ classes: classesWithCounts });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create new class
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      code,
      organization_id,
      department_id,
      year_level,
      capacity,
      description,
    } = body;

    const access = await checkAdminAccess(session, organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    if (!name || !code || !organization_id || !year_level || !capacity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data: classData, error } = await supabase
      .from("classes")
      .insert({
        name,
        code: code.toUpperCase(),
        organization_id,
        department_id: department_id || null,
        year_level,
        capacity,
        description,
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

    return NextResponse.json({ class: classData });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update class
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role from session or database
    let userRole = (session.user as any).role;
    if (!userRole) {
      const { data: user } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();
      userRole = user?.role;
    }

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    const body = await req.json();
    const { name, department_id, year_level, capacity, description } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 }
      );
    }

    const { data: classData, error } = await supabase
      .from("classes")
      .update({
        name,
        department_id: department_id || null,
        year_level,
        capacity,
        description,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating class:", error);
      return NextResponse.json(
        { error: "Failed to update class" },
        { status: 500 }
      );
    }

    return NextResponse.json({ class: classData });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete class
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
        .eq("id", session.user.id)
        .single();
      
      userRole = userData?.role;
    }

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("classes").delete().eq("id", id);

    if (error) {
      console.error("Error deleting class:", error);
      return NextResponse.json(
        { error: "Failed to delete class" },
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
