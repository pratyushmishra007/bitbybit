import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { emailService, emailTemplates, sendTemplateEmail } from "@/lib/email-service";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Send email notification
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin/teacher role
    const { data: user } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", session.user.email)
      .single();

    if (!user || !["admin", "org_admin", "teacher"].includes(user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { type, recipientIds, data } = body;

    if (!type || !recipientIds || recipientIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: type, recipientIds" },
        { status: 400 }
      );
    }

    // Get recipient emails
    const { data: recipients, error: recipientsError } = await supabase
      .from("users")
      .select("id, email, name")
      .in("id", recipientIds);

    if (recipientsError || !recipients || recipients.length === 0) {
      return NextResponse.json({ error: "Recipients not found" }, { status: 404 });
    }

    const results: Array<{ userId: string; success: boolean; error?: string }> = [];

    // Send emails based on type
    for (const recipient of recipients) {
      let template;
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

      switch (type) {
        case 'welcome':
          template = emailTemplates.welcome({
            name: recipient.name || 'User',
            role: data.role || 'student',
            loginUrl: `${baseUrl}/auth/login`,
          });
          break;

        case 'teacher_approved':
          template = emailTemplates.teacherApproved({
            name: recipient.name || 'Teacher',
            loginUrl: `${baseUrl}/auth/login`,
          });
          break;

        case 'assessment_published':
          template = emailTemplates.assessmentPublished({
            studentName: recipient.name || 'Student',
            assessmentTitle: data.assessmentTitle,
            courseName: data.courseName,
            dueDate: data.dueDate,
            assessmentUrl: `${baseUrl}/assessments/${data.assessmentId}`,
          });
          break;

        case 'help_request_answered':
          template = emailTemplates.helpRequestAnswered({
            studentName: recipient.name || 'Student',
            lessonName: data.lessonName,
            teacherName: data.teacherName,
            lessonUrl: `${baseUrl}/lessons/${data.lessonId}`,
          });
          break;

        case 'weekly_digest':
          template = emailTemplates.weeklyDigest({
            name: recipient.name || 'User',
            xpEarned: data.xpEarned || 0,
            lessonsCompleted: data.lessonsCompleted || 0,
            streak: data.streak || 0,
            topCourse: data.topCourse,
            dashboardUrl: `${baseUrl}/dashboard`,
          });
          break;

        case 'contest_reminder':
          template = emailTemplates.contestReminder({
            name: recipient.name || 'Participant',
            contestName: data.contestName,
            startsAt: data.startsAt,
            contestUrl: `${baseUrl}/contests/${data.contestId}`,
          });
          break;

        default:
          results.push({ userId: recipient.id, success: false, error: 'Unknown template type' });
          continue;
      }

      const result = await sendTemplateEmail(template, recipient.email);
      results.push({ userId: recipient.id, ...result });

      // Log email in notifications table
      await supabase.from("notifications").insert({
        user_id: recipient.id,
        type: `email_${type}`,
        title: template.subject,
        message: `Email sent: ${template.subject}`,
        data: { emailType: type, ...data },
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Sent ${successCount} emails, ${failCount} failed`,
      results,
    });
  } catch (error) {
    console.error("Error sending email notifications:", error);
    return NextResponse.json(
      { error: "Failed to send emails" },
      { status: 500 }
    );
  }
}

// GET - Get email sending status/history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", session.user.email)
      .single();

    if (!user || !["admin", "org_admin", "teacher"].includes(user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const { data: emailLogs, error } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, created_at, data")
      .like("type", "email_%")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching email logs:", error);
      return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }

    return NextResponse.json({ emails: emailLogs });
  } catch (error) {
    console.error("Error in email API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
