// API route: /api/lessons/[id]/note
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const lessonId = resolvedParams.id;

    // Get user ID
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: note, error } = await supabase
      .from("user_notes")
      .select("content")
      .eq("user_id", userData.id)
      .eq("lesson_id", lessonId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error("Error fetching note:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ note: note?.content || "" });
  } catch (error: any) {
    console.error("Error in note API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const lessonId = resolvedParams.id;
    const { content } = await request.json();

    // Get user ID
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("user_notes")
      .upsert({
        user_id: userData.id,
        lesson_id: lessonId,
        content,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,lesson_id'
      });

    if (error) {
      console.error("Error saving note:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in note API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
