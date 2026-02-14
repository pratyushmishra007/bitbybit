import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      name,
      signupType,
      // Organization data (for institutional & teacher)
      organizationId,
      // Legacy class-based enrollment (keeping for backward compatibility)
      classId,
      studentId,
      // NEW: Academic system data
      programId,
      departmentId,
      batchId,
      division,
    } = body;

    // Validate required fields
    if (!email || !password || !name || !signupType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists in auth
    const { data: existingAuthUser } = await supabase.auth.admin.listUsers();
    const userExists = existingAuthUser?.users.some(u => u.email === email);

    if (userExists) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { name }
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    // Prepare user data for users table
    const userData: any = {
      id: authData.user.id, // Use the same ID from Supabase Auth
      email,
      name,
      role: signupType === "teacher" ? "teacher" : "student",
      account_status: "pending", // All new accounts need approval
      created_at: new Date().toISOString(),
    };

    // ========================================================================
    // INSTITUTIONAL STUDENT SIGNUP (Academic System)
    // ========================================================================
    if (signupType === "institutional") {
      // Check if using new academic flow (with batchId) or legacy flow (with classId)
      const usingAcademicSystem = batchId && division;

      if (usingAcademicSystem) {
        // NEW ACADEMIC SYSTEM FLOW
        if (!organizationId || !batchId || !division) {
          await supabase.auth.admin.deleteUser(authData.user.id);
          return NextResponse.json(
            { error: "Organization, batch, and division are required for academic student signup" },
            { status: 400 }
          );
        }

        userData.organization_id = organizationId;

        // Create user record
        const { data: user, error: userError } = await supabase
          .from("users")
          .upsert(userData, { onConflict: 'id' })
          .select()
          .single();

        if (userError) {
          console.error("Error creating user:", userError);
          await supabase.auth.admin.deleteUser(authData.user.id);
          return NextResponse.json(
            { error: "Failed to create user account" },
            { status: 500 }
          );
        }

        // Get batch details to fetch program and department
        const { data: batchData } = await supabase
          .from("student_batches")
          .select("program_id, department_id, admission_year")
          .eq("id", batchId)
          .single();

        // Generate enrollment number
        // Format: YEAR/DIV/RANDOM (e.g., 2024/A/X7K9)
        const year = batchData?.admission_year || new Date().getFullYear();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const enrollmentNumber = `${year}/${division}/${random}`;

        // Create student registration
        const { data: registration, error: registrationError } = await supabase
          .from("student_registrations")
          .insert({
            user_id: user.id,
            batch_id: batchId,
            division: division,
            enrollment_number: enrollmentNumber,
            current_semester: 1,
            admission_date: new Date().toISOString().split('T')[0],
            admission_type: 'regular',
            status: 'active',
          })
          .select()
          .single();

        if (registrationError) {
          console.error("Error creating student registration:", registrationError);
          // Don't fail the signup, but log it - admin can fix later
        }

        // Update batch student count
        if (batchData) {
          try {
            await supabase
              .from("student_batches")
              .update({ total_students: (batchData as any).total_students + 1 || 1 })
              .eq("id", batchId);
          } catch (err) {
            console.warn("Could not update batch student count:", err);
          }
        }

        return NextResponse.json({
          success: true,
          message: "Account created successfully! Your account is pending approval. You will be able to sign in once approved.",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            accountStatus: user.account_status,
            enrollmentNumber: enrollmentNumber,
          },
        });

      } else {
        // LEGACY CLASS-BASED FLOW (backward compatibility)
        if (!organizationId || !classId || !studentId) {
          await supabase.auth.admin.deleteUser(authData.user.id);
          return NextResponse.json(
            { error: "Organization, class, and student ID are required for institutional signup" },
            { status: 400 }
          );
        }

        userData.organization_id = organizationId;
        userData.class_id = classId;
        userData.student_id = studentId;

        // Create user record in users table
        const { data: user, error: userError } = await supabase
          .from("users")
          .upsert(userData, { onConflict: 'id' })
          .select()
          .single();

        if (userError) {
          console.error("Error creating user:", userError);
          await supabase.auth.admin.deleteUser(authData.user.id);
          return NextResponse.json(
            { error: "Failed to create user account" },
            { status: 500 }
          );
        }

        // Enroll student in class
        const { error: enrollmentError } = await supabase
          .from("class_enrollments")
          .insert({
            class_id: classId,
            user_id: user.id,
            status: "active",
          });

        if (enrollmentError) {
          console.error("Error creating enrollment:", enrollmentError);
          // Don't fail - user is created, just log the error
        }

        return NextResponse.json({
          success: true,
          message: "Account created successfully! Your account is pending approval. You will be able to sign in once approved.",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            accountStatus: user.account_status,
          },
        });
      }
    }
    
    // ========================================================================
    // TEACHER SIGNUP
    // ========================================================================
    if (signupType === "teacher") {
      if (!organizationId) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { error: "Organization is required for teacher signup" },
          { status: 400 }
        );
      }

      userData.organization_id = organizationId;
      // Optionally link teacher to department
      if (departmentId) {
        userData.department_id = departmentId;
      }

      // Create user record in users table
      const { data: user, error: userError } = await supabase
        .from("users")
        .upsert(userData, { onConflict: 'id' })
        .select()
        .single();

      if (userError) {
        console.error("Error creating user:", userError);
        await supabase.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { error: "Failed to create user account" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Teacher account created successfully! Your account is pending approval from an administrator.",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountStatus: user.account_status,
        },
      });
    }

    // ========================================================================
    // INDIVIDUAL LEARNER / GLOBAL PLATFORM USER
    // ========================================================================
    // Individual learner - no organization/class - AUTO APPROVE
    userData.account_status = "approved"; // Individual learners don't need approval
    userData.role = "student"; // Could be "learner" in future for differentiation

    const { data: user, error: userError } = await supabase
      .from("users")
      .upsert(userData, { onConflict: 'id' })
      .select()
      .single();

    if (userError) {
      console.error("Error creating user:", userError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    // Initialize user problem stats for global platform
    try {
      await supabase.from("user_problem_stats").insert({
        user_id: user.id,
      });
    } catch (err) {
      console.warn("Could not create user_problem_stats:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully! You can now sign in and start learning.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        accountStatus: user.account_status,
      },
    });

  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An error occurred during signup" },
      { status: 500 }
    );
  }
}
