import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List all semesters or active semester
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase
      .from('semesters')
      .select('*')
      .order('start_date', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: semesters, error } = await query;

    if (error) throw error;

    return NextResponse.json({ semesters }, { status: 200 });
  } catch (error: any) {
    console.error('Get semesters error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch semesters' },
      { status: 500 }
    );
  }
}

// POST: Create new semester (admin/teacher only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or teacher
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!user || !['admin', 'teacher'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only admins and teachers can create semesters' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, academic_year, start_date, end_date, is_active } = body;

    // Validate required fields
    if (!name || !academic_year || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Name, academic year, start date, and end date are required' },
        { status: 400 }
      );
    }

    // If setting as active, deactivate all other semesters
    if (is_active) {
      await supabase
        .from('semesters')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
    }

    // Create semester
    const { data: semester, error } = await supabase
      .from('semesters')
      .insert({
        name,
        academic_year,
        start_date,
        end_date,
        is_active: is_active || false,
        created_by: session.user.id,
      })
      .select()
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or teacher
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!user || !['admin', 'teacher'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only admins and teachers can update semesters' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, is_active, name, start_date, end_date } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Semester ID is required' },
        { status: 400 }
      );
    }

    // If setting as active, deactivate all others first
    if (is_active === true) {
      await supabase
        .from('semesters')
        .update({ is_active: false })
        .neq('id', id);
    }

    // Update semester
    const updates: any = {};
    if (is_active !== undefined) updates.is_active = is_active;
    if (name) updates.name = name;
    if (start_date) updates.start_date = start_date;
    if (end_date) updates.end_date = end_date;

    const { data: semester, error } = await supabase
      .from('semesters')
      .update(updates)
      .eq('id', id)
      .select()
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
