import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List all classes assigned to the teacher
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role from session or database
    let userRole = (session.user as any).role;
    let teacherId = (session.user as any).id;
    
    if (!userRole) {
      const { data: user } = await supabase
        .from("users")
        .select("role")
        .eq("id", teacherId)
        .single();
      userRole = user?.role;
    }

    if (userRole !== "teacher" && userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: assignments, error } = await supabase
      .from("teacher_assignments")
      .select(`
        id,
        subject,
        class_id,
        classes!inner(
          id,
          name,
          code,
          year_level,
          capacity,
          organizations(name)
        )
      `)
      .eq("teacher_id", teacherId);

    if (error) {
      console.error("Error fetching classes:", error);
      return NextResponse.json(
        { error: "Failed to fetch classes" },
        { status: 500 }
      );
    }

    // Get enrollment counts for each class
    const classesWithCounts = await Promise.all(
      (assignments || []).map(async (assignment: any) => {
        const classData = Array.isArray(assignment.classes) 
          ? assignment.classes[0] 
          : assignment.classes;

        const { count } = await supabase
          .from("class_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("class_id", assignment.class_id)
          .eq("status", "active");

        const orgData = Array.isArray(classData.organizations)
          ? classData.organizations[0]
          : classData.organizations;

        return {
          id: classData.id,
          name: classData.name,
          code: classData.code,
          year_level: classData.year_level,
          capacity: classData.capacity,
          subject: assignment.subject,
          organization_name: orgData?.name || "Unknown",
          student_count: count || 0,
        };
      })
    );

    return NextResponse.json({ classes: classesWithCounts });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
