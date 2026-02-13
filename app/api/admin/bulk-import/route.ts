import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to check admin access
async function checkAdminAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 };
  }
  
  const userRole = (session.user as any).role;
  if (!["admin", "org_admin", "hod"].includes(userRole)) {
    return { error: "Forbidden - Admin access required", status: 403 };
  }
  
  return { 
    user: session.user,
    role: userRole,
    organizationId: (session.user as any).organization_id 
  };
}

interface CSVRow {
  name: string;
  email: string;
  roll_number?: string;
  enrollment_number?: string;
  division?: string;
  current_semester?: number;
}

// POST - Bulk import students from CSV
export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAdminAccess();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { 
      students, 
      organization_id, 
      batch_id, 
      default_division = "A",
      default_semester = 1,
      create_accounts = true 
    } = body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "No students provided" }, { status: 400 });
    }

    if (!organization_id) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    if (!batch_id) {
      return NextResponse.json({ error: "Batch ID is required" }, { status: 400 });
    }

    const results = {
      success: [] as string[],
      failed: [] as { email: string; error: string }[],
      skipped: [] as string[],
    };

    for (const student of students as CSVRow[]) {
      try {
        // Validate required fields
        if (!student.email) {
          results.failed.push({ email: "unknown", error: "Email is required" });
          continue;
        }

        const email = student.email.trim().toLowerCase();
        const name = student.name?.trim() || email.split("@")[0];

        // Check if user already exists
        let { data: existingUser } = await supabase
          .from("users")
          .select("id, email, organization_id")
          .eq("email", email)
          .single();

        let userId: string;

        if (existingUser) {
          // User exists
          userId = existingUser.id;
          
          // Check if already in different org
          if (existingUser.organization_id && existingUser.organization_id !== organization_id) {
            results.failed.push({ email, error: "User belongs to different organization" });
            continue;
          }

          // Update organization if not set
          if (!existingUser.organization_id) {
            await supabase
              .from("users")
              .update({ organization_id, role: "student" })
              .eq("id", userId);
          }
        } else if (create_accounts) {
          // Create new user account
          const { data: newUser, error: createError } = await supabase
            .from("users")
            .insert({
              email,
              name,
              role: "student",
              organization_id,
              account_status: "approved",
              xp: 0,
            })
            .select("id")
            .single();

          if (createError || !newUser) {
            results.failed.push({ email, error: createError?.message || "Failed to create user" });
            continue;
          }

          userId = newUser.id;
        } else {
          results.skipped.push(email);
          continue;
        }

        // Check if already registered in this batch
        const { data: existingReg } = await supabase
          .from("student_registrations")
          .select("id")
          .eq("student_id", userId)
          .eq("batch_id", batch_id)
          .single();

        if (existingReg) {
          results.skipped.push(email);
          continue;
        }

        // Check if registered in any batch
        const { data: anyReg } = await supabase
          .from("student_registrations")
          .select("id")
          .eq("student_id", userId)
          .single();

        if (anyReg) {
          results.failed.push({ email, error: "Already registered in another batch" });
          continue;
        }

        // Create student registration
        const { error: regError } = await supabase
          .from("student_registrations")
          .insert({
            student_id: userId,
            organization_id,
            batch_id,
            division: student.division || default_division,
            roll_number: student.roll_number || null,
            enrollment_number: student.enrollment_number || null,
            current_semester: student.current_semester || default_semester,
            status: "active",
            admission_date: new Date().toISOString().split("T")[0],
          });

        if (regError) {
          results.failed.push({ email, error: regError.message });
          continue;
        }

        results.success.push(email);
      } catch (err: any) {
        results.failed.push({ 
          email: student.email || "unknown", 
          error: err.message || "Unknown error" 
        });
      }
    }

    return NextResponse.json({
      message: `Imported ${results.success.length} students`,
      results,
      total: students.length,
    });
  } catch (error: any) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - Download CSV template
export async function GET(request: NextRequest) {
  const authResult = await checkAdminAccess();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const csvContent = `name,email,roll_number,enrollment_number,division,current_semester
John Doe,john.doe@university.edu,101,2024CS001,A,1
Jane Smith,jane.smith@university.edu,102,2024CS002,A,1
Bob Wilson,bob.wilson@university.edu,103,2024CS003,B,1`;

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="student_import_template.csv"',
    },
  });
}
