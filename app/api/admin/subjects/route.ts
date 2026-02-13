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

// GET: List subjects with filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const organizationId = req.nextUrl.searchParams.get("organizationId");
    const departmentId = req.nextUrl.searchParams.get("departmentId");
    const programId = req.nextUrl.searchParams.get("programId");
    const semesterNumber = req.nextUrl.searchParams.get("semesterNumber");
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
      .from("subjects")
      .select(`
        *,
        organization:organizations(id, name, code),
        department:departments(id, name, code),
        program:programs(id, name, code, short_name)
      `)
      .eq("organization_id", targetOrgId)
      .order("semester_number", { ascending: true })
      .order("code", { ascending: true });

    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    if (programId) {
      query = query.eq("program_id", programId);
    }

    if (semesterNumber) {
      query = query.eq("semester_number", parseInt(semesterNumber));
    }

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: subjects, error } = await query;

    if (error) {
      console.error("Error fetching subjects:", error);
      return NextResponse.json(
        { error: "Failed to fetch subjects" },
        { status: 500 }
      );
    }

    return NextResponse.json({ subjects: subjects || [] });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create new subject
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
      semester_number,
      name,
      code,
      credits,
      lecture_hours,
      tutorial_hours,
      practical_hours,
      subject_type,
      is_mandatory,
      max_internal_marks,
      max_external_marks,
      passing_marks,
    } = body;

    const access = await checkAdminAccess(session, organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Validation
    if (!organization_id || !department_id || !name || !code || !semester_number) {
      return NextResponse.json(
        { error: "Organization ID, department ID, name, code, and semester number are required" },
        { status: 400 }
      );
    }

    if (semester_number < 1 || semester_number > 12) {
      return NextResponse.json(
        { error: "Semester number must be between 1 and 12" },
        { status: 400 }
      );
    }

    // Check if subject code already exists
    const { data: existing } = await supabase
      .from("subjects")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("code", code.toUpperCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A subject with this code already exists in this organization" },
        { status: 400 }
      );
    }

    const { data: subject, error } = await supabase
      .from("subjects")
      .insert({
        organization_id,
        department_id,
        program_id,
        semester_number,
        name,
        code: code.toUpperCase(),
        credits: credits || 3,
        lecture_hours: lecture_hours || 3,
        tutorial_hours: tutorial_hours || 1,
        practical_hours: practical_hours || 2,
        subject_type: subject_type || "theory",
        is_mandatory: is_mandatory !== false,
        max_internal_marks: max_internal_marks || 40,
        max_external_marks: max_external_marks || 60,
        passing_marks: passing_marks || 40,
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
      console.error("Error creating subject:", error);
      return NextResponse.json(
        { error: "Failed to create subject" },
        { status: 500 }
      );
    }

    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update subject
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      name,
      code,
      credits,
      lecture_hours,
      tutorial_hours,
      practical_hours,
      subject_type,
      is_mandatory,
      max_internal_marks,
      max_external_marks,
      passing_marks,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Subject ID is required" },
        { status: 400 }
      );
    }

    // Get the subject to check organization
    const { data: existingSubject } = await supabase
      .from("subjects")
      .select("organization_id")
      .eq("id", id)
      .single();

    if (!existingSubject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const access = await checkAdminAccess(session, existingSubject.organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Check for code uniqueness if code is being changed
    if (code) {
      const { data: codeExists } = await supabase
        .from("subjects")
        .select("id")
        .eq("organization_id", existingSubject.organization_id)
        .eq("code", code.toUpperCase())
        .neq("id", id)
        .single();

      if (codeExists) {
        return NextResponse.json(
          { error: "A subject with this code already exists" },
          { status: 400 }
        );
      }
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (credits !== undefined) updateData.credits = credits;
    if (lecture_hours !== undefined) updateData.lecture_hours = lecture_hours;
    if (tutorial_hours !== undefined) updateData.tutorial_hours = tutorial_hours;
    if (practical_hours !== undefined) updateData.practical_hours = practical_hours;
    if (subject_type !== undefined) updateData.subject_type = subject_type;
    if (is_mandatory !== undefined) updateData.is_mandatory = is_mandatory;
    if (max_internal_marks !== undefined) updateData.max_internal_marks = max_internal_marks;
    if (max_external_marks !== undefined) updateData.max_external_marks = max_external_marks;
    if (passing_marks !== undefined) updateData.passing_marks = passing_marks;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: subject, error } = await supabase
      .from("subjects")
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
      console.error("Error updating subject:", error);
      return NextResponse.json(
        { error: "Failed to update subject" },
        { status: 500 }
      );
    }

    return NextResponse.json({ subject });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Soft delete subject
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const subjectId = req.nextUrl.searchParams.get("id");

    if (!subjectId) {
      return NextResponse.json(
        { error: "Subject ID is required" },
        { status: 400 }
      );
    }

    // Get the subject to check organization
    const { data: existingSubject } = await supabase
      .from("subjects")
      .select("organization_id")
      .eq("id", subjectId)
      .single();

    if (!existingSubject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const access = await checkAdminAccess(session, existingSubject.organization_id);

    if (!access.allowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Soft delete
    const { error } = await supabase
      .from("subjects")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", subjectId);

    if (error) {
      console.error("Error deleting subject:", error);
      return NextResponse.json(
        { error: "Failed to delete subject" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Subject deactivated" });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
