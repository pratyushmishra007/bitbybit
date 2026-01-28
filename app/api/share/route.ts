import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { code, language, title, userId } = await req.json();

    if (!code || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate unique share ID
    const shareId = Math.random().toString(36).substring(2, 10);

    // Save shared code
    const { error } = await supabase.from("shared_code").insert({
      share_id: shareId,
      user_id: userId || null,
      code,
      language,
      title: title || "Untitled Code",
    });

    if (error) {
      console.error("Error sharing code:", error);
      return NextResponse.json(
        { error: "Failed to share code" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      shareId,
      shareUrl: `/share/${shareId}`,
    });
  } catch (error) {
    console.error("Error sharing code:", error);
    return NextResponse.json(
      { error: "Failed to share code" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shareId = searchParams.get("id");

    if (!shareId) {
      return NextResponse.json(
        { error: "Share ID required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("shared_code")
      .select("*")
      .eq("share_id", shareId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Code not found" }, { status: 404 });
    }

    // Increment view count
    await supabase
      .from("shared_code")
      .update({ views: (data.views || 0) + 1 })
      .eq("share_id", shareId);

    return NextResponse.json({ success: true, code: data });
  } catch (error) {
    console.error("Error fetching shared code:", error);
    return NextResponse.json(
      { error: "Failed to fetch code" },
      { status: 500 }
    );
  }
}
