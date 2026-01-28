import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get current code for session
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;

    // Get latest code snapshot
    const { data: snapshot } = await supabase
      .from("code_snapshots")
      .select("code_content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      code: snapshot?.code_content || "// Start coding...\n",
    });
  } catch (error) {
    console.error("Get code error:", error);
    return NextResponse.json(
      { code: "// Start coding...\n" },
      { status: 200 }
    );
  }
}

// POST - Update code for session
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sessionId } = await params;
    const body = await req.json();
    const { code } = body;

    if (typeof code !== 'string') {
      return NextResponse.json(
        { error: "Invalid code" },
        { status: 400 }
      );
    }

    // Create new snapshot
    const { error } = await supabase
      .from("code_snapshots")
      .insert({
        session_id: sessionId,
        user_id: session.user.id,
        code_content: code,
        snapshot_type: "auto",
      });

    if (error) {
      console.error("Error saving code:", error);
      return NextResponse.json(
        { error: "Failed to save code" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update code error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
