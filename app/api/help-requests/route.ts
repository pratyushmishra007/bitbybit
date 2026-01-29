import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Student raises hand
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, courseId, message, codeSnapshot, language } = body;

    if (!lessonId || !courseId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get student's class
    const { data: user } = await supabase
      .from("users")
      .select("class_id, role")
      .eq("id", session.user.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "student") {
      return NextResponse.json(
        { error: "Only students can raise hand" },
        { status: 403 }
      );
    }

    // Check if student already has a pending request for this lesson
    const { data: existingRequest } = await supabase
      .from("help_requests")
      .select("id, status")
      .eq("student_id", session.user.id)
      .eq("lesson_id", lessonId)
      .eq("status", "pending")
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending help request for this lesson" },
        { status: 400 }
      );
    }

    // Create help request
    const { data: helpRequest, error } = await supabase
      .from("help_requests")
      .insert({
        student_id: session.user.id,
        lesson_id: lessonId,
        course_id: courseId,
        message: message || null,
        code_snapshot: codeSnapshot || null,
        language: language || "javascript",
        status: "pending",
        priority: "normal",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating help request:", error);
      return NextResponse.json(
        { error: "Failed to create help request" },
        { status: 500 }
      );
    }

    console.log("✅ Help request created:", helpRequest.id);

    return NextResponse.json({
      success: true,
      helpRequest,
      message: "Help request sent! A teacher will assist you soon.",
    });
  } catch (error) {
    console.error("Help request error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// GET - Fetch help requests (for teachers)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    // Get user role
    const { data: user } = await supabase
      .from("users")
      .select("role, class_id")
      .eq("id", session.user.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let query = supabase
      .from("help_requests")
      .select(`
        *,
        student:student_id(id, name, email)
      `)
      .order("created_at", { ascending: true });

    // Filter by status
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Role-based filtering
    if (user.role === "student") {
      // Students see only their own requests
      query = query.eq("student_id", session.user.id);
    } else if (user.role === "teacher") {
      // Teachers see all help requests (can filter by class later if needed)
      // For now, show all pending requests to all teachers
    }
    // Admin sees all requests (no filter needed)

    const { data: helpRequests, error } = await query;

    if (error) {
      console.error("Error fetching help requests:", error);
      return NextResponse.json(
        { error: "Failed to fetch help requests" },
        { status: 500 }
      );
    }

    // Calculate wait times for pending requests
    const requestsWithWaitTime = helpRequests?.map((req) => ({
      ...req,
      waitTimeSeconds: req.status === "pending"
        ? Math.floor((Date.now() - new Date(req.created_at).getTime()) / 1000)
        : req.student_wait_time_seconds || 0,
    })) || [];

    return NextResponse.json({
      success: true,
      helpRequests: requestsWithWaitTime,
      count: requestsWithWaitTime.length,
    });
  } catch (error) {
    console.error("Fetch help requests error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel help request (student cancels)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("id");

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID required" },
        { status: 400 }
      );
    }

    // Update status to cancelled
    const { error } = await supabase
      .from("help_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId)
      .eq("student_id", session.user.id)
      .eq("status", "pending");

    if (error) {
      console.error("Error cancelling help request:", error);
      return NextResponse.json(
        { error: "Failed to cancel help request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Help request cancelled",
    });
  } catch (error) {
    console.error("Cancel help request error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
