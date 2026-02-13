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

// GET - List student registrations with filters
export async function GET(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "org_admin", "hod", "mentor", "teacher"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || authResult.organizationId;
    const batchId = searchParams.get("batchId");
    const programId = searchParams.get("programId");
    const departmentId = searchParams.get("departmentId");
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");
    const currentSemester = searchParams.get("currentSemester");
    const admissionYear = searchParams.get("admissionYear");

    let query = supabase
      .from("student_registrations")
      .select(`
        *,
        student:users!student_registrations_student_id_fkey(id, name, email),
        batch:student_batches(
          id, 
          name,
          program:programs(id, name, code, degree_type),
          department:departments(id, name)
        )
      `)
      .order("created_at", { ascending: false });

    // Apply filters
    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }
    
    if (batchId) {
      query = query.eq("batch_id", batchId);
    }
    
    if (programId) {
      query = query.eq("program_id", programId);
    }
    
    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }
    
    if (studentId) {
      query = query.eq("student_id", studentId);
    }
    
    if (status) {
      query = query.eq("status", status);
    }
    
    if (currentSemester) {
      query = query.eq("current_semester", parseInt(currentSemester));
    }
    
    if (admissionYear) {
      query = query.eq("admission_year", parseInt(admissionYear));
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching student registrations:", error);
      return NextResponse.json({ error: "Failed to fetch student registrations" }, { status: 500 });
    }

    return NextResponse.json({ registrations: data });
  } catch (error) {
    console.error("Student Registrations GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Register a student to a batch/program
export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "org_admin", "hod", "mentor"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    
    // Support both snake_case and camelCase field names
    const studentId = body.student_id || body.studentId;
    const batchId = body.batch_id || body.batchId;
    const organizationId = body.organization_id || body.organizationId;
    const division = body.division || "A";
    const rollNumber = body.roll_number || body.rollNumber || null;
    const enrollmentNumber = body.enrollment_number || body.enrollmentNumber || null;
    const currentSemester = body.current_semester || body.currentSemester || 1;
    const admissionType = body.admission_type || body.admissionType || "regular";

    // Validation - only need studentId and batchId (we derive others from batch)
    if (!studentId || !batchId) {
      return NextResponse.json(
        { error: "student_id and batch_id are required" },
        { status: 400 }
      );
    }

    // Verify batch exists and get program/department info from it
    const { data: batch, error: batchError } = await supabase
      .from("student_batches")
      .select("id, name, program_id, department_id, organization_id, admission_year")
      .eq("id", batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Use org from batch or from request
    const effectiveOrgId = organizationId || batch.organization_id || authResult.organizationId;
    if (!effectiveOrgId) {
      return NextResponse.json({ error: "organization_id is required" }, { status: 400 });
    }

    // Verify batch belongs to the organization
    if (batch.organization_id !== effectiveOrgId) {
      return NextResponse.json({ error: "Batch does not belong to this organization" }, { status: 403 });
    }

    // Verify student exists and has student role
    const { data: student, error: studentError } = await supabase
      .from("users")
      .select("id, name, role, organization_id")
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.role !== "student") {
      return NextResponse.json({ error: "User is not a student" }, { status: 400 });
    }

    // Check org membership (allow if student has no org yet)
    if (student.organization_id && student.organization_id !== effectiveOrgId) {
      return NextResponse.json({ error: "Student belongs to a different organization" }, { status: 403 });
    }

    // Update student's organization if not set
    if (!student.organization_id) {
      await supabase
        .from("users")
        .update({ organization_id: effectiveOrgId })
        .eq("id", studentId);
    }

    // Check if student is already registered in any active batch
    const { data: existingRegistration } = await supabase
      .from("student_registrations")
      .select("id, batch:student_batches(name)")
      .eq("student_id", studentId)
      .eq("status", "active")
      .maybeSingle();

    if (existingRegistration) {
      return NextResponse.json(
        { error: `Student is already registered in batch: ${(existingRegistration.batch as any)?.name}` },
        { status: 409 }
      );
    }

    // Generate enrollment number if not provided
    let finalEnrollmentNumber = enrollmentNumber;
    if (!finalEnrollmentNumber) {
      const timestamp = Date.now().toString().slice(-6);
      finalEnrollmentNumber = `EN${batch.admission_year || new Date().getFullYear()}${timestamp}`;
    }

    // Create registration - use program_id and department_id from batch
    const { data, error } = await supabase
      .from("student_registrations")
      .insert({
        organization_id: effectiveOrgId,
        student_id: studentId,
        batch_id: batchId,
        program_id: batch.program_id,
        department_id: batch.department_id,
        enrollment_number: finalEnrollmentNumber,
        roll_number: rollNumber,
        division: division,
        admission_type: admissionType,
        admission_year: batch.admission_year || new Date().getFullYear(),
        current_semester: currentSemester,
        status: "active",
        registered_by: authResult.user?.id
      })
      .select(`
        *,
        student:users!student_registrations_student_id_fkey(id, name, email),
        batch:student_batches(id, name, program:programs(id, name, code))
      `)
      .single();

    if (error) {
      console.error("Error creating student registration:", error);
      if (error.code === "23505") { // Unique violation
        return NextResponse.json({ error: "Enrollment number already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create student registration: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ registration: data, success: true }, { status: 201 });
  } catch (error) {
    console.error("Student Registrations POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update student registration
export async function PUT(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "org_admin", "hod", "mentor"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    const body = await request.json();
    const division = body.division;
    const rollNumber = body.roll_number || body.rollNumber;
    const currentSemester = body.current_semester || body.currentSemester;
    const status = body.status;

    if (!id) {
      return NextResponse.json({ error: "Registration id is required" }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: any = { updated_at: new Date().toISOString() };
    if (division !== undefined) updateData.division = division;
    if (rollNumber !== undefined) updateData.roll_number = rollNumber;
    if (currentSemester !== undefined) updateData.current_semester = currentSemester;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from("student_registrations")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        student:users!student_registrations_student_id_fkey(id, name, email),
        batch:student_batches(id, name)
      `)
      .single();

    if (error) {
      console.error("Error updating registration:", error);
      return NextResponse.json({ error: "Failed to update registration" }, { status: 500 });
    }

    return NextResponse.json({ registration: data, success: true });
  } catch (error) {
    console.error("Student Registrations PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove student registration
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "org_admin", "hod"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Registration id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("student_registrations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting registration:", error);
      return NextResponse.json({ error: "Failed to delete registration" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Registration deleted" });
  } catch (error) {
    console.error("Student Registrations DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Bulk register students to a batch
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "org_admin", "hod"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { 
      organizationId,
      batchId,
      studentIds, // Array of student IDs
      admissionType = "regular",
      admissionYear
    } = body;

    // Validation
    if (!batchId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "batchId and studentIds array are required" },
        { status: 400 }
      );
    }

    const effectiveOrgId = organizationId || authResult.organizationId;
    if (!effectiveOrgId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const currentYear = admissionYear || new Date().getFullYear();

    // Verify batch exists
    const { data: batch, error: batchError } = await supabase
      .from("student_batches")
      .select("id, name, program_id, department_id, organization_id")
      .eq("id", batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (batch.organization_id !== effectiveOrgId) {
      return NextResponse.json({ error: "Batch does not belong to this organization" }, { status: 403 });
    }

    // Process each student
    const results = {
      success: [] as any[],
      failed: [] as { studentId: string; error: string }[]
    };

    for (const studentId of studentIds) {
      try {
        // Verify student
        const { data: student } = await supabase
          .from("users")
          .select("id, name, role, organization_id")
          .eq("id", studentId)
          .single();

        if (!student || student.role !== "student" || student.organization_id !== effectiveOrgId) {
          results.failed.push({ studentId, error: "Invalid student or organization mismatch" });
          continue;
        }

        // Check existing registration
        const { data: existing } = await supabase
          .from("student_registrations")
          .select("id")
          .eq("student_id", studentId)
          .eq("status", "active")
          .maybeSingle();

        if (existing) {
          results.failed.push({ studentId, error: "Student already has active registration" });
          continue;
        }

        // Generate enrollment number
        const timestamp = Date.now().toString().slice(-6);
        const enrollmentNumber = `EN${currentYear}${timestamp}${studentId.slice(-4)}`;

        // Create registration
        const { data, error } = await supabase
          .from("student_registrations")
          .insert({
            organization_id: effectiveOrgId,
            student_id: studentId,
            batch_id: batchId,
            program_id: batch.program_id,
            department_id: batch.department_id,
            enrollment_number: enrollmentNumber,
            admission_type: admissionType,
            admission_year: currentYear,
            current_semester: 1,
            status: "active",
            registered_by: authResult.user.id
          })
          .select()
          .single();

        if (error) {
          results.failed.push({ studentId, error: error.message });
        } else {
          results.success.push(data);
        }
      } catch (err) {
        results.failed.push({ studentId, error: "Unexpected error" });
      }
    }

    return NextResponse.json({
      message: `Registered ${results.success.length} students, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error("Bulk Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
