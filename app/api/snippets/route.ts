// API route: /api/snippets
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language") || "javascript";

    const { data: snippets, error } = await supabase
      .from("code_snippets")
      .select("*")
      .eq("language", language)
      .order("difficulty", { ascending: true })
      .order("title", { ascending: true });

    if (error) {
      console.error("Error fetching snippets:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ snippets });
  } catch (error: any) {
    console.error("Error in snippets API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
