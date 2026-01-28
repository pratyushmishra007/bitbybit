import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Verify organization code
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Organization code is required" },
        { status: 400 }
      );
    }

    const { data: organization, error } = await supabase
      .from("organizations")
      .select("id, name, type, code")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !organization) {
      return NextResponse.json(
        { error: "Invalid organization code" },
        { status: 404 }
      );
    }

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Error verifying organization:", error);
    return NextResponse.json(
      { error: "Failed to verify organization" },
      { status: 500 }
    );
  }
}
