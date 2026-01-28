import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

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
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("email", session.user.email)
      .single();

    if (!userData || (userData.role !== "admin" && userData.role !== "teacher")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.course_id) {
      console.error("Missing course_id in request body:", body);
      return NextResponse.json(
        { error: "course_id is required" },
        { status: 400 }
      );
    }

    console.log("Creating lesson with course_id:", body.course_id);

    // Prepare lesson data, generating UUID for new lessons
    const lessonData: any = {
      id: body.id && body.id.trim() ? body.id : randomUUID(),
      course_id: body.course_id,
      title: body.title,
      description: body.description,
      content: body.content,
      xp_reward: body.xp_reward,
      order_index: body.order_index,
      duration_minutes: body.duration_minutes,
      language: body.language || null,
      starter_code: body.starter_code || null,
      solution_code: body.solution_code || null,
      hints: body.hints || [],
      expected_output: body.expected_output || null,
      hints_enabled: body.hints_enabled !== false,
      test_cases: body.test_cases || null,
    };

    const { error } = await supabase.from("lessons").insert(lessonData);

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update course lesson count
    const { data: lessons } = await supabase
      .from("lessons")
      .select("xp_reward")
      .eq("course_id", body.course_id);

    if (lessons) {
      const xp_total = lessons.reduce((sum, l) => sum + (l.xp_reward || 0), 0);
      await supabase
        .from("courses")
        .update({
          lessons_count: lessons.length,
          xp_total,
        })
        .eq("id", body.course_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Lesson creation failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
