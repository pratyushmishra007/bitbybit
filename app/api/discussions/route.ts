import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get("lessonId");
    const sortBy = searchParams.get("sortBy") || "recent";

    if (!lessonId) {
      return NextResponse.json(
        { error: "Lesson ID required" },
        { status: 400 }
      );
    }

    // Fetch discussions with user info
    const orderBy = sortBy === "popular" ? "upvotes" : "created_at";
    const { data, error } = await supabase
      .from("lesson_discussions")
      .select(`
        *,
        users (id, email, name)
      `)
      .eq("lesson_id", lessonId)
      .order(orderBy, { ascending: false });

    if (error) {
      console.error("Error fetching discussions:", error);
      return NextResponse.json(
        { error: "Failed to fetch discussions" },
        { status: 500 }
      );
    }

    // Format the response
    const comments = data.map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      userName: d.users?.name || d.users?.email?.split('@')[0] || "Anonymous",
      userRole: d.users?.role || "student",
      content: d.content,
      createdAt: d.created_at,
      upvotes: d.upvotes || 0,
      isSolution: d.is_solution || false,
    }));

    return NextResponse.json({ success: true, comments });
  } catch (error) {
    console.error("Error fetching discussions:", error);
    return NextResponse.json(
      { error: "Failed to fetch discussions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lessonId, courseId, content } = await req.json();

    if (!lessonId || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("lesson_discussions").insert({
      lesson_id: lessonId,
      course_id: courseId,
      user_id: session.user.id,
      content,
    });

    if (error) {
      console.error("Error creating discussion:", error);
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating discussion:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
