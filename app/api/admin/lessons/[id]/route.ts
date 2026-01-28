import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const lessonId = resolvedParams.id;
    const body = await request.json();

    const { error } = await supabase
      .from("lessons")
      .update({
        title: body.title,
        description: body.description,
        content: body.content,
        xp_reward: body.xp_reward,
        duration_minutes: body.duration_minutes,
        order_index: body.order_index,
        language: body.language || null,
        starter_code: body.starter_code || null,
        solution_code: body.solution_code || null,
        hints: body.hints || [],
        expected_output: body.expected_output || null,
        hints_enabled: body.hints_enabled !== false,
        test_cases: body.test_cases || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lessonId);

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Lesson update failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const lessonId = resolvedParams.id;

    // Get lesson info before deleting
    const { data: lesson } = await supabase
      .from("lessons")
      .select("course_id")
      .eq("id", lessonId)
      .single();

    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update course lesson count
    if (lesson) {
      const { data: lessons } = await supabase
        .from("lessons")
        .select("xp_reward")
        .eq("course_id", lesson.course_id);

      if (lessons) {
        const xp_total = lessons.reduce((sum, l) => sum + (l.xp_reward || 0), 0);
        await supabase
          .from("courses")
          .update({
            lessons_count: lessons.length,
            xp_total,
          })
          .eq("id", lesson.course_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Lesson delete failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
