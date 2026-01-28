import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Assign course to class for a semester
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or teacher
    const { data: user } = await supabase
      .from('users')
      .select('role, id')
      .eq('id', session.user.id)
      .single();

    if (!user || !['admin', 'teacher'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only admins and teachers can assign courses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { class_id, course_id, semester, academic_year, start_date, end_date } = body;

    // Validate required fields
    if (!class_id || !course_id || !semester || !academic_year) {
      return NextResponse.json(
        { error: 'Class, course, semester, and academic year are required' },
        { status: 400 }
      );
    }

    // If teacher, verify they teach this class
    if (user.role === 'teacher') {
      const { data: assignment } = await supabase
        .from('teacher_assignments')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('class_id', class_id)
        .single();

      if (!assignment) {
        return NextResponse.json(
          { error: 'You are not assigned to this class' },
          { status: 403 }
        );
      }
    }

    // Check if course is already assigned to this class in this semester
    const { data: existing } = await supabase
      .from('class_courses')
      .select('id, is_active')
      .eq('class_id', class_id)
      .eq('course_id', course_id)
      .eq('semester', semester)
      .eq('academic_year', academic_year)
      .single();

    if (existing) {
      // If exists but inactive, reactivate it
      if (!existing.is_active) {
        const { data: updated, error } = await supabase
          .from('class_courses')
          .update({ is_active: true, assigned_by: user.id })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json(
          { classCourse: updated, message: 'Course reactivated for this class' },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: 'Course already assigned to this class for this semester' },
        { status: 409 }
      );
    }

    // Assign course to class
    const { data: classCourse, error } = await supabase
      .from('class_courses')
      .insert({
        class_id,
        course_id,
        semester,
        academic_year,
        start_date,
        end_date,
        assigned_by: user.id,
        is_active: true,
      })
      .select(`
        *,
        courses (
          id,
          title,
          description,
          difficulty,
          duration
        ),
        classes (
          id,
          name,
          code
        )
      `)
      .single();

    if (error) throw error;

    // The auto_enroll_students_in_class_course trigger will handle student enrollment

    return NextResponse.json(
      { classCourse, message: 'Course assigned successfully. Students have been auto-enrolled.' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Assign course error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign course' },
      { status: 500 }
    );
  }
}

// GET: Get all class courses (with filtering)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const semester = searchParams.get('semester');
    const activeOnly = searchParams.get('active') !== 'false'; // default true

    // Get user role
    const { data: user } = await supabase
      .from('users')
      .select('role, id')
      .eq('id', session.user.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let query = supabase
      .from('class_courses')
      .select(`
        *,
        courses (
          id,
          title,
          description,
          difficulty,
          duration
        ),
        classes (
          id,
          name,
          code,
          description
        ),
        assigned_by_user:users!class_courses_assigned_by_fkey (
          id,
          name
        )
      `);

    // Apply filters
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (classId) {
      query = query.eq('class_id', classId);
    }

    if (semester) {
      query = query.eq('semester', semester);
    }

    // Role-based filtering
    if (user.role === 'teacher') {
      // Teachers only see courses for classes they teach
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select('class_id')
        .eq('teacher_id', user.id);

      const classIds = assignments?.map(a => a.class_id) || [];
      
      if (classIds.length === 0) {
        return NextResponse.json({ classCourses: [] }, { status: 200 });
      }

      query = query.in('class_id', classIds);
    } else if (user.role === 'student') {
      // Students only see courses for their enrolled classes
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const classIds = enrollments?.map(e => e.class_id) || [];
      
      if (classIds.length === 0) {
        return NextResponse.json({ classCourses: [] }, { status: 200 });
      }

      query = query.in('class_id', classIds);
    }

    const { data: classCourses, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ classCourses }, { status: 200 });
  } catch (error: any) {
    console.error('Get class courses error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch class courses' },
      { status: 500 }
    );
  }
}

// DELETE: Remove course assignment (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Class course ID is required' },
        { status: 400 }
      );
    }

    // Check if user is admin or teacher who assigned it
    const { data: user } = await supabase
      .from('users')
      .select('role, id')
      .eq('id', session.user.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the class course
    const { data: classCourse } = await supabase
      .from('class_courses')
      .select('*, class_id')
      .eq('id', id)
      .single();

    if (!classCourse) {
      return NextResponse.json(
        { error: 'Class course not found' },
        { status: 404 }
      );
    }

    // Verify permissions
    if (user.role === 'teacher') {
      const { data: assignment } = await supabase
        .from('teacher_assignments')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('class_id', classCourse.class_id)
        .single();

      if (!assignment) {
        return NextResponse.json(
          { error: 'You are not authorized to remove this course assignment' },
          { status: 403 }
        );
      }
    } else if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins and teachers can remove course assignments' },
        { status: 403 }
      );
    }

    // Soft delete (set is_active to false)
    const { error } = await supabase
      .from('class_courses')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json(
      { message: 'Course assignment removed successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Remove course assignment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove course assignment' },
      { status: 500 }
    );
  }
}
