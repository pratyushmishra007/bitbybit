import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user data with organization and class info
    const { data: user, error } = await supabase
      .from("users")
      .select(`
        *,
        organizations(name),
        classes(name, code)
      `)
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return NextResponse.json(
        { error: "Failed to fetch user profile" },
        { status: 500 }
      );
    }

    // Format the response
    const userData = {
      ...user,
      organization_name: user.organizations?.name,
      class_name: user.classes?.name,
      class_code: user.classes?.code,
    };

    // Remove nested objects
    delete userData.organizations;
    delete userData.classes;

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Profile API error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
