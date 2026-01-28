import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Bulk import users from CSV
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check role from session OR fetch from database
    let userRole = (session.user as any).role;
    
    if (!userRole && session.user.email) {
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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const organizationId = formData.get("organizationId") as string;
    const classId = formData.get("classId") as string;

    if (!file || !organizationId || !classId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Parse CSV
    const text = await file.text();
    const lines = text.split("\n").filter(line => line.trim());
    const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
    
    const nameIndex = headers.indexOf("name");
    const emailIndex = headers.indexOf("email");
    const studentIdIndex = headers.indexOf("student_id");
    const roleIndex = headers.indexOf("role");

    if (nameIndex === -1 || emailIndex === -1) {
      return NextResponse.json(
        { error: "CSV must have 'name' and 'email' columns" },
        { status: 400 }
      );
    }

    const defaultPassword = "password123"; // Default password for bulk imports
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    let imported = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const name = values[nameIndex];
      const email = values[emailIndex];
      const studentId = studentIdIndex !== -1 ? values[studentIdIndex] : null;
      const role = roleIndex !== -1 ? values[roleIndex] : "student";

      if (!name || !email) {
        errors.push(`Line ${i + 1}: Missing name or email`);
        continue;
      }

      try {
        // Create user
        const { data: user, error: userError } = await supabase
          .from("users")
          .insert({
            email,
            password: hashedPassword,
            name,
            role: role || "student",
            organization_id: organizationId,
            class_id: classId,
            student_id: studentId,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (userError) {
          errors.push(`Line ${i + 1}: ${userError.message}`);
          continue;
        }

        // Enroll in class
        await supabase.from("class_enrollments").insert({
          class_id: classId,
          user_id: user.id,
          status: "active",
        });

        imported++;
      } catch (error: any) {
        errors.push(`Line ${i + 1}: ${error.message}`);
      }
    }

    return NextResponse.json({
      imported,
      errors,
      message: `Successfully imported ${imported} users. ${errors.length} errors.`,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
