import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const commentId = params.id;
    const { lessonId } = await req.json();

    // Verify the lesson belongs to the user or user is a teacher
    const { data: lesson } = await supabase
      .from("lessons")
      .select("course_id, courses(teacher_id)")
      .eq("id", lessonId)
      .single();

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Mark as solution
    await supabase
      .from("lesson_discussions")
      .update({ is_solution: true })
      .eq("id", commentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking solution:", error);
    return NextResponse.json(
      { error: "Failed to mark as solution" },
      { status: 500 }
    );
  }
}
