import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess, checkTeacherAccess } from "@/lib/auth-helpers";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List pending approval requests
export async function GET(req: NextRequest) {
  try {
    const { session, isAdmin } = await checkAdminAccess();
    const { isTeacher } = await checkTeacherAccess();

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Teachers can see pending students, admins can see all pending
    let query = supabase
      .from("users")
      .select(`
        id,
        name,
        email,
        role,
        student_id,
        created_at,
        organization:organizations(id, name),
        class:classes(id, name, code)
      `)
      .eq("account_status", "pending")
      .order("created_at", { ascending: false });

    if (isTeacher && !isAdmin) {
      // Teachers only see pending students from their classes
      const teacherId = (session.user as any).id;
      
      // Get teacher's assigned classes
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("class_id")
        .eq("teacher_id", teacherId);

      const classIds = assignments?.map(a => a.class_id) || [];

      if (classIds.length === 0) {
        return NextResponse.json({ pending: [] });
      }

      query = query
        .eq("role", "student")
        .in("class_id", classIds);
    } else if (!isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: pending, error } = await query;

    if (error) {
      console.error("Error fetching pending approvals:", error);
      return NextResponse.json(
        { error: "Failed to fetch pending approvals" },
        { status: 500 }
      );
    }

    return NextResponse.json({ pending });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Approve or reject an account
export async function POST(req: NextRequest) {
  try {
    const { session, isAdmin } = await checkAdminAccess();
    const { isTeacher } = await checkTeacherAccess();

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, action, reason } = body; // action: "approve" or "reject"

    if (!userId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the pending user
    const { data: pendingUser, error: fetchError } = await supabase
      .from("users")
      .select("id, role, class_id, account_status")
      .eq("id", userId)
      .single();

    if (fetchError || !pendingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (pendingUser.account_status !== "pending") {
      return NextResponse.json(
        { error: "User is not pending approval" },
        { status: 400 }
      );
    }

    // Authorization check
    if (pendingUser.role === "teacher" && !isAdmin) {
      return NextResponse.json(
        { error: "Only admins can approve teachers" },
        { status: 403 }
      );
    }

    if (pendingUser.role === "student" && !isAdmin && !isTeacher) {
      return NextResponse.json(
        { error: "Only admins or teachers can approve students" },
        { status: 403 }
      );
    }

    // If teacher is approving, verify they teach this student's class
    if (isTeacher && !isAdmin && pendingUser.role === "student") {
      const teacherId = (session.user as any).id;
      const { data: assignment } = await supabase
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("class_id", pendingUser.class_id)
        .single();

      if (!assignment) {
        return NextResponse.json(
          { error: "You don't have permission to approve this student" },
          { status: 403 }
        );
      }
    }

    // Perform the action
    const updateData: any = {
      account_status: action === "approve" ? "approved" : "rejected",
      approved_by: (session.user as any).id,
      approved_at: new Date().toISOString(),
    };

    if (action === "reject" && reason) {
      updateData.rejection_reason = reason;
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json(
        { error: "Failed to update user status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User ${action}d successfully`,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
