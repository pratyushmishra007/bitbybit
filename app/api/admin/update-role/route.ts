import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from("users")
      .select("role, id")
      .eq("email", session.user.email)
      .single();

    if (adminUser?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { userId, role } = await request.json();

    // Validate role
    const validRoles = ["student", "teacher", "admin", "visitor"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role" },
        { status: 400 }
      );
    }

    // Update user role
    const { error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", userId);

    if (error) throw error;

    // Log admin action
    await supabase.from("admin_logs").insert({
      admin_id: adminUser.id,
      action: "role_update",
      target_user_id: userId,
      details: { new_role: role },
    });

    return NextResponse.json({
      success: true,
      message: "Role updated successfully",
    });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update role" },
      { status: 500 }
    );
  }
}
