import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: courseId } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch course details
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Fetch lessons for this course
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    if (lessonsError) {
      console.error("Error fetching lessons:", lessonsError);
    }

    // Fetch user's progress for this course
    const { data: progressData, error: progressError } = await supabase
      .from("lesson_progress")
      .select("lesson_id, completed")
      .eq("user_id", session.user.id)
      .eq("course_id", courseId);

    if (progressError) {
      console.error("Error fetching progress:", progressError);
    }

    // Convert progress to object format { lesson_id: true/false }
    const progress: { [key: string]: boolean } = {};
    progressData?.forEach((item) => {
      progress[item.lesson_id] = item.completed;
    });

    return NextResponse.json({
      course,
      lessons: lessons || [],
      progress,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
