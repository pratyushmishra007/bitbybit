import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List all active companies (public endpoint for authenticated users)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: companies, error } = await supabase
      .from("companies")
      .select("id, name, slug, logo_url, problem_count")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching companies:", error);
      return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
    }

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Companies API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
