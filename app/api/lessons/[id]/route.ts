import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: lessonId } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch lesson details
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    // Check if user has completed this lesson
    const { data: progressData } = await supabase
      .from("lesson_progress")
      .select("completed")
      .eq("user_id", session.user.id)
      .eq("lesson_id", lessonId)
      .single();

    return NextResponse.json({
      lesson,
      isCompleted: progressData?.completed || false,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
