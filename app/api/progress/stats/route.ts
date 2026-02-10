import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('📊 Stats API - Fetching for user:', session.user.id);

    // Get user's basic stats
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("xp, level, streak_days")
      .eq("id", session.user.id)
      .single();

    console.log('📊 Stats API - User data:', userData);
    console.log('📊 Stats API - User error:', userError);

    // Get total lessons completed
    const { data: completedLessons, count: lessonsCount } = await supabase
      .from("lesson_progress")
      .select("*", { count: "exact" })
      .eq("user_id", session.user.id)
      .eq("completed", true);

    // Get unique courses started
    const uniqueCourses = new Set(
      completedLessons?.map((lesson) => lesson.course_slug) || []
    );

    // Get progress per course
    const courseProgress: Record<string, { completed: number; total: number }> = {};
    
    if (completedLessons) {
      for (const lesson of completedLessons) {
        if (!courseProgress[lesson.course_slug]) {
          courseProgress[lesson.course_slug] = { completed: 0, total: 0 };
        }
        courseProgress[lesson.course_slug].completed++;
      }
    }

    // Dynamically fetch lesson counts from database for each course
    const courseIds = Object.keys(courseProgress);
    if (courseIds.length > 0) {
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, lessons_count")
        .in("id", courseIds);
      
      if (coursesData) {
        for (const course of coursesData) {
          if (courseProgress[course.id]) {
            courseProgress[course.id].total = course.lessons_count || 0;
          }
        }
      }
      
      // Also try to count lessons directly from lessons table for accuracy
      for (const courseId of courseIds) {
        if (courseProgress[courseId].total === 0) {
          const { count } = await supabase
            .from("lessons")
            .select("*", { count: "exact", head: true })
            .eq("course_id", courseId);
          
          if (count) {
            courseProgress[courseId].total = count;
          }
        }
      }
    }

    // Get last accessed lesson
    const { data: lastLesson } = await supabase
      .from("lesson_progress")
      .select("course_slug, lesson_id, updated_at")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      stats: {
        xp: userData?.xp || 0,
        level: userData?.level || 1,
        streakDays: userData?.streak_days || 0,
        coursesStarted: uniqueCourses.size,
        lessonsCompleted: lessonsCount || 0,
      },
      courseProgress,
      lastLesson: lastLesson || null,
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}
