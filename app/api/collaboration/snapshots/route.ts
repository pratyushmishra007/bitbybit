import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get code snapshots for a session
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this session
    const { data: collabSession } = await supabase
      .from("collaboration_sessions")
      .select("class_id")
      .eq("id", sessionId)
      .single();

    if (!collabSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("role, class_id")
      .eq("id", session.user.id)
      .single();

    if (
      user?.role === "student" &&
      user.class_id !== collabSession.class_id
    ) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Fetch snapshots
    const { data: snapshots, error } = await supabase
      .from("code_snapshots")
      .select(`
        *,
        user:user_id(id, name, email)
      `)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching snapshots:", error);
      return NextResponse.json(
        { error: "Failed to fetch snapshots" },
        { status: 500 }
      );
    }

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error("Get snapshots error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// POST - Create code snapshot
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, codeContent, language, snapshotType = "auto", description } = body;

    if (!sessionId || !codeContent) {
      return NextResponse.json(
        { error: "Session ID and code content are required" },
        { status: 400 }
      );
    }

    // Verify user is in this session
    const { data: participant } = await supabase
      .from("session_participants")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", session.user.id)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: "You are not in this session" },
        { status: 403 }
      );
    }

    // Create snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("code_snapshots")
      .insert({
        session_id: sessionId,
        user_id: session.user.id,
        code_content: codeContent,
        language,
        snapshot_type: snapshotType,
        description,
      })
      .select()
      .single();

    if (snapshotError) {
      console.error("Error creating snapshot:", snapshotError);
      return NextResponse.json(
        { error: "Failed to create snapshot" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      snapshot,
    });
  } catch (error) {
    console.error("Create snapshot error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
