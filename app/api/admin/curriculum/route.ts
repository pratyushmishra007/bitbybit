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

// GET - List curriculum entries with filters
export async function GET(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "org_admin", "hod", "teacher"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || authResult.organizationId;
    const programId = searchParams.get("programId");
    const subjectId = searchParams.get("subjectId");
    const semesterNumber = searchParams.get("semesterNumber");
    const academicYear = searchParams.get("academicYear");
    const includeInactive = searchParams.get("includeInactive") === "true";

    let query = supabase
      .from("curriculum")
      .select(`
        *,
        program:programs(id, name, code, degree_type),
        subject:subjects(id, name, code, credits, subject_type)
      `)
      .order("semester_number", { ascending: true })
      .order("created_at", { ascending: false });

    // Apply filters
    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }
    
    if (programId) {
      query = query.eq("program_id", programId);
    }
    
    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    }
    
    if (semesterNumber) {
      query = query.eq("semester_number", parseInt(semesterNumber));
    }
    
    if (academicYear) {
      query = query.eq("academic_year", academicYear);
    }
    
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching curriculum:", error);
      return NextResponse.json({ error: "Failed to fetch curriculum" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Curriculum GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new curriculum entry (assign subject to program semester)
export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "org_admin", "hod"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { 
      organizationId,
      programId, 
      subjectId, 
      semesterNumber, 
      academicYear,
      isElective = false,
      minStudents,
      maxStudents
    } = body;

    // Validation
    if (!programId || !subjectId || !semesterNumber || !academicYear) {
      return NextResponse.json(
        { error: "programId, subjectId, semesterNumber, and academicYear are required" },
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

    // Verify program exists and belongs to organization
    const { data: program, error: programError } = await supabase
      .from("programs")
      .select("id, name, total_semesters, organization_id")
      .eq("id", programId)
      .single();

    if (programError || !program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    if (program.organization_id !== effectiveOrgId) {
      return NextResponse.json({ error: "Program does not belong to this organization" }, { status: 403 });
    }

    if (semesterNumber > program.total_semesters) {
      return NextResponse.json(
        { error: `Semester number exceeds program's total semesters (${program.total_semesters})` },
        { status: 400 }
      );
    }

    // Verify subject exists and belongs to organization
    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select("id, name, organization_id")
      .eq("id", subjectId)
      .single();

    if (subjectError || !subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    if (subject.organization_id !== effectiveOrgId) {
      return NextResponse.json({ error: "Subject does not belong to this organization" }, { status: 403 });
    }

    // Check for duplicate entry
    const { data: existing } = await supabase
      .from("curriculum")
      .select("id")
      .eq("program_id", programId)
      .eq("subject_id", subjectId)
      .eq("semester_number", semesterNumber)
      .eq("academic_year", academicYear)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This subject is already assigned to this program semester for this academic year" },
        { status: 409 }
      );
    }

    // Create curriculum entry
    const { data, error } = await supabase
      .from("curriculum")
      .insert({
        organization_id: effectiveOrgId,
        program_id: programId,
        subject_id: subjectId,
        semester_number: semesterNumber,
        academic_year: academicYear,
        is_elective: isElective,
        min_students: minStudents,
        max_students: maxStudents,
        created_by: authResult.user.id
      })
      .select(`
        *,
        program:programs(id, name, code),
        subject:subjects(id, name, code, credits)
      `)
      .single();

    if (error) {
      console.error("Error creating curriculum entry:", error);
      return NextResponse.json({ error: "Failed to create curriculum entry" }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Curriculum POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update curriculum entry
export async function PUT(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "org_admin", "hod"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { 
      id,
      semesterNumber,
      academicYear,
      isElective,
      minStudents,
      maxStudents,
      isActive
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Curriculum entry id is required" }, { status: 400 });
    }

    // Verify curriculum entry exists
    const { data: existing, error: fetchError } = await supabase
      .from("curriculum")
      .select("*, organization_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Curriculum entry not found" }, { status: 404 });
    }

    // Check organization access for non-admin users
    if (authResult.role !== "admin" && existing.organization_id !== authResult.organizationId) {
      return NextResponse.json({ error: "Access denied to this curriculum entry" }, { status: 403 });
    }

    // Build update object
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (semesterNumber !== undefined) {
      if (semesterNumber < 1 || semesterNumber > 12) {
        return NextResponse.json({ error: "semesterNumber must be between 1 and 12" }, { status: 400 });
      }
      updateData.semester_number = semesterNumber;
    }
    if (academicYear !== undefined) updateData.academic_year = academicYear;
    if (isElective !== undefined) updateData.is_elective = isElective;
    if (minStudents !== undefined) updateData.min_students = minStudents;
    if (maxStudents !== undefined) updateData.max_students = maxStudents;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data, error } = await supabase
      .from("curriculum")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        program:programs(id, name, code),
        subject:subjects(id, name, code, credits)
      `)
      .single();

    if (error) {
      console.error("Error updating curriculum entry:", error);
      return NextResponse.json({ error: "Failed to update curriculum entry" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Curriculum PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove curriculum entry (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "org_admin"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Curriculum entry id is required" }, { status: 400 });
    }

    // Verify curriculum entry exists
    const { data: existing, error: fetchError } = await supabase
      .from("curriculum")
      .select("*, organization_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Curriculum entry not found" }, { status: 404 });
    }

    // Check organization access for non-admin users
    if (authResult.role !== "admin" && existing.organization_id !== authResult.organizationId) {
      return NextResponse.json({ error: "Access denied to this curriculum entry" }, { status: 403 });
    }

    // Check if there are enrolled students
    const { count: enrollmentCount } = await supabase
      .from("student_subject_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("subject_id", existing.subject_id)
      .eq("semester_number", existing.semester_number);

    if (enrollmentCount && enrollmentCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${enrollmentCount} students are enrolled in this subject` },
        { status: 409 }
      );
    }

    // Soft delete
    const { error } = await supabase
      .from("curriculum")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error deleting curriculum entry:", error);
      return NextResponse.json({ error: "Failed to delete curriculum entry" }, { status: 500 });
    }

    return NextResponse.json({ message: "Curriculum entry deleted successfully" });
  } catch (error) {
    console.error("Curriculum DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
