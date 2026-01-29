import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Student requests to join a session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, message } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    // Check if session exists and is active
    const { data: collabSession } = await supabase
      .from("collaboration_sessions")
      .select("id, session_name, created_by, is_active")
      .eq("id", sessionId)
      .single();

    if (!collabSession || !collabSession.is_active) {
      return NextResponse.json(
        { error: "Session not found or inactive" },
        { status: 404 }
      );
    }

    // Check if user is already a participant
    const { data: existingParticipant } = await supabase
      .from("session_participants")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", session.user.id)
      .single();

    if (existingParticipant) {
      return NextResponse.json(
        { error: "You are already in this session" },
        { status: 400 }
      );
    }

    // Check for existing pending request
    const { data: existingRequest } = await supabase
      .from("session_join_requests")
      .select("id, status")
      .eq("session_id", sessionId)
      .eq("user_id", session.user.id)
      .eq("status", "pending")
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending request for this session" },
        { status: 400 }
      );
    }

    // Create join request
    const { data: joinRequest, error } = await supabase
      .from("session_join_requests")
      .insert({
        session_id: sessionId,
        user_id: session.user.id,
        status: "pending",
        message: message || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating join request:", error);
      return NextResponse.json(
        { error: "Failed to create join request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      joinRequest,
      message: "Join request sent! Waiting for host approval.",
    });
  } catch (error) {
    console.error("Join request error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// GET - Fetch pending join requests for a session (for host/teacher)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    // Verify user is host or admin
    const { data: collabSession } = await supabase
      .from("collaboration_sessions")
      .select("created_by")
      .eq("id", sessionId)
      .single();

    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (
      collabSession?.created_by !== session.user.id &&
      user?.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Only session host can view join requests" },
        { status: 403 }
      );
    }

    // Fetch pending requests
    const { data: requests, error } = await supabase
      .from("session_join_requests")
      .select(`
        *,
        user:user_id(id, name, email, avatar)
      `)
      .eq("session_id", sessionId)
      .eq("status", "pending")
      .order("requested_at", { ascending: true });

    if (error) {
      console.error("Error fetching join requests:", error);
      return NextResponse.json(
        { error: "Failed to fetch join requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requests: requests || [],
    });
  } catch (error) {
    console.error("Fetch join requests error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
