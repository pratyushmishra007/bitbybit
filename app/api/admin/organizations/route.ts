import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List all organizations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check role from session OR fetch from database
    let userRole = (session.user as any).role;
    if (!userRole) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("email", session.user.email)
        .single();
      userRole = userData?.role;
    }

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { data: organizations, error } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching organizations:", error);
      return NextResponse.json(
        { error: "Failed to fetch organizations" },
        { status: 500 }
      );
    }

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create new organization
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check role from session OR fetch from database
    let userRole = (session.user as any).role;
    if (!userRole) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("email", session.user.email)
        .single();
      userRole = userData?.role;
    }

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { name, type, code, contact_email, address, contact_phone, website } = body;

    if (!name || !type || !code || !contact_email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data: organization, error } = await supabase
      .from("organizations")
      .insert({
        name,
        type,
        code: code.toUpperCase(),
        contact_email,
        address,
        contact_phone,
        website,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating organization:", error);
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 }
      );
    }

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update organization
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check role from session OR fetch from database
    let userRole = (session.user as any).role;
    if (!userRole) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("email", session.user.email)
        .single();
      userRole = userData?.role;
    }

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get("id");
    const body = await req.json();
    const { name, type, contact_email, address, contact_phone, website } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const { data: organization, error } = await supabase
      .from("organizations")
      .update({
        name,
        type,
        contact_email,
        address,
        contact_phone,
        website,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating organization:", error);
      return NextResponse.json(
        { error: "Failed to update organization" },
        { status: 500 }
      );
    }

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete organization
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check role from session OR fetch from database
    let userRole = (session.user as any).role;
    if (!userRole) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("email", session.user.email)
        .single();
      userRole = userData?.role;
    }

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting organization:", error);
      return NextResponse.json(
        { error: "Failed to delete organization" },
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
