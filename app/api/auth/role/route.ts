import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role from database
    const { data: userData, error } = await supabase
      .from("users")
      .select("role")
      .eq("email", session.user.email)
      .single();

    if (error || !userData) {
      console.error("Error fetching user role:", error);
      return NextResponse.json({ role: "student" }, { status: 200 });
    }

    return NextResponse.json({ role: userData.role || "student" }, { status: 200 });
  } catch (error) {
    console.error("Role fetch error:", error);
    return NextResponse.json({ role: "student" }, { status: 200 });
  }
}
