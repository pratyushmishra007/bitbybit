import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Check if the current session user has admin role
 * Fetches from database if role is not in session
 * Supports: admin, platform_admin, org_admin, hod
 */
export async function checkAdminAccess(): Promise<{
  isAdmin: boolean;
  session: any;
  userRole?: string;
  organizationId?: string;
}> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { isAdmin: false, session: null };
  }

  // Check role from session OR fetch from database
  let userRole = (session.user as any).role;
  let organizationId = (session.user as any).organization_id;
  
  if (!userRole) {
    const { data: userData } = await supabase
      .from("users")
      .select("role, id, organization_id")
      .eq("email", session.user.email)
      .single();
    
    userRole = userData?.role;
    organizationId = userData?.organization_id;
    
    // Also update session user id if needed
    if (userData?.id && !session.user.id) {
      (session.user as any).id = userData.id;
    }
  }

  // Admin-level roles that can access admin features
  const adminRoles = ["admin", "platform_admin", "org_admin", "hod"];

  return {
    isAdmin: adminRoles.includes(userRole),
    session,
    userRole,
    organizationId,
  };
}

/**
 * Check if the current session user has teacher role
 * Fetches from database if role is not in session
 */
export async function checkTeacherAccess(): Promise<{
  isTeacher: boolean;
  session: any;
  userRole?: string;
}> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { isTeacher: false, session: null };
  }

  // Check role from session OR fetch from database
  let userRole = (session.user as any).role;
  
  if (!userRole) {
    const { data: userData } = await supabase
      .from("users")
      .select("role, id")
      .eq("email", session.user.email)
      .single();
    
    userRole = userData?.role;
    
    // Also update session user id if needed
    if (userData?.id && !session.user.id) {
      (session.user as any).id = userData.id;
    }
  }

  return {
    isTeacher: userRole === "teacher",
    session,
    userRole,
  };
}

/**
 * Get user role from session or database
 */
export async function getUserRole(): Promise<{
  role: string | null;
  session: any;
  userId?: string;
}> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { role: null, session: null };
  }

  let role = (session.user as any).role;
  let userId = (session.user as any).id;
  
  if (!role) {
    const { data: userData } = await supabase
      .from("users")
      .select("role, id")
      .eq("email", session.user.email)
      .single();
    
    role = userData?.role || null;
    userId = userData?.id;
  }

  return { role, session, userId };
}
