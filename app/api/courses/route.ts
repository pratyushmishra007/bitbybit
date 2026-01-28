import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all courses
    const { data: courses, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching courses:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch courses", courses: [] },
        { status: 500 }
      );
    }

    console.log(`📚 Fetched ${courses?.length || 0} courses`);
    
    return NextResponse.json({ 
      success: true, 
      courses: courses || [],
      count: courses?.length || 0
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error", courses: [] },
      { status: 500 }
    );
  }
}
