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

    // Check if already upvoted
    const { data: existing } = await supabase
      .from("discussion_upvotes")
      .select("*")
      .eq("discussion_id", commentId)
      .eq("user_id", session.user.id)
      .single();

    if (existing) {
      // Remove upvote
      await supabase
        .from("discussion_upvotes")
        .delete()
        .eq("discussion_id", commentId)
        .eq("user_id", session.user.id);

      // Decrement upvote count
      const { data: comment } = await supabase
        .from("lesson_discussions")
        .select("upvotes")
        .eq("id", commentId)
        .single();

      await supabase
        .from("lesson_discussions")
        .update({ upvotes: Math.max(0, (comment?.upvotes || 1) - 1) })
        .eq("id", commentId);
    } else {
      // Add upvote
      await supabase
        .from("discussion_upvotes")
        .insert({
          discussion_id: commentId,
          user_id: session.user.id,
        });

      // Increment upvote count
      const { data: comment } = await supabase
        .from("lesson_discussions")
        .select("upvotes")
        .eq("id", commentId)
        .single();

      await supabase
        .from("lesson_discussions")
        .update({ upvotes: (comment?.upvotes || 0) + 1 })
        .eq("id", commentId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error toggling upvote:", error);
    return NextResponse.json(
      { error: "Failed to toggle upvote" },
      { status: 500 }
    );
  }
}
