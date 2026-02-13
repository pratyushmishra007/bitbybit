import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to check admin/HOD access
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

  // Org admin and HOD can access their organization
  if (userRole === "org_admin" || userRole === "hod") {
    if (organizationId && organizationId !== userOrgId) {
      return { allowed: false, role: userRole };
    }
    return { allowed: true, role: userRole, orgId: userOrgId };
  }

  return { allowed: false, role: userRole };
}

// GET: List student batches with filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const organizationId = req.nextUrl.searchParams.get("organizationId");
    const departmentId = req.nextUrl.searchParams.get("departmentId");
    const admissionYear = req.nextUrl.searchParams.get("admissionYear");
    const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true";

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

    let query = supabase
      .from("student_batches")
      .select(`
        *,
        organization:organizations(id, name, code),
        department:departments(id, name, code),
        program:programs(id, name, code, short_name)
      `)
      .eq("organization_id", targetOrgId)
      .order("admission_year", { ascending: false });

    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    if (admissionYear) {
      query = query.eq("admission_year", parseInt(admissionYear));
    }

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: batches, error } = await query;

    if (error) {
      console.error("Error fetching batches:", error);
      return NextResponse.json(
        { error: "Failed to fetch batches" },
        { status: 500 }
      );
    }

    // Get student counts for each batch
    const batchesWithCounts = await Promise.all(
      (batches || []).map(async (batch) => {
        const { count } = await supabase
          .from("student_registrations")
          .select("*", { count: "exact", head: true })
          .eq("batch_id", batch.id);
        
        return {
          ...batch,
          total_students: count || 0,
        };
      })
    );

    return NextResponse.json({ batches: batchesWithCounts });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create new student batch
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
      program_id,
      admission_year,
      name,
      expected_graduation,
    } = body;

    const access = await checkAdminAccess(session, organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Validation
    if (!organization_id || !department_id || !admission_year) {
      return NextResponse.json(
        { error: "Organization ID, department ID, and admission year are required" },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();
    if (admission_year < currentYear - 10 || admission_year > currentYear + 1) {
      return NextResponse.json(
        { error: "Invalid admission year" },
        { status: 400 }
      );
    }

    // Check if batch already exists for this department and year
    const { data: existing } = await supabase
      .from("student_batches")
      .select("id")
      .eq("department_id", department_id)
      .eq("admission_year", admission_year)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A batch for this department and admission year already exists" },
        { status: 400 }
      );
    }

    // Get department and program info for auto-generating name
    const { data: deptInfo } = await supabase
      .from("departments")
      .select("code, name")
      .eq("id", department_id)
      .single();

    let programInfo = null;
    if (program_id) {
      const { data } = await supabase
        .from("programs")
        .select("code, short_name, duration_years")
        .eq("id", program_id)
        .single();
      programInfo = data;
    }

    // Auto-generate name if not provided
    const batchName = name || 
      `${programInfo?.short_name || "Program"} ${deptInfo?.code || "DEPT"} ${admission_year}`;
    
    // Auto-calculate expected graduation if not provided
    const graduationYear = expected_graduation || 
      (admission_year + (programInfo?.duration_years || 4));

    const { data: batch, error } = await supabase
      .from("student_batches")
      .insert({
        organization_id,
        department_id,
        program_id,
        admission_year,
        name: batchName,
        expected_graduation: graduationYear,
        total_students: 0,
        is_active: true,
      })
      .select(`
        *,
        organization:organizations(id, name, code),
        department:departments(id, name, code),
        program:programs(id, name, code, short_name)
      `)
      .single();

    if (error) {
      console.error("Error creating batch:", error);
      return NextResponse.json(
        { error: "Failed to create batch" },
        { status: 500 }
      );
    }

    return NextResponse.json({ batch }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update batch
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, expected_graduation, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Batch ID is required" },
        { status: 400 }
      );
    }

    // Get the batch to check organization
    const { data: existingBatch } = await supabase
      .from("student_batches")
      .select("organization_id")
      .eq("id", id)
      .single();

    if (!existingBatch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const access = await checkAdminAccess(session, existingBatch.organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (expected_graduation !== undefined) updateData.expected_graduation = expected_graduation;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: batch, error } = await supabase
      .from("student_batches")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        organization:organizations(id, name, code),
        department:departments(id, name, code),
        program:programs(id, name, code, short_name)
      `)
      .single();

    if (error) {
      console.error("Error updating batch:", error);
      return NextResponse.json(
        { error: "Failed to update batch" },
        { status: 500 }
      );
    }

    return NextResponse.json({ batch });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Soft delete batch
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const batchId = req.nextUrl.searchParams.get("id");

    if (!batchId) {
      return NextResponse.json(
        { error: "Batch ID is required" },
        { status: 400 }
      );
    }

    // Get the batch to check organization
    const { data: existingBatch } = await supabase
      .from("student_batches")
      .select("organization_id")
      .eq("id", batchId)
      .single();

    if (!existingBatch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const access = await checkAdminAccess(session, existingBatch.organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Check if any students are registered in this batch
    const { count: studentCount } = await supabase
      .from("student_registrations")
      .select("*", { count: "exact", head: true })
      .eq("batch_id", batchId);

    if (studentCount && studentCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete batch with ${studentCount} registered students. Deactivate instead.` },
        { status: 400 }
      );
    }

    // Soft delete
    const { error } = await supabase
      .from("student_batches")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", batchId);

    if (error) {
      console.error("Error deleting batch:", error);
      return NextResponse.json(
        { error: "Failed to delete batch" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Batch deactivated" });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
