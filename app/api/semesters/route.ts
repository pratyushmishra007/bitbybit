import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to check admin access (admin, org_admin, hod, teacher)
async function checkAdminAccess(allowedRoles: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id, role, organization_id")
    .eq("id", session.user.id)
    .single();

  if (error || !user) {
    return { error: "User not found", status: 404 };
  }

  if (!allowedRoles.includes(user.role)) {
    return { error: "Access denied", status: 403 };
  }

  return { user, role: user.role, organizationId: user.organization_id };
}

// GET: List all semesters or active semester
export async function GET(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "platform_admin", "org_admin", "hod", "teacher", "student"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const academicYearId = searchParams.get('academicYearId');
    const organizationId = searchParams.get('organizationId');

    // Use organization filter - for non-admins, enforce their organization
    const effectiveOrgId = authResult.role === "admin" || authResult.role === "platform_admin"
      ? organizationId
      : authResult.organizationId;

    let query = supabase
      .from('semesters')
      .select(`
        *,
        academic_year:academic_years!semesters_academic_year_id_fkey(id, name, organization_id, is_current)
      `)
      .order('semester_number', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }

    const { data: semesters, error } = await query;

    if (error) throw error;

    // Filter by organization through academic_year relationship
    let filteredSemesters = semesters || [];
    if (effectiveOrgId) {
      filteredSemesters = filteredSemesters.filter(sem => 
        (sem.academic_year as any)?.organization_id === effectiveOrgId
      );
    }

    return NextResponse.json({ semesters: filteredSemesters }, { status: 200 });
  } catch (error: any) {
    console.error('Get semesters error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch semesters' },
      { status: 500 }
    );
  }
}

// POST: Create new semester (admin/org_admin/hod/teacher)
export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "platform_admin", "org_admin", "hod", "teacher"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { 
      name, 
      academic_year_id, // FK to academic_years
      academic_year, // Legacy string field (optional)
      semester_number,
      start_date, 
      end_date, 
      is_active 
    } = body;

    // Validate required fields
    if (!name || !academic_year_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Name, academic_year_id, start date, and end date are required' },
        { status: 400 }
      );
    }

    // Verify academic year exists and get organization
    const { data: academicYear, error: ayError } = await supabase
      .from('academic_years')
      .select('id, name, organization_id')
      .eq('id', academic_year_id)
      .single();

    if (ayError || !academicYear) {
      return NextResponse.json({ error: 'Academic year not found' }, { status: 404 });
    }

    // Check organization access for non-admin users
    if (authResult.role !== "admin" && authResult.role !== "platform_admin") {
      if (academicYear.organization_id !== authResult.organizationId) {
        return NextResponse.json(
          { error: 'Cannot create semester for another organization' },
          { status: 403 }
        );
      }
    }

    // If setting as active, deactivate all other semesters in same academic year
    if (is_active) {
      await supabase
        .from('semesters')
        .update({ is_active: false })
        .eq('academic_year_id', academic_year_id);
    }

    // Create semester
    const { data: semester, error } = await supabase
      .from('semesters')
      .insert({
        name,
        academic_year_id,
        academic_year: academic_year || academicYear.name, // Use provided or derive from academic_year
        semester_number: semester_number || 1,
        start_date,
        end_date,
        is_active: is_active || false,
        created_by: authResult.user.id,
      })
      .select(`
        *,
        academic_year:academic_years!semesters_academic_year_id_fkey(id, name, organization_id)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ semester }, { status: 201 });
  } catch (error: any) {
    console.error('Create semester error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create semester' },
      { status: 500 }
    );
  }
}

// PATCH: Update semester (e.g., set as active)
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "platform_admin", "org_admin", "hod", "teacher"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { id, is_active, name, semester_number, start_date, end_date } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Semester ID is required' },
        { status: 400 }
      );
    }

    // Verify semester exists and check organization access
    const { data: existing, error: fetchError } = await supabase
      .from('semesters')
      .select(`
        *,
        academic_year:academic_years!semesters_academic_year_id_fkey(id, organization_id)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 });
    }

    // Check organization access for non-admin users
    if (authResult.role !== "admin" && authResult.role !== "platform_admin") {
      if ((existing.academic_year as any)?.organization_id !== authResult.organizationId) {
        return NextResponse.json(
          { error: 'Access denied to this semester' },
          { status: 403 }
        );
      }
    }

    // If setting as active, deactivate all others in same academic year first
    if (is_active === true && existing.academic_year_id) {
      await supabase
        .from('semesters')
        .update({ is_active: false })
        .eq('academic_year_id', existing.academic_year_id)
        .neq('id', id);
    }

    // Update semester
    const updates: any = {};
    if (is_active !== undefined) updates.is_active = is_active;
    if (name) updates.name = name;
    if (semester_number !== undefined) updates.semester_number = semester_number;
    if (start_date) updates.start_date = start_date;
    if (end_date) updates.end_date = end_date;

    const { data: semester, error } = await supabase
      .from('semesters')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        academic_year:academic_years!semesters_academic_year_id_fkey(id, name, organization_id)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ semester }, { status: 200 });
  } catch (error: any) {
    console.error('Update semester error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update semester' },
      { status: 500 }
    );
  }
}

// DELETE: Delete semester
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess(["admin", "platform_admin", "org_admin"]);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Semester ID is required' }, { status: 400 });
    }

    // Verify semester exists and check organization access
    const { data: existing, error: fetchError } = await supabase
      .from('semesters')
      .select(`
        *,
        academic_year:academic_years!semesters_academic_year_id_fkey(id, organization_id)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 });
    }

    // Check organization access for non-admin users
    if (authResult.role !== "admin" && authResult.role !== "platform_admin") {
      if ((existing.academic_year as any)?.organization_id !== authResult.organizationId) {
        return NextResponse.json(
          { error: 'Access denied to this semester' },
          { status: 403 }
        );
      }
    }

    const { error } = await supabase
      .from('semesters')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Semester deleted' });
  } catch (error: any) {
    console.error('Delete semester error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete semester' },
      { status: 500 }
    );
  }
}
