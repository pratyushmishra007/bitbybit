import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or teacher
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("email", session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (userData.role !== "admin" && userData.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, description, difficulty, category, lessons_count, xp_total } = body;

    // Insert new course
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .insert({
        id,
        title,
        description,
        difficulty,
        category,
        lessons_count: lessons_count || 0,
        xp_total: xp_total || 0,
      })
      .select()
      .single();

    if (courseError) {
      console.error("Course creation error:", courseError);
      return NextResponse.json(
        { error: "Failed to create course: " + courseError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, course });
  } catch (error) {
    console.error("Create course error:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}
