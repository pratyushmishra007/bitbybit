import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get("filter") || "all";

    let query = supabase
      .from("shared_code")
      .select(`
        id,
        share_id,
        title,
        language,
        views,
        created_at,
        user_id
      `);

    // Apply filters
    if (filter === "recent") {
      query = query.order("created_at", { ascending: false }).limit(20);
    } else if (filter === "popular") {
      query = query.order("views", { ascending: false }).limit(20);
    } else {
      query = query.order("created_at", { ascending: false }).limit(50);
    }

    const { data: codes, error: codesError } = await query;

    if (codesError) throw codesError;

    // Fetch user emails for each code
    const codesWithUsers = await Promise.all(
      (codes || []).map(async (code) => {
        const { data: userData } = await supabase
          .from("users")
          .select("email")
          .eq("id", code.user_id)
          .single();

        return {
          ...code,
          user: userData ? { email: userData.email } : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      codes: codesWithUsers,
    });
  } catch (error) {
    console.error("Error fetching community codes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch codes" },
      { status: 500 }
    );
  }
}
