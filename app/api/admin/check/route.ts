import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

// Use service role key to bypass RLS for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    // Check if user is admin
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("email", session.user.email)
      .single();

    return NextResponse.json({
      isAdmin: user?.role === "admin",
    });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
