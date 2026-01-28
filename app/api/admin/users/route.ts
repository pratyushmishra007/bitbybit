import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List all users with optional role filter
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    console.log("🔍 Session in /api/admin/users:", {
      hasSession: !!session,
      user: session?.user,
      role: (session?.user as any)?.role,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check role from session OR fetch from database
    let userRole = (session.user as any).role;
    
    if (!userRole) {
      console.log("⚠️ Role not in session, fetching from database...");
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("email", session.user.email)
        .single();
      
      userRole = userData?.role;
      console.log("📊 Fetched role from DB:", userRole);
    }

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const role = req.nextUrl.searchParams.get("role");

    let query = supabase
      .from("users")
      .select(`
        *,
        organization:organizations(id, name, code),
        class:classes(id, name, code)
      `)
      .order("created_at", { ascending: false });

    if (role) {
      query = query.eq("role", role);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete user
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
