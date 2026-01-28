import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: contest, error } = await supabase
      .from("contests")
      .select(`
        *,
        contest_problems(*),
        contest_participants(count)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    const result = {
      ...contest,
      participant_count: contest.contest_participants?.[0]?.count || 0,
      problems: contest.contest_problems || [],
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching contest:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch contest" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("email", session.user?.email)
      .single();

    if (!user || !["admin", "teacher"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const { data: contest, error } = await supabase
      .from("contests")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(contest);
  } catch (error: any) {
    console.error("Error updating contest:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update contest" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("email", session.user?.email)
      .single();

    if (!user || !["admin", "teacher"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const { error } = await supabase.from("contests").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting contest:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete contest" },
      { status: 500 }
    );
  }
}
