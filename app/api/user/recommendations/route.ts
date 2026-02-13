import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get personalized course recommendations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, organization_id, xp")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's completed courses
    const { data: completedEnrollments } = await supabase
      .from("student_course_enrollments")
      .select("course_id, progress, course:courses(difficulty, category, language, tags)")
      .eq("student_id", user.id)
      .gte("progress", 100);

    const completedCourseIds = completedEnrollments?.map((e) => e.course_id) || [];
    
    // Get user's in-progress courses
    const { data: inProgressEnrollments } = await supabase
      .from("student_course_enrollments")
      .select("course_id, progress, course:courses(difficulty, category, language)")
      .eq("student_id", user.id)
      .lt("progress", 100);

    const inProgressCourseIds = inProgressEnrollments?.map((e) => e.course_id) || [];
    const allEnrolledIds = [...completedCourseIds, ...inProgressCourseIds];

    // Analyze user's learning patterns
    const completedCategories: string[] = [];
    const completedLanguages: string[] = [];
    const completedTags: string[] = [];
    let maxCompletedDifficulty = "beginner";

    completedEnrollments?.forEach((e: any) => {
      if (e.course?.category) completedCategories.push(e.course.category);
      if (e.course?.language) completedLanguages.push(e.course.language);
      if (e.course?.tags) completedTags.push(...(e.course.tags || []));
      if (e.course?.difficulty === "intermediate") maxCompletedDifficulty = "intermediate";
      if (e.course?.difficulty === "advanced") maxCompletedDifficulty = "advanced";
    });

    // Determine recommended difficulty
    const recommendedDifficulties = ["beginner"];
    if (maxCompletedDifficulty === "beginner" && completedCourseIds.length >= 2) {
      recommendedDifficulties.push("intermediate");
    } else if (maxCompletedDifficulty === "intermediate" && completedCourseIds.length >= 4) {
      recommendedDifficulties.push("intermediate", "advanced");
    } else if (maxCompletedDifficulty === "advanced") {
      recommendedDifficulties.push("intermediate", "advanced");
    }

    // Get all available courses not yet enrolled
    let query = supabase
      .from("courses")
      .select(`
        id,
        title,
        description,
        difficulty,
        category,
        language,
        thumbnail_url,
        estimated_hours,
        tags,
        prerequisites,
        lessons:lessons (id)
      `)
      .eq("is_published", true);

    // Filter by organization
    if (user.organization_id) {
      query = query.or(`organization_id.eq.${user.organization_id},organization_id.is.null,is_public.eq.true`);
    } else {
      query = query.eq("is_public", true);
    }

    const { data: availableCourses, error } = await query;

    if (error) {
      console.error("Error fetching courses:", error);
      return NextResponse.json(
        { error: "Failed to fetch recommendations" },
        { status: 500 }
      );
    }

    // Filter out already enrolled courses
    const unenrolledCourses = availableCourses?.filter(
      (c) => !allEnrolledIds.includes(c.id)
    ) || [];

    // Score each course based on relevance
    const scoredCourses = unenrolledCourses.map((course: any) => {
      let score = 0;
      const reasons: string[] = [];

      // Difficulty match
      if (recommendedDifficulties.includes(course.difficulty)) {
        score += 20;
        if (course.difficulty === recommendedDifficulties[recommendedDifficulties.length - 1]) {
          reasons.push("Next skill level");
          score += 10;
        }
      }

      // Category match (continuation of learning path)
      if (completedCategories.includes(course.category)) {
        score += 15;
        reasons.push(`Continue ${course.category} path`);
      }

      // Language match
      if (completedLanguages.includes(course.language)) {
        score += 10;
        reasons.push(`Uses ${course.language}`);
      }

      // Tag overlap
      const tagOverlap = (course.tags || []).filter((t: string) => completedTags.includes(t)).length;
      if (tagOverlap > 0) {
        score += tagOverlap * 5;
        reasons.push("Related topics");
      }

      // Prerequisites met
      const prereqs = course.prerequisites || [];
      const prereqsMet = prereqs.every((p: string) => 
        completedCourseIds.some((id) => id === p) || prereqs.length === 0
      );
      if (prereqsMet && prereqs.length > 0) {
        score += 25;
        reasons.push("Prerequisites completed");
      }

      // New category exploration bonus
      if (!completedCategories.includes(course.category) && completedCourseIds.length >= 3) {
        score += 5;
        reasons.push("Expand your skills");
      }

      // Popularity (lesson count as proxy)
      const lessonCount = course.lessons?.length || 0;
      if (lessonCount >= 10) score += 5;
      if (lessonCount >= 20) score += 5;

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        difficulty: course.difficulty,
        category: course.category,
        language: course.language,
        thumbnailUrl: course.thumbnail_url,
        estimatedHours: course.estimated_hours,
        lessonCount,
        tags: course.tags,
        score,
        reasons: reasons.slice(0, 3), // Top 3 reasons
      };
    });

    // Sort by score and take top recommendations
    const sortedCourses = scoredCourses.sort((a, b) => b.score - a.score);
    
    // Categorize recommendations
    const recommendations = {
      // Top recommendations based on score
      forYou: sortedCourses.slice(0, 5),
      
      // Continue your path (same category/language as completed)
      continueLearning: sortedCourses
        .filter((c) => completedCategories.includes(c.category) || completedLanguages.includes(c.language))
        .slice(0, 4),
      
      // Level up (next difficulty)
      levelUp: sortedCourses
        .filter((c) => c.difficulty === recommendedDifficulties[recommendedDifficulties.length - 1])
        .slice(0, 4),
      
      // Explore new areas
      explore: sortedCourses
        .filter((c) => !completedCategories.includes(c.category))
        .slice(0, 4),
    };

    // User stats for context
    const stats = {
      coursesCompleted: completedCourseIds.length,
      coursesInProgress: inProgressCourseIds.length,
      totalXp: user.xp || 0,
      currentLevel: maxCompletedDifficulty,
      suggestedLevel: recommendedDifficulties[recommendedDifficulties.length - 1],
      topCategories: [...new Set(completedCategories)].slice(0, 3),
      topLanguages: [...new Set(completedLanguages)].slice(0, 3),
    };

    return NextResponse.json({
      recommendations,
      stats,
      inProgress: inProgressEnrollments?.map((e: any) => ({
        courseId: e.course_id,
        progress: e.progress,
        title: e.course?.title,
      })) || [],
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
