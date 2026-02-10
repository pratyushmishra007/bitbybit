import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Start an assessment attempt
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get assessment
    const { data: assessment } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessmentId)
      .single();

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Check if published
    if (!assessment.is_published) {
      return NextResponse.json({ error: "Assessment not available" }, { status: 403 });
    }

    // Check if student is enrolled
    const { data: enrollment } = await supabase
      .from("class_enrollments")
      .select("id")
      .eq("class_id", assessment.class_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!enrollment && user.role === "student") {
      return NextResponse.json(
        { error: "You are not enrolled in this class" },
        { status: 403 }
      );
    }

    // Check time availability
    const now = new Date();
    if (assessment.start_time && new Date(assessment.start_time) > now) {
      return NextResponse.json({ error: "Assessment has not started yet" }, { status: 403 });
    }

    if (assessment.end_time && new Date(assessment.end_time) < now) {
      return NextResponse.json({ error: "Assessment has ended" }, { status: 403 });
    }

    // Check existing submissions
    const { data: submissions } = await supabase
      .from("assessment_submissions")
      .select("id, status, attempt_number")
      .eq("assessment_id", assessmentId)
      .eq("user_id", user.id)
      .order("attempt_number", { ascending: false });

    // Check for in-progress submission
    const inProgress = submissions?.find((s) => s.status === "in_progress");
    if (inProgress) {
      // Return existing in-progress submission
      return NextResponse.json({
        submission: {
          id: inProgress.id,
          attemptNumber: inProgress.attempt_number,
          resumed: true,
        },
      });
    }

    // Count completed attempts
    const completedAttempts = submissions?.filter((s) => s.status !== "in_progress").length || 0;

    // Check if can start new attempt
    if (completedAttempts > 0) {
      if (!assessment.allow_retakes) {
        return NextResponse.json(
          { error: "You have already completed this assessment" },
          { status: 403 }
        );
      }

      if (completedAttempts >= assessment.max_retakes) {
        return NextResponse.json(
          { error: "You have reached the maximum number of attempts" },
          { status: 403 }
        );
      }
    }

    // Create new submission
    const attemptNumber = completedAttempts + 1;

    const { data: submission, error } = await supabase
      .from("assessment_submissions")
      .insert({
        assessment_id: assessmentId,
        user_id: user.id,
        started_at: new Date().toISOString(),
        status: "in_progress",
        attempt_number: attemptNumber,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating submission:", error);
      return NextResponse.json({ error: "Failed to start assessment" }, { status: 500 });
    }

    return NextResponse.json({
      submission: {
        id: submission.id,
        attemptNumber: submission.attempt_number,
        startedAt: submission.started_at,
        durationMinutes: assessment.duration_minutes,
        endsAt: assessment.duration_minutes
          ? new Date(Date.now() + assessment.duration_minutes * 60 * 1000).toISOString()
          : null,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
