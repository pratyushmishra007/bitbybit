import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Browse public courses available for self-enrollment
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Allow unauthenticated browsing but with limited info
    let userId: string | null = null;
    let organizationId: string | null = null;

    if (session?.user?.email) {
      const { data: user } = await supabase
        .from("users")
        .select("id, organization_id")
        .eq("email", session.user.email)
        .single();
      
      userId = user?.id || null;
      organizationId = user?.organization_id || null;
    }

    const url = new URL(req.url);
    const difficulty = url.searchParams.get("difficulty");
    const category = url.searchParams.get("category");
    const language = url.searchParams.get("language");
    const search = url.searchParams.get("search");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Build query for public courses
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
        learning_objectives,
        tags,
        created_at,
        creator:users!created_by (id, name),
        lessons:lessons (id)
      `)
      .eq("is_published", true)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    // Filter by organization if user is logged in
    if (organizationId) {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
    }

    // Apply filters
    if (difficulty) {
      query = query.eq("difficulty", difficulty);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (language) {
      query = query.eq("language", language);
    }
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,tags.cs.{${search}}`
      );
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: courses, error, count } = await query;

    if (error) {
      console.error("Error fetching public courses:", error);
      return NextResponse.json(
        { error: "Failed to fetch courses" },
        { status: 500 }
      );
    }

    // Get user's enrolled courses if logged in
    let enrolledCourseIds: string[] = [];
    if (userId) {
      const { data: enrollments } = await supabase
        .from("student_course_enrollments")
        .select("course_id")
        .eq("student_id", userId);
      
      enrolledCourseIds = enrollments?.map((e) => e.course_id) || [];
    }

    // Format response
    const formattedCourses = courses?.map((course: any) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      difficulty: course.difficulty,
      category: course.category,
      language: course.language,
      thumbnailUrl: course.thumbnail_url,
      estimatedHours: course.estimated_hours,
      learningObjectives: course.learning_objectives,
      tags: course.tags,
      lessonCount: course.lessons?.length || 0,
      creator: course.creator,
      isEnrolled: enrolledCourseIds.includes(course.id),
      createdAt: course.created_at,
    })) || [];

    // Get available filters
    const { data: categories } = await supabase
      .from("courses")
      .select("category")
      .eq("is_published", true)
      .eq("is_public", true)
      .not("category", "is", null);

    const { data: languages } = await supabase
      .from("courses")
      .select("language")
      .eq("is_published", true)
      .eq("is_public", true)
      .not("language", "is", null);

    const uniqueCategories = [...new Set(categories?.map((c) => c.category).filter(Boolean))];
    const uniqueLanguages = [...new Set(languages?.map((l) => l.language).filter(Boolean))];

    return NextResponse.json({
      courses: formattedCourses,
      pagination: {
        total: count || formattedCourses.length,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
      filters: {
        difficulties: ["beginner", "intermediate", "advanced"],
        categories: uniqueCategories,
        languages: uniqueLanguages,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
