import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to verify org_admin access
async function getOrgAdminContext(email: string) {
  const { data: user, error } = await supabase
    .from("users")
    .select("id, role, organization_id")
    .eq("email", email)
    .single();

  if (error || !user) {
    return { error: "User not found", status: 404 };
  }

  if (user.role !== "org_admin") {
    return { error: "Access denied", status: 403 };
  }

  if (!user.organization_id) {
    return { error: "No organization assigned", status: 400 };
  }

  return { userId: user.id, organizationId: user.organization_id };
}

// GET - List pending users in organization
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const context = await getOrgAdminContext(session.user.email);
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const { organizationId } = context;

    const { data: pendingUsers, error } = await supabase
      .from("users")
      .select(`
        id,
        name,
        email,
        role,
        student_id,
        selected_class_id,
        created_at,
        selected_class:classes(id, name, code)
      `)
      .eq("organization_id", organizationId)
      .eq("account_status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending users:", error);
      return NextResponse.json({ error: "Failed to fetch pending users" }, { status: 500 });
    }

    const formattedUsers = (pendingUsers || []).map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.student_id,
      selectedClass: user.selected_class,
      createdAt: user.created_at,
    }));

    return NextResponse.json({ pendingUsers: formattedUsers });
  } catch (error) {
    console.error("Error in org-admin approvals API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Approve or reject a user
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const context = await getOrgAdminContext(session.user.email);
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const { organizationId } = context;
    const body = await req.json();
    const { userId, action } = body;

    if (!userId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    // Verify user belongs to this organization
    const { data: targetUser, error: userError } = await supabase
      .from("users")
      .select("id, organization_id, selected_class_id, role")
      .eq("id", userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.organization_id !== organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    // Update user status
    const { error: updateError } = await supabase
      .from("users")
      .update({
        account_status: newStatus,
        approved_at: action === "approve" ? new Date().toISOString() : null,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    // If approved and student with selected class, create enrollment
    if (action === "approve" && targetUser.role === "student" && targetUser.selected_class_id) {
      await supabase
        .from("class_enrollments")
        .upsert({
          user_id: userId,
          class_id: targetUser.selected_class_id,
          status: "active",
          enrolled_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,class_id",
        });
    }

    return NextResponse.json({
      message: `User ${action}d successfully`,
    });
  } catch (error) {
    console.error("Error in org-admin approvals POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
