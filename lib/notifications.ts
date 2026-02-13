import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type NotificationType = 
  | "course_assigned"
  | "assessment_published"
  | "assessment_graded"
  | "help_request_received"
  | "help_request_accepted"
  | "approval_status"
  | "contest_starting"
  | "contest_ended"
  | "achievement_unlocked"
  | "streak_milestone"
  | "system";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification for a single user
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, link, metadata } = params;

  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message: message || null,
        link: link || null,
        metadata: metadata || {},
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return { success: false, error };
    }

    return { success: true, notification: data };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error };
  }
}

/**
 * Create notifications for multiple users (batch)
 */
export async function createNotificationsForUsers(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
) {
  const { type, title, message, link, metadata } = params;

  const notifications = userIds.map((userId) => ({
    user_id: userId,
    type,
    title,
    message: message || null,
    link: link || null,
    metadata: metadata || {},
    is_read: false,
  }));

  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert(notifications)
      .select();

    if (error) {
      console.error("Error creating batch notifications:", error);
      return { success: false, error };
    }

    return { success: true, count: data?.length || 0 };
  } catch (error) {
    console.error("Error creating batch notifications:", error);
    return { success: false, error };
  }
}

/**
 * Notify all students in a class
 */
export async function notifyClassStudents(
  classId: string,
  params: Omit<CreateNotificationParams, "userId">
) {
  try {
    // Get all active students in the class
    const { data: enrollments, error: enrollError } = await supabase
      .from("class_enrollments")
      .select("user_id")
      .eq("class_id", classId)
      .eq("status", "active");

    if (enrollError || !enrollments) {
      console.error("Error fetching class students:", enrollError);
      return { success: false, error: enrollError };
    }

    const userIds = enrollments.map((e) => e.user_id);
    return createNotificationsForUsers(userIds, params);
  } catch (error) {
    console.error("Error notifying class students:", error);
    return { success: false, error };
  }
}

/**
 * Notify all teachers assigned to a class
 */
export async function notifyClassTeachers(
  classId: string,
  params: Omit<CreateNotificationParams, "userId">
) {
  try {
    // Get all teachers assigned to this class
    const { data: assignments, error: assignError } = await supabase
      .from("teacher_assignments")
      .select("teacher_id")
      .eq("class_id", classId);

    if (assignError || !assignments) {
      console.error("Error fetching class teachers:", assignError);
      return { success: false, error: assignError };
    }

    const userIds = assignments.map((a) => a.teacher_id);
    return createNotificationsForUsers(userIds, params);
  } catch (error) {
    console.error("Error notifying class teachers:", error);
    return { success: false, error };
  }
}

/**
 * Notify all org admins in an organization
 */
export async function notifyOrgAdmins(
  organizationId: string,
  params: Omit<CreateNotificationParams, "userId">
) {
  try {
    const { data: admins, error: adminError } = await supabase
      .from("users")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("role", "org_admin");

    if (adminError || !admins) {
      console.error("Error fetching org admins:", adminError);
      return { success: false, error: adminError };
    }

    const userIds = admins.map((a) => a.id);
    return createNotificationsForUsers(userIds, params);
  } catch (error) {
    console.error("Error notifying org admins:", error);
    return { success: false, error };
  }
}

/**
 * Helper notification functions for common scenarios
 */
export const NotificationHelpers = {
  // When a course is assigned to a class
  courseAssigned: async (classId: string, courseName: string, semester: string) => {
    return notifyClassStudents(classId, {
      type: "course_assigned",
      title: "New Course Available",
      message: `"${courseName}" has been assigned for ${semester}`,
      link: "/my-courses",
    });
  },

  // When an assessment is published
  assessmentPublished: async (classId: string, assessmentName: string, assessmentId: string) => {
    return notifyClassStudents(classId, {
      type: "assessment_published",
      title: "New Assessment Available",
      message: `"${assessmentName}" is now available`,
      link: `/assessments/${assessmentId}`,
    });
  },

  // When a student's assessment is graded
  assessmentGraded: async (studentId: string, assessmentName: string, score: number, assessmentId: string) => {
    return createNotification({
      userId: studentId,
      type: "assessment_graded",
      title: "Assessment Graded",
      message: `Your submission for "${assessmentName}" has been graded: ${score}%`,
      link: `/assessments/${assessmentId}/result`,
      metadata: { score },
    });
  },

  // When a student raises hand (notify teachers)
  helpRequestReceived: async (classId: string, studentName: string, lessonTitle: string, requestId: string) => {
    return notifyClassTeachers(classId, {
      type: "help_request_received",
      title: "Help Request",
      message: `${studentName} needs help with "${lessonTitle}"`,
      link: `/teacher/students`,
      metadata: { requestId },
    });
  },

  // When teacher accepts help request (notify student)
  helpRequestAccepted: async (studentId: string, teacherName: string, sessionUrl: string) => {
    return createNotification({
      userId: studentId,
      type: "help_request_accepted",
      title: "Help is on the way!",
      message: `${teacherName} is ready to help you`,
      link: sessionUrl,
    });
  },

  // Account approval notification
  approvalStatus: async (userId: string, status: "approved" | "rejected", reason?: string) => {
    return createNotification({
      userId,
      type: "approval_status",
      title: status === "approved" ? "Account Approved!" : "Account Status Update",
      message: status === "approved"
        ? "Your account has been approved. Welcome to BitByBit!"
        : `Your account was not approved${reason ? `: ${reason}` : "."}`,
      link: status === "approved" ? "/dashboard" : undefined,
    });
  },

  // Contest starting soon
  contestStarting: async (classId: string, contestName: string, contestId: string, startsIn: string) => {
    return notifyClassStudents(classId, {
      type: "contest_starting",
      title: "Contest Starting Soon",
      message: `"${contestName}" starts in ${startsIn}`,
      link: `/contests/${contestId}`,
    });
  },

  // Achievement unlocked
  achievementUnlocked: async (userId: string, achievementName: string, xpReward: number) => {
    return createNotification({
      userId,
      type: "achievement_unlocked",
      title: "Achievement Unlocked!",
      message: `You earned "${achievementName}" (+${xpReward} XP)`,
      link: "/achievements",
      metadata: { achievementName, xpReward },
    });
  },
};
