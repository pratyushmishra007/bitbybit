import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get user's organization (for org_admin role)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and verify role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, role, organization_id, name, email")
      .eq("email", session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is org_admin
    if (user.role !== "org_admin") {
      return NextResponse.json(
        { error: "Access denied. Org admin role required." },
        { status: 403 }
      );
    }

    if (!user.organization_id) {
      return NextResponse.json(
        { error: "No organization assigned to this user" },
        { status: 400 }
      );
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug, code, type, is_active, logo_url, subscription_tier, settings")
      .eq("id", user.organization_id)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      organization,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error in org-admin organization API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update organization settings
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and verify role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, role, organization_id")
      .eq("email", session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "org_admin") {
      return NextResponse.json(
        { error: "Access denied. Org admin role required." },
        { status: 403 }
      );
    }

    if (!user.organization_id) {
      return NextResponse.json(
        { error: "No organization assigned to this user" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, slug, settings } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (settings) updateData.settings = settings;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: organization, error: updateError } = await supabase
      .from("organizations")
      .update(updateData)
      .eq("id", user.organization_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating organization:", updateError);
      return NextResponse.json(
        { error: "Failed to update organization" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (error) {
    console.error("Error in org-admin organization PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
