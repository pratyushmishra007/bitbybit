// Email Service for BitByBit Platform
// Supports multiple providers: Resend, SendGrid, SMTP

export interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'smtp';
  apiKey?: string;
  from: string;
  replyTo?: string;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType: string;
  }>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

// Email Templates
export const emailTemplates = {
  // Welcome email for new users
  welcome: (data: { name: string; role: string; loginUrl: string }): EmailTemplate => ({
    subject: `Welcome to BitByBit, ${data.name}!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .content p { color: #475569; line-height: 1.7; margin: 0 0 20px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .features { background: #f8fafc; border-radius: 12px; padding: 24px; margin: 20px 0; }
    .features h3 { color: #1e293b; margin: 0 0 16px 0; }
    .features ul { color: #475569; margin: 0; padding-left: 20px; }
    .features li { margin-bottom: 8px; }
    .footer { background: #f1f5f9; padding: 24px 30px; text-align: center; color: #64748b; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to BitByBit!</h1>
      <p>Your coding journey starts here</p>
    </div>
    <div class="content">
      <p>Hi ${data.name},</p>
      <p>We're excited to have you join BitByBit as a <strong>${data.role}</strong>! Your account has been set up and you're ready to start.</p>
      
      <div class="features">
        <h3>What you can do:</h3>
        <ul>
          ${data.role === 'student' ? `
          <li>Learn to code with interactive lessons</li>
          <li>Track your progress and earn XP</li>
          <li>Take assessments and quizzes</li>
          <li>Compete in coding contests</li>
          <li>Get real-time help from teachers</li>
          ` : data.role === 'teacher' ? `
          <li>Create and manage courses</li>
          <li>Build assessments with auto-grading</li>
          <li>Monitor student progress in real-time</li>
          <li>Provide live help through collaboration</li>
          <li>Generate detailed reports</li>
          ` : `
          <li>Manage your organization</li>
          <li>Oversee teachers and students</li>
          <li>Configure departments and classes</li>
          <li>View organization-wide analytics</li>
          `}
        </ul>
      </div>
      
      <center>
        <a href="${data.loginUrl}" class="button">Get Started</a>
      </center>
      
      <p>If you have any questions, our support team is here to help!</p>
      <p>Happy coding!<br>The BitByBit Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} BitByBit. All rights reserved.</p>
      <p>You received this email because you signed up for BitByBit.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Welcome to BitByBit, ${data.name}!\n\nYour account as a ${data.role} is ready. Log in at: ${data.loginUrl}\n\nHappy coding!\nThe BitByBit Team`,
  }),

  // Teacher approval notification
  teacherApproved: (data: { name: string; loginUrl: string }): EmailTemplate => ({
    subject: "Your BitByBit Teacher Account is Approved!",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .content p { color: #475569; line-height: 1.7; margin: 0 0 20px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
    .footer { background: #f1f5f9; padding: 24px 30px; text-align: center; color: #64748b; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Account Approved!</h1>
      <p>You're ready to start teaching</p>
    </div>
    <div class="content">
      <p>Hi ${data.name},</p>
      <p>Great news! Your teacher account on BitByBit has been approved. You now have full access to all teacher features.</p>
      <p>You can now:</p>
      <ul style="color: #475569; line-height: 2;">
        <li>Create and manage courses</li>
        <li>Build assessments with various question types</li>
        <li>Monitor student progress</li>
        <li>Provide real-time help through collaboration</li>
      </ul>
      <center>
        <a href="${data.loginUrl}" class="button">Start Teaching</a>
      </center>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} BitByBit. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Hi ${data.name}, your teacher account has been approved! Log in at: ${data.loginUrl}`,
  }),

  // Assessment published notification
  assessmentPublished: (data: { studentName: string; assessmentTitle: string; courseName: string; dueDate?: string; assessmentUrl: string }): EmailTemplate => ({
    subject: `New Assessment: ${data.assessmentTitle}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .content p { color: #475569; line-height: 1.7; margin: 0 0 20px 0; }
    .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
    .footer { background: #f1f5f9; padding: 24px 30px; text-align: center; color: #64748b; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Assessment Available</h1>
      <p>${data.courseName}</p>
    </div>
    <div class="content">
      <p>Hi ${data.studentName},</p>
      <p>A new assessment has been published for you:</p>
      <div class="info-box">
        <strong>${data.assessmentTitle}</strong>
        ${data.dueDate ? `<br><span style="color: #92400e;">Due: ${data.dueDate}</span>` : ''}
      </div>
      <p>Make sure to complete it before the deadline!</p>
      <center>
        <a href="${data.assessmentUrl}" class="button">Take Assessment</a>
      </center>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} BitByBit. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Hi ${data.studentName}, a new assessment "${data.assessmentTitle}" is available for ${data.courseName}. ${data.dueDate ? `Due: ${data.dueDate}.` : ''} Take it at: ${data.assessmentUrl}`,
  }),

  // Help request answered
  helpRequestAnswered: (data: { studentName: string; lessonName: string; teacherName: string; lessonUrl: string }): EmailTemplate => ({
    subject: `Help Available for: ${data.lessonName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .content p { color: #475569; line-height: 1.7; margin: 0 0 20px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
    .footer { background: #f1f5f9; padding: 24px 30px; text-align: center; color: #64748b; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Help is Here!</h1>
      <p>A teacher has responded to your request</p>
    </div>
    <div class="content">
      <p>Hi ${data.studentName},</p>
      <p><strong>${data.teacherName}</strong> is ready to help you with <strong>${data.lessonName}</strong>.</p>
      <p>Join the collaboration session now to get assistance!</p>
      <center>
        <a href="${data.lessonUrl}" class="button">Join Session</a>
      </center>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} BitByBit. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Hi ${data.studentName}, ${data.teacherName} is ready to help you with ${data.lessonName}. Join at: ${data.lessonUrl}`,
  }),

  // Weekly progress digest
  weeklyDigest: (data: { name: string; xpEarned: number; lessonsCompleted: number; streak: number; topCourse: string; dashboardUrl: string }): EmailTemplate => ({
    subject: "Your Weekly Progress on BitByBit",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .content p { color: #475569; line-height: 1.7; margin: 0 0 20px 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
    .stat-card { background: #f8fafc; padding: 20px; border-radius: 12px; text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #6366f1; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
    .footer { background: #f1f5f9; padding: 24px 30px; text-align: center; color: #64748b; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly Progress</h1>
      <p>Here's what you accomplished this week</p>
    </div>
    <div class="content">
      <p>Hi ${data.name},</p>
      <p>Great work this week! Here's a summary of your progress:</p>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${data.xpEarned.toLocaleString()}</div>
          <div class="stat-label">XP Earned</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.lessonsCompleted}</div>
          <div class="stat-label">Lessons Done</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.streak}</div>
          <div class="stat-label">Day Streak</div>
        </div>
      </div>
      
      ${data.topCourse ? `<p>Your most active course: <strong>${data.topCourse}</strong></p>` : ''}
      
      <p>Keep up the momentum!</p>
      
      <center>
        <a href="${data.dashboardUrl}" class="button">Continue Learning</a>
      </center>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} BitByBit. All rights reserved.</p>
      <p><a href="${data.dashboardUrl}/settings" style="color: #64748b;">Unsubscribe from weekly emails</a></p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Hi ${data.name}, here's your weekly progress: ${data.xpEarned} XP earned, ${data.lessonsCompleted} lessons completed, ${data.streak} day streak. Keep it up!`,
  }),

  // Contest starting soon
  contestReminder: (data: { name: string; contestName: string; startsAt: string; contestUrl: string }): EmailTemplate => ({
    subject: `Contest Starting Soon: ${data.contestName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .content p { color: #475569; line-height: 1.7; margin: 0 0 20px 0; }
    .countdown { background: #fdf2f8; border: 2px solid #ec4899; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
    .countdown-time { font-size: 36px; font-weight: bold; color: #be185d; }
    .button { display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
    .footer { background: #f1f5f9; padding: 24px 30px; text-align: center; color: #64748b; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Contest Alert!</h1>
      <p>${data.contestName}</p>
    </div>
    <div class="content">
      <p>Hi ${data.name},</p>
      <p>Don't forget - you're registered for an upcoming contest!</p>
      
      <div class="countdown">
        <div style="color: #64748b; margin-bottom: 8px;">STARTS AT</div>
        <div class="countdown-time">${data.startsAt}</div>
      </div>
      
      <p>Make sure you're ready to compete. Good luck! 🏆</p>
      
      <center>
        <a href="${data.contestUrl}" class="button">View Contest</a>
      </center>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} BitByBit. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Hi ${data.name}, the contest "${data.contestName}" starts at ${data.startsAt}. Good luck! View at: ${data.contestUrl}`,
  }),
};

// Email Service Class
class EmailService {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async send(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { provider, apiKey, from } = this.config;

    try {
      switch (provider) {
        case 'resend':
          return await this.sendWithResend(payload, apiKey!, from);
        case 'sendgrid':
          return await this.sendWithSendGrid(payload, apiKey!, from);
        case 'smtp':
          // SMTP would require nodemailer setup
          console.log('SMTP not implemented, logging email:', payload);
          return { success: true, messageId: 'smtp-mock-' + Date.now() };
        default:
          throw new Error(`Unknown email provider: ${provider}`);
      }
    } catch (error: any) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  private async sendWithResend(payload: EmailPayload, apiKey: string, from: string) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo || this.config.replyTo,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Resend API error');
    }

    return { success: true, messageId: data.id };
  }

  private async sendWithSendGrid(payload: EmailPayload, apiKey: string, from: string) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: (Array.isArray(payload.to) ? payload.to : [payload.to]).map(email => ({ email })),
        }],
        from: { email: from },
        subject: payload.subject,
        content: [
          { type: 'text/plain', value: payload.text || '' },
          { type: 'text/html', value: payload.html },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'SendGrid API error');
    }

    return { success: true, messageId: response.headers.get('x-message-id') || undefined };
  }
}

// Create and export singleton instance
export const emailService = new EmailService({
  provider: (process.env.EMAIL_PROVIDER as 'resend' | 'sendgrid' | 'smtp') || 'smtp',
  apiKey: process.env.EMAIL_API_KEY,
  from: process.env.EMAIL_FROM || 'BitByBit <noreply@bitbybit.edu>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@bitbybit.edu',
});

// Helper function to send templated emails
export async function sendTemplateEmail(
  template: EmailTemplate,
  to: string | string[]
): Promise<{ success: boolean; error?: string }> {
  return emailService.send({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}
