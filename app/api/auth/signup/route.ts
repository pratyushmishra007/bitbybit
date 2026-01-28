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
      organizationId,
      classId,
      studentId,
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
      role: signupType === "teacher" ? "teacher" : "student", // Set role based on signup type
      account_status: "pending", // All new accounts need approval
      created_at: new Date().toISOString(),
    };

    // Add organization/class data for institutional users and teachers
    if (signupType === "institutional") {
      if (!organizationId || !classId || !studentId) {
        // Delete the auth user if validation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { error: "Organization, class, and student ID are required for institutional signup" },
          { status: 400 }
        );
      }

      userData.organization_id = organizationId;
      userData.class_id = classId;
      userData.student_id = studentId;

      // Create user record in users table (upsert in case trigger already created it)
      const { data: user, error: userError } = await supabase
        .from("users")
        .upsert(userData, { onConflict: 'id' })
        .select()
        .single();

      if (userError) {
        console.error("Error creating user:", userError);
        // Delete the auth user if users table insert fails
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
    } else if (signupType === "teacher") {
      // Teacher signup - require organization
      if (!organizationId) {
        // Delete the auth user if validation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { error: "Organization is required for teacher signup" },
          { status: 400 }
        );
      }

      userData.organization_id = organizationId;

      // Create user record in users table
      const { data: user, error: userError } = await supabase
        .from("users")
        .upsert(userData, { onConflict: 'id' })
        .select()
        .single();

      if (userError) {
        console.error("Error creating user:", userError);
        // Delete the auth user if users table insert fails
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
    } else {
      // Individual learner - no organization/class - AUTO APPROVE
      userData.account_status = "approved"; // Individual learners don't need approval
      
      const { data: user, error: userError } = await supabase
        .from("users")
        .upsert(userData, { onConflict: 'id' })
        .select()
        .single();

      if (userError) {
        console.error("Error creating user:", userError);
        // Delete the auth user if users table insert fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { error: "Failed to create user account" },
          { status: 500 }
        );
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
    }
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An error occurred during signup" },
      { status: 500 }
    );
  }
}
