import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to check admin access
async function checkAdminAccess(allowedRoles: string[] = ["admin", "org_admin", "hod"]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 };
  }
  
  const userRole = (session.user as any).role;
  if (!allowedRoles.includes(userRole)) {
    return { error: "Forbidden - Insufficient permissions", status: 403 };
  }
  
  return { 
    user: session.user,
    role: userRole,
    organizationId: (session.user as any).organization_id 
  };
}

// GET - List class mentor assignments with filters
export async function GET(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "org_admin", "hod", "mentor", "teacher"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || authResult.organizationId;
    const batchId = searchParams.get("batchId");
    const teacherId = searchParams.get("teacherId");
    const academicYear = searchParams.get("academicYear");
    const semesterNumber = searchParams.get("semesterNumber");
    const includeInactive = searchParams.get("includeInactive") === "true";

    let query = supabase
      .from("class_mentors")
      .select(`
        *,
        batch:student_batches(
          id, 
          name, 
          current_semester,
          program:programs(id, name, code)
        ),
        teacher:users!class_mentors_teacher_id_fkey(id, name, email)
      `)
      .order("academic_year", { ascending: false })
      .order("semester_number", { ascending: true });

    // Apply filters
    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }
    
    if (batchId) {
      query = query.eq("batch_id", batchId);
    }
    
    if (teacherId) {
      query = query.eq("teacher_id", teacherId);
    }
    
    if (academicYear) {
      query = query.eq("academic_year", academicYear);
    }
    
    if (semesterNumber) {
      query = query.eq("semester_number", parseInt(semesterNumber));
    }
    
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching mentors:", error);
      return NextResponse.json({ error: "Failed to fetch mentor assignments" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Mentors GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Assign a teacher as class mentor for a batch
export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "org_admin", "hod"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { 
      organizationId,
      batchId, 
      teacherId, 
      semesterNumber, 
      academicYear
    } = body;

    // Validation
    if (!batchId || !teacherId || !semesterNumber || !academicYear) {
      return NextResponse.json(
        { error: "batchId, teacherId, semesterNumber, and academicYear are required" },
        { status: 400 }
      );
    }

    if (semesterNumber < 1 || semesterNumber > 12) {
      return NextResponse.json(
        { error: "semesterNumber must be between 1 and 12" },
        { status: 400 }
      );
    }

    const effectiveOrgId = organizationId || authResult.organizationId;
    if (!effectiveOrgId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    // Verify batch exists and belongs to organization
    const { data: batch, error: batchError } = await supabase
      .from("student_batches")
      .select("id, name, organization_id")
      .eq("id", batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (batch.organization_id !== effectiveOrgId) {
      return NextResponse.json({ error: "Batch does not belong to this organization" }, { status: 403 });
    }

    // Verify teacher exists and has appropriate role
    const { data: teacher, error: teacherError } = await supabase
      .from("users")
      .select("id, name, role, organization_id")
      .eq("id", teacherId)
      .single();

    if (teacherError || !teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    if (!["teacher", "mentor", "hod"].includes(teacher.role)) {
      return NextResponse.json({ error: "User is not a teacher/mentor" }, { status: 400 });
    }

    if (teacher.organization_id !== effectiveOrgId) {
      return NextResponse.json({ error: "Teacher does not belong to this organization" }, { status: 403 });
    }

    // Check for existing active mentor for this batch/semester
    const { data: existing } = await supabase
      .from("class_mentors")
      .select("id, teacher:users!class_mentors_teacher_id_fkey(name)")
      .eq("batch_id", batchId)
      .eq("semester_number", semesterNumber)
      .eq("academic_year", academicYear)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `This batch already has an active mentor (${(existing.teacher as any)?.name}) for this semester` },
        { status: 409 }
      );
    }

    // Create mentor assignment
    const { data, error } = await supabase
      .from("class_mentors")
      .insert({
        organization_id: effectiveOrgId,
        batch_id: batchId,
        teacher_id: teacherId,
        semester_number: semesterNumber,
        academic_year: academicYear,
        assigned_by: authResult.user.id
      })
      .select(`
        *,
        batch:student_batches(id, name),
        teacher:users!class_mentors_teacher_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error("Error creating mentor assignment:", error);
      return NextResponse.json({ error: "Failed to create mentor assignment" }, { status: 500 });
    }

    // Update user role to mentor if they were just a teacher
    if (teacher.role === "teacher") {
      await supabase
        .from("users")
        .update({ role: "mentor" })
        .eq("id", teacherId);
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Mentors POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update mentor assignment
export async function PUT(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "org_admin", "hod"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { 
      id,
      teacherId,
      isActive
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Mentor assignment id is required" }, { status: 400 });
    }

    // Verify mentor assignment exists
    const { data: existing, error: fetchError } = await supabase
      .from("class_mentors")
      .select("*, organization_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Mentor assignment not found" }, { status: 404 });
    }

    // Check organization access for non-admin users
    if (authResult.role !== "admin" && existing.organization_id !== authResult.organizationId) {
      return NextResponse.json({ error: "Access denied to this mentor assignment" }, { status: 403 });
    }

    // Build update object
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (teacherId !== undefined) {
      // Verify new teacher
      const { data: teacher, error: teacherError } = await supabase
        .from("users")
        .select("id, role, organization_id")
        .eq("id", teacherId)
        .single();

      if (teacherError || !teacher) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
      }

      if (!["teacher", "mentor", "hod"].includes(teacher.role)) {
        return NextResponse.json({ error: "User is not a teacher/mentor" }, { status: 400 });
      }

      if (teacher.organization_id !== existing.organization_id) {
        return NextResponse.json({ error: "Teacher does not belong to this organization" }, { status: 403 });
      }

      updateData.teacher_id = teacherId;
    }

    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    const { data, error } = await supabase
      .from("class_mentors")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        batch:student_batches(id, name),
        teacher:users!class_mentors_teacher_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error("Error updating mentor assignment:", error);
      return NextResponse.json({ error: "Failed to update mentor assignment" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Mentors PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove mentor assignment (soft delete/deactivate)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "org_admin", "hod"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Mentor assignment id is required" }, { status: 400 });
    }

    // Verify mentor assignment exists
    const { data: existing, error: fetchError } = await supabase
      .from("class_mentors")
      .select("*, organization_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Mentor assignment not found" }, { status: 404 });
    }

    // Check organization access for non-admin users
    if (authResult.role !== "admin" && existing.organization_id !== authResult.organizationId) {
      return NextResponse.json({ error: "Access denied to this mentor assignment" }, { status: 403 });
    }

    // Soft delete (deactivate)
    const { error } = await supabase
      .from("class_mentors")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error deleting mentor assignment:", error);
      return NextResponse.json({ error: "Failed to delete mentor assignment" }, { status: 500 });
    }

    return NextResponse.json({ message: "Mentor assignment deactivated successfully" });
  } catch (error) {
    console.error("Mentors DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
