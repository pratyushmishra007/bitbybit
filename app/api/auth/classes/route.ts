import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Get classes for an organization
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const { data: classes, error } = await supabase
      .from("classes")
      .select(`
        id,
        name,
        code,
        year_level,
        description,
        department:departments(id, name, code),
        semester:semesters(id, name, semester_number)
      `)
      .eq("organization_id", organizationId)
      .order("year_level", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching classes:", error);
      return NextResponse.json(
        { error: "Failed to fetch classes" },
        { status: 500 }
      );
    }

    return NextResponse.json({ classes: classes || [] });
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch classes" },
      { status: 500 }
    );
  }
}
