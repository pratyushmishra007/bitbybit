import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

// Use service role key to bypass RLS for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log("🔐 Session:", { email: session?.user?.email, id: session?.user?.id });
    
    if (!session?.user?.email) {
      console.log("❌ No session found");
      return NextResponse.json(
        { success: false, role: "visitor" },
        { status: 401 }
      );
    }

    // First, let's see what's in the database
    const { data: allUsers } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("email", session.user.email);
    
    console.log("📋 All matching users:", allUsers);

    const { data: user, error } = await supabase
      .from("users")
      .select("role")
      .eq("email", session.user.email)
      .single();

    console.log("📊 Database query result:", { user, error });

    return NextResponse.json({
      success: true,
      role: user?.role || "student",
    });
  } catch (error) {
    console.error("❌ Error fetching user role:", error);
    return NextResponse.json(
      { success: false, role: "student" },
      { status: 500 }
    );
  }
}
