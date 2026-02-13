import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/auth/batches?organizationId=xxx&programId=xxx&departmentId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const programId = searchParams.get("programId");
    const departmentId = searchParams.get("departmentId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Build query with optional filters
    let query = supabase
      .from("student_batches")
      .select(`
        id, 
        name, 
        admission_year, 
        expected_graduation,
        total_students,
        program:programs(id, name, code, short_name),
        department:departments(id, name, code)
      `)
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (programId) {
      query = query.eq("program_id", programId);
    }

    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    const { data: batches, error } = await query.order("admission_year", { ascending: false });

    if (error) {
      console.error("Error fetching batches:", error);
      return NextResponse.json(
        { error: "Failed to fetch batches" },
        { status: 500 }
      );
    }

    return NextResponse.json({ batches: batches || [] });
  } catch (error) {
    console.error("Error in batches API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
