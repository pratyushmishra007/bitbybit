import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NotificationHelpers } from "@/lib/notifications";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get user's self-enrolled courses
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get self-enrolled courses (where enrollment_type is 'self')
    const { data: enrollments, error } = await supabase
      .from("student_course_enrollments")
      .select(`
        id,
        course_id,
        progress,
        completed_lessons,
        started_at,
        last_activity_at,
        enrollment_type,
        course:courses (
          id,
          title,
          description,
          difficulty,
          category,
          thumbnail_url,
          lessons:lessons (id)
        )
      `)
      .eq("student_id", user.id)
      .eq("enrollment_type", "self")
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Error fetching enrollments:", error);
      return NextResponse.json(
        { error: "Failed to fetch enrollments" },
        { status: 500 }
      );
    }

    const formattedEnrollments = enrollments?.map((e: any) => ({
      id: e.id,
      courseId: e.course_id,
      progress: e.progress || 0,
      completedLessons: e.completed_lessons || 0,
      totalLessons: e.course?.lessons?.length || 0,
      startedAt: e.started_at,
      lastActivityAt: e.last_activity_at,
      course: e.course ? {
        id: e.course.id,
        title: e.course.title,
        description: e.course.description,
        difficulty: e.course.difficulty,
        category: e.course.category,
        thumbnailUrl: e.course.thumbnail_url,
      } : null,
    })) || [];

    return NextResponse.json({ enrollments: formattedEnrollments });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Self-enroll in a public course
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, role, organization_id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    // Check if course exists and is public
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, is_published, is_public, organization_id")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (!course.is_published || !course.is_public) {
      return NextResponse.json(
        { error: "This course is not available for self-enrollment" },
        { status: 403 }
      );
    }

    // Check organization restriction if applicable
    if (course.organization_id && user.organization_id && course.organization_id !== user.organization_id) {
      return NextResponse.json(
        { error: "This course is not available for your organization" },
        { status: 403 }
      );
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from("student_course_enrollments")
      .select("id")
      .eq("student_id", user.id)
      .eq("course_id", courseId)
      .single();

    if (existingEnrollment) {
      return NextResponse.json(
        { error: "You are already enrolled in this course" },
        { status: 400 }
      );
    }

    // Create enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from("student_course_enrollments")
      .insert({
        student_id: user.id,
        course_id: courseId,
        enrollment_type: "self",
        progress: 0,
        completed_lessons: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (enrollError) {
      console.error("Error creating enrollment:", enrollError);
      return NextResponse.json(
        { error: "Failed to enroll in course" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        courseId: enrollment.course_id,
        courseName: course.title,
        startedAt: enrollment.started_at,
      },
      message: `Successfully enrolled in "${course.title}"`,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Unenroll from a self-enrolled course
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const courseId = url.searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    // Only allow unenrolling from self-enrolled courses
    const { data: enrollment, error: fetchError } = await supabase
      .from("student_course_enrollments")
      .select("id, enrollment_type")
      .eq("student_id", user.id)
      .eq("course_id", courseId)
      .single();

    if (fetchError || !enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    if (enrollment.enrollment_type !== "self") {
      return NextResponse.json(
        { error: "You can only unenroll from self-enrolled courses" },
        { status: 403 }
      );
    }

    // Delete enrollment
    const { error: deleteError } = await supabase
      .from("student_course_enrollments")
      .delete()
      .eq("id", enrollment.id);

    if (deleteError) {
      console.error("Error deleting enrollment:", deleteError);
      return NextResponse.json(
        { error: "Failed to unenroll" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Successfully unenrolled from course",
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
