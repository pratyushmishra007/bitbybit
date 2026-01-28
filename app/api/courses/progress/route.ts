import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Get student's course enrollments with progress
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || session.user.id;
    const semester = searchParams.get('semester');
    const status = searchParams.get('status'); // 'not_started', 'in_progress', 'completed'
    const classId = searchParams.get('class_id');

    // Verify permission (students can only view their own, teachers/admins can view any)
    const { data: requestingUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userId !== session.user.id && !['admin', 'teacher'].includes(requestingUser?.role || '')) {
      return NextResponse.json(
        { error: 'You can only view your own progress' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from('student_course_enrollments')
      .select(`
        *,
        class_course:class_courses (
          id,
          semester,
          academic_year,
          start_date,
          end_date,
          course:courses (
            id,
            title,
            description,
            difficulty,
            duration,
            category
          ),
          class:classes (
            id,
            name,
            code,
            description
          )
        )
      `)
      .eq('user_id', userId);

    const { data: enrollments, error } = await query;

    console.log('🔍 API Debug - User ID:', userId);
    console.log('🔍 API Debug - Query error:', error);
    console.log('🔍 API Debug - Semester param:', semester);
    console.log('🔍 API Debug - Raw enrollments from DB:', enrollments);
    console.log('🔍 API Debug - Enrollments count:', enrollments?.length || 0);
    
    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }
    
    if (!enrollments) {
      console.error('❌ Enrollments is null/undefined');
    }
    
    // Filter by semester, status, or class after fetching
    let filteredEnrollments = enrollments || [];

    if (semester) {
      console.log('🔍 Before semester filter:', filteredEnrollments.length);
      filteredEnrollments.forEach((e: any, i: number) => {
        console.log(`Enrollment ${i}:`, {
          has_class_course: !!e.class_course,
          semester_value: e.class_course?.semester,
          matches: e.class_course?.semester === semester,
          semester_type: typeof e.class_course?.semester,
          param_type: typeof semester
        });
      });
      
      filteredEnrollments = filteredEnrollments.filter(
        (e: any) => e.class_course?.semester === semester
      );
      console.log('🔍 After semester filter:', filteredEnrollments.length);
    }

    if (status) {
      filteredEnrollments = filteredEnrollments.filter(
        (e: any) => e.status === status
      );
    }

    if (classId) {
      filteredEnrollments = filteredEnrollments.filter(
        (e: any) => e.class_course?.class?.id === classId
      );
    }

    // Calculate summary statistics
    const stats = {
      total: filteredEnrollments.length,
      not_started: filteredEnrollments.filter((e: any) => e.status === 'not_started').length,
      in_progress: filteredEnrollments.filter((e: any) => e.status === 'in_progress').length,
      completed: filteredEnrollments.filter((e: any) => e.status === 'completed').length,
      avg_progress: filteredEnrollments.length > 0
        ? Math.round(
            filteredEnrollments.reduce((sum: number, e: any) => sum + (e.progress_percentage || 0), 0) /
            filteredEnrollments.length
          )
        : 0,
    };

    console.log('📤 About to return response:');
    console.log('  - filteredEnrollments.length:', filteredEnrollments.length);
    console.log('  - stats:', stats);
    console.log('  - First enrollment:', filteredEnrollments[0]);

    return NextResponse.json(
      { enrollments: filteredEnrollments, stats },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get progress error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

// PATCH: Update student progress
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      enrollment_id,
      progress_percentage,
      lessons_completed,
      total_lessons,
      grade,
      status,
    } = body;

    if (!enrollment_id) {
      return NextResponse.json(
        { error: 'Enrollment ID is required' },
        { status: 400 }
      );
    }

    // Get enrollment to verify ownership
    const { data: enrollment } = await supabase
      .from('student_course_enrollments')
      .select('user_id')
      .eq('id', enrollment_id)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    // Get requesting user role
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    // Students can only update their own progress
    // Teachers and admins can update any student's progress
    if (enrollment.user_id !== session.user.id && !['admin', 'teacher'].includes(user?.role || '')) {
      return NextResponse.json(
        { error: 'You can only update your own progress' },
        { status: 403 }
      );
    }

    // Build update object
    const updates: any = {
      last_accessed: new Date().toISOString(),
    };

    if (progress_percentage !== undefined) {
      updates.progress_percentage = Math.min(100, Math.max(0, progress_percentage));
    }

    if (lessons_completed !== undefined) {
      updates.lessons_completed = lessons_completed;
    }

    if (total_lessons !== undefined) {
      updates.total_lessons = total_lessons;
    }

    if (grade !== undefined) {
      updates.grade = grade;
    }

    if (status !== undefined) {
      updates.status = status;
    }

    // Update enrollment (trigger will auto-update status if needed)
    const { data: updated, error } = await supabase
      .from('student_course_enrollments')
      .update(updates)
      .eq('id', enrollment_id)
      .select(`
        *,
        class_course:class_courses (
          id,
          semester,
          academic_year,
          course:courses (
            id,
            title
          )
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(
      { enrollment: updated, message: 'Progress updated successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update progress error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update progress' },
      { status: 500 }
    );
  }
}

// POST: Manually enroll a student in a class course
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { user_id, class_course_id } = body;

    if (!user_id || !class_course_id) {
      return NextResponse.json(
        { error: 'User ID and class course ID are required' },
        { status: 400 }
      );
    }

    // Only admins and teachers can manually enroll students
    const { data: requestingUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!['admin', 'teacher'].includes(requestingUser?.role || '')) {
      return NextResponse.json(
        { error: 'Only admins and teachers can enroll students' },
        { status: 403 }
      );
    }

    // Verify the student is enrolled in the class
    const { data: classCourse } = await supabase
      .from('class_courses')
      .select('class_id, course:courses(total_lessons)')
      .eq('id', class_course_id)
      .single();

    if (!classCourse) {
      return NextResponse.json(
        { error: 'Class course not found' },
        { status: 404 }
      );
    }

    const { data: classEnrollment } = await supabase
      .from('class_enrollments')
      .select('id')
      .eq('user_id', user_id)
      .eq('class_id', classCourse.class_id)
      .eq('status', 'active')
      .single();

    if (!classEnrollment) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this class' },
        { status: 400 }
      );
    }

    // Create enrollment
    const { data: enrollment, error } = await supabase
      .from('student_course_enrollments')
      .insert({
        user_id,
        class_course_id,
        status: 'not_started',
        total_lessons: (classCourse.course as any)?.total_lessons || 0,
      })
      .select(`
        *,
        class_course:class_courses (
          id,
          semester,
          academic_year,
          course:courses (
            id,
            title
          ),
          class:classes (
            id,
            name
          )
        )
      `)
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'Student is already enrolled in this course' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      { enrollment, message: 'Student enrolled successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Enroll student error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enroll student' },
      { status: 500 }
    );
  }
}
