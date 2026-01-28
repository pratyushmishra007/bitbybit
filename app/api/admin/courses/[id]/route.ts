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
    const courseId = resolvedParams.id;
    const body = await request.json();

    const { error } = await supabase
      .from("courses")
      .update({
        title: body.title,
        description: body.description,
        difficulty: body.difficulty,
        category: body.category,
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId);

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Course update failed:", error);
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

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("email", session.user.email)
      .single();

    if (!userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const resolvedParams = await params;
    const courseId = resolvedParams.id;

    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId);

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Course delete failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
