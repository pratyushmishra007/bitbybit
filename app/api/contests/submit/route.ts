import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { contestId, code } = await request.json();

    // Get user
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get contest details
    const { data: contest } = await supabase
      .from("contests")
      .select("*")
      .eq("id", contestId)
      .single();

    if (!contest) {
      return NextResponse.json(
        { success: false, error: "Contest not found" },
        { status: 404 }
      );
    }

    // Check if already submitted
    const { data: existingSubmission } = await supabase
      .from("contest_submissions")
      .select("id")
      .eq("contest_id", contestId)
      .eq("user_id", user.id)
      .single();

    if (existingSubmission) {
      // Update existing submission
      await supabase
        .from("contest_submissions")
        .update({ code, submitted_at: new Date().toISOString() })
        .eq("id", existingSubmission.id);
    } else {
      // Create new submission
      await supabase
        .from("contest_submissions")
        .insert({
          contest_id: contestId,
          user_id: user.id,
          code,
          submitted_at: new Date().toISOString(),
        });

      // Award XP
      const { data: currentUser } = await supabase
        .from("users")
        .select("xp")
        .eq("id", user.id)
        .single();

      const newXP = (currentUser?.xp || 0) + contest.points;
      await supabase
        .from("users")
        .update({ xp: newXP })
        .eq("id", user.id);
    }

    return NextResponse.json({
      success: true,
      message: "Submission successful",
    });
  } catch (error) {
    console.error("Error submitting contest:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit" },
      { status: 500 }
    );
  }
}
