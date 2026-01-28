import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { lessonId, courseId, xpEarned } = body;

    if (!lessonId || !courseId || !xpEarned) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userId = session.user.id;

    // Check if already completed
    const { data: existing } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .single();

    if (existing && existing.completed) {
      return NextResponse.json(
        { error: "Already completed", success: false },
        { status: 400 }
      );
    }

    // Get current user stats (if table exists, otherwise use defaults)
    const { data: currentUser } = await supabase
      .from("users")
      .select("xp, level, email, name")
      .eq("id", userId)
      .single();

    // If user doesn't exist in users table, create them first
    if (!currentUser) {
      console.log('⚠️ User not found in users table, creating...', userId);
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          id: userId,
          email: session.user.email,
          name: session.user.name || session.user.email,
          xp: 0,
          level: 1,
          streak_days: 0,
          role: "student",
          account_status: "approved"
        });
      
      if (insertError) {
        console.error('❌ Failed to create user:', insertError);
      } else {
        console.log('✅ User created successfully');
      }
    }

    // Use defaults if user not found in users table
    const userXP = currentUser?.xp || 0;
    const userLevel = currentUser?.level || 1;

    // Calculate new stats
    const newXP = userXP + xpEarned;
    const newLevel = Math.floor(newXP / 100) + 1;
    const leveledUp = newLevel > userLevel;

    console.log('📊 XP Update:', {
      oldXP: userXP,
      xpEarned,
      newXP,
      oldLevel: userLevel,
      newLevel,
      leveledUp,
      userId
    });

    // Streak calculation - simplified for now (just increment on first activity)
    const now = new Date();
    let streakUpdate = {};
    
    if (currentUser) {
      // User exists, maintain their streak
      const { data: userData } = await supabase
        .from("users")
        .select("streak_days")
        .eq("id", userId)
        .single();
      
      streakUpdate = { streak_days: (userData?.streak_days || 0) + 1 };
    } else {
      // First activity
      streakUpdate = { streak_days: 1 };
    }

    // Update lesson_progress (insert or update)
    await supabase
      .from("lesson_progress")
      .upsert({
        user_id: userId,
        lesson_id: lessonId,
        course_id: courseId,
        completed: true,
        completed_at: now.toISOString(),
        updated_at: now.toISOString(),
      }, {
        onConflict: "user_id,lesson_id",
      });

    // Update user stats (upsert to handle new users)
    const { error: updateError } = await supabase
      .from("users")
      .upsert({
        id: userId,
        email: session.user.email,
        name: session.user.name || session.user.email,
        xp: newXP,
        level: newLevel,
        role: "student",
        account_status: "approved",
        ...streakUpdate,
      }, {
        onConflict: "id"
      });

    if (updateError) {
      console.error('❌ Failed to update user stats:', updateError);
      console.error('Error details:', JSON.stringify(updateError, null, 2));
    } else {
      console.log('✅ User stats updated successfully:', { userId, newXP, newLevel });
    }

    // Update course enrollment progress
    try {
      // Get total lessons in the course
      const { count: totalLessons } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId);

      // Get completed lessons count for this user in this course
      const { count: completedCount } = await supabase
        .from("lesson_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .eq("completed", true);

      const progress = totalLessons ? Math.round((completedCount || 0) / totalLessons * 100) : 0;
      
      console.log('📈 Progress calculation:', {
        courseId,
        totalLessons,
        completedCount,
        progress: `${progress}%`
      });
      
      // Find student enrollment and update progress
      const { data: enrollments } = await supabase
        .from("student_course_enrollments")
        .select("id, class_course:class_courses(course_id)")
        .eq("user_id", userId);

      console.log('🔍 Found enrollments:', { count: enrollments?.length || 0, userId });

      if (enrollments && enrollments.length > 0) {
        // Find enrollment matching this course
        const enrollment = enrollments.find((e: any) => {
          const enrollmentCourseId = e.class_course?.course_id;
          return enrollmentCourseId === courseId;
        });

        if (enrollment) {
          console.log('🔍 Matched enrollment for course:', { courseId, enrollmentId: enrollment.id });
          const { error: progressError } = await supabase
            .from("student_course_enrollments")
            .update({
              progress_percentage: progress,
              lessons_completed: completedCount || 0,
              total_lessons: totalLessons || 0,
              status: progress === 100 ? "completed" : "in_progress",
              updated_at: now.toISOString(),
            })
            .eq("id", enrollment.id);

          if (progressError) {
            console.error('❌ Failed to update course progress:', progressError);
          } else {
            console.log('✅ Course progress updated:', { progress: `${progress}%`, courseId });
          }
        } else {
          console.warn('⚠️ No enrollment found matching course:', { courseId, userId });
        }
      } else {
        console.warn('⚠️ No enrollments found for user:', { userId });
      }
    } catch (progressError) {
      console.error("Error updating course progress:", progressError);
      // Don't fail the request if progress update fails
    }

    return NextResponse.json({
      success: true,
      xpEarned,
      newXP,
      newLevel,
      leveledUp,
      streakUpdate,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

