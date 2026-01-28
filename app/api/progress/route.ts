import { supabase } from "@/lib/supabase";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

// Get user progress for a specific course
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const courseSlug = searchParams.get("courseSlug");

  if (!courseSlug) {
    return NextResponse.json({ error: "Course slug required" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("course_progress")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("course_slug", courseSlug)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json({ progress: data || null });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

// Update user progress
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { courseSlug, lessonId, xpEarned = 0 } = body;

    if (!courseSlug || !lessonId) {
      return NextResponse.json(
        { error: "Course slug and lesson ID required" },
        { status: 400 }
      );
    }

    // Get existing progress
    const { data: existingProgress } = await supabase
      .from("course_progress")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("course_slug", courseSlug)
      .single();

    const completedLessons = existingProgress?.completed_lessons || [];
    
    // Add lesson to completed if not already there
    if (!completedLessons.includes(lessonId)) {
      completedLessons.push(lessonId);
    }

    // Calculate progress percentage (you'll need to pass total lessons)
    const totalLessons = body.totalLessons || 10; // Default or pass from frontend
    const progressPercentage = (completedLessons.length / totalLessons) * 100;

    // Upsert progress
    const { data: progressData, error: progressError } = await supabase
      .from("course_progress")
      .upsert({
        user_id: session.user.id,
        course_slug: courseSlug,
        completed_lessons: completedLessons,
        current_lesson_id: lessonId,
        progress_percentage: progressPercentage,
        last_accessed: new Date().toISOString(),
      })
      .select()
      .single();

    if (progressError) throw progressError;

    // Update user XP
    if (xpEarned > 0) {
      const { data: userData } = await supabase
        .from("users")
        .select("xp")
        .eq("id", session.user.id)
        .single();

      const newXp = (userData?.xp || 0) + xpEarned;

      await supabase
        .from("users")
        .update({ 
          xp: newXp,
          last_active: new Date().toISOString(),
        })
        .eq("id", session.user.id);
    }

    return NextResponse.json({ 
      success: true, 
      progress: progressData,
      xpEarned,
    });
  } catch (error) {
    console.error("Error updating progress:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}
