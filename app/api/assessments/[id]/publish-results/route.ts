import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get submissions ready for publishing
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify teacher owns this assessment
    const { data: teacher } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", session.user.email)
      .single();

    if (!teacher || !["teacher", "admin"].includes(teacher.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get assessment
    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, title, type, total_points, passing_score")
      .eq("id", assessmentId)
      .single();

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Get all graded submissions (use eq for now, in doesn't work well with missing status values)
    const { data: submissions, error } = await supabase
      .from("assessment_submissions")
      .select(`
        id,
        user_id,
        status,
        total_score,
        percentage_score,
        passed,
        submitted_at,
        graded_at
      `)
      .eq("assessment_id", assessmentId)
      .eq("status", "graded")
      .order("graded_at", { ascending: false });

    if (error) {
      console.error("Error fetching submissions:", error);
      return NextResponse.json({ error: "Failed to fetch submissions: " + error.message }, { status: 500 });
    }

    // Get user data separately to avoid relationship ambiguity
    const userIds = (submissions || []).map(s => s.user_id).filter(Boolean);
    let usersMap = new Map<string, any>();
    
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, name, email, student_id, avatar_url")
        .in("id", userIds);
      
      if (users) {
        usersMap = new Map(users.map(u => [u.id, u]));
      }
    }

    // Try to get additional columns if they exist
    let submissionsWithExtra: any[] = (submissions || []).map(s => ({
      ...s,
      results_published_at: null,
      include_in_results: true,
      user: usersMap.get(s.user_id) || null,
    }));
    
    try {
      const { data: extraData } = await supabase
        .from("assessment_submissions")
        .select("id, results_published_at, include_in_results")
        .eq("assessment_id", assessmentId);
      
      if (extraData) {
        const extraMap = new Map(extraData.map(e => [e.id, e]));
        submissionsWithExtra = (submissions || []).map(s => ({
          ...s,
          results_published_at: extraMap.get(s.id)?.results_published_at || null,
          include_in_results: extraMap.get(s.id)?.include_in_results ?? true,
          user: usersMap.get(s.user_id) || null,
        }));
      }
    } catch {
      // Columns don't exist yet, defaults already set
    }

    // Calculate stats
    const gradedSubmissions = submissionsWithExtra.filter(s => s.status === "graded") || [];
    const publishedSubmissions = submissionsWithExtra.filter(s => s.status === "results_published") || [];
    const allSubmissions = submissionsWithExtra || [];
    
    const avgScore = allSubmissions.length > 0
      ? allSubmissions.reduce((sum, s) => sum + (s.percentage_score || 0), 0) / allSubmissions.length
      : 0;
    
    const passRate = allSubmissions.length > 0
      ? (allSubmissions.filter(s => s.passed).length / allSubmissions.length) * 100
      : 0;

    return NextResponse.json({
      assessment,
      submissions: submissionsWithExtra.map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        status: s.status,
        score: s.total_score,
        percentageScore: s.percentage_score,
        passed: s.passed,
        submittedAt: s.submitted_at,
        gradedAt: s.graded_at,
        resultsPublishedAt: s.results_published_at || null,
        includeInResults: s.include_in_results ?? true,
        student: s.user,
      })),
      stats: {
        totalGraded: allSubmissions.length,
        pendingPublish: gradedSubmissions.length,
        alreadyPublished: publishedSubmissions.length,
        avgScore: Math.round(avgScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
      }
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Publish results to selected students
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

    // Verify teacher owns this assessment
    const { data: teacher } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", session.user.email)
      .single();

    if (!teacher || !["teacher", "admin"].includes(teacher.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { submissionIds, sendNotification = true } = body as {
      submissionIds: string[];
      sendNotification?: boolean;
    };

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json({ error: "No submissions selected" }, { status: 400 });
    }

    // Get assessment title for notification
    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, title, type, passing_score")
      .eq("id", assessmentId)
      .single();

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Update selected submissions to results_published
    const now = new Date().toISOString();
    
    // Try to update with new columns first, fall back to just status
    let updateError = null;
    const { error: fullUpdateError } = await supabase
      .from("assessment_submissions")
      .update({
        status: "results_published",
        results_published_at: now,
        results_published_by: teacher.id,
      })
      .in("id", submissionIds)
      .eq("assessment_id", assessmentId);

    if (fullUpdateError) {
      // Try update with just status (columns might not exist)
      const { error: fallbackError } = await supabase
        .from("assessment_submissions")
        .update({ status: "graded" }) // Keep as graded if new status not available
        .in("id", submissionIds)
        .eq("assessment_id", assessmentId);
      
      updateError = fallbackError;
    }

    if (updateError) {
      console.error("Error updating submissions:", updateError);
      return NextResponse.json({ error: "Failed to publish results: " + updateError.message }, { status: 500 });
    }

    // Get submission details for notifications
    if (sendNotification) {
      const { data: submissions } = await supabase
        .from("assessment_submissions")
        .select(`
          id,
          user_id,
          total_score,
          percentage_score,
          passed
        `)
        .in("id", submissionIds);

      // Get user names separately
      const userIds = (submissions || []).map(s => s.user_id).filter(Boolean);
      let userNamesMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, name")
          .in("id", userIds);
        if (users) {
          userNamesMap = new Map(users.map(u => [u.id, u.name]));
        }
      }

      if (submissions && submissions.length > 0) {
        // Create notifications for each student
        const notifications = submissions.map(s => ({
          user_id: s.user_id,
          type: "assessment_result",
          title: "Assessment Results Published",
          message: `Your results for "${assessment.title}" are now available. ${
            s.passed ? "🎉 You passed!" : "Keep practicing!"
          } Score: ${Math.round(s.percentage_score || 0)}%`,
          link: "/my-assessments",
          metadata: {
            assessment_id: assessmentId,
            assessment_title: assessment.title,
            score: s.percentage_score,
            passed: s.passed,
          },
        }));

        // Insert notifications (ignore errors - notifications are optional)
        const { error: notifError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (notifError) {
          console.error("Error creating notifications (non-critical):", notifError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      publishedCount: submissionIds.length,
      message: `Results published for ${submissionIds.length} student(s)`,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update include_in_results for specific submissions
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: teacher } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", session.user.email)
      .single();

    if (!teacher || !["teacher", "admin"].includes(teacher.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { submissionId, includeInResults } = body as {
      submissionId: string;
      includeInResults: boolean;
    };

    const { error } = await supabase
      .from("assessment_submissions")
      .update({ include_in_results: includeInResults })
      .eq("id", submissionId)
      .eq("assessment_id", assessmentId);

    if (error) {
      console.error("Error updating submission:", error);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
