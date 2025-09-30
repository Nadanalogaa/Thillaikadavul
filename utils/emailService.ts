// Simple email service that works without backend
export interface EmailData {
  to: string;
  subject: string;
  body: string;
  recipientName?: string;
}

export class EmailService {
  // For development: Log emails to console and optionally open mailto
  static async sendEmail(emailData: EmailData): Promise<{ success: boolean; message: string }> {
    try {
      console.log('📧 Email Service - Sending Email:', {
        to: emailData.to,
        subject: emailData.subject,
        recipientName: emailData.recipientName,
        timestamp: new Date().toLocaleString()
      });

      console.log('📧 Email Content:', emailData.body);

      // Open mailto for actual email sending via user's email client
      const mailtoUrl = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
      window.open(mailtoUrl);

      return {
        success: true,
        message: `Email logged for ${emailData.to}`
      };
    } catch (error) {
      console.error('Email service error:', error);
      return {
        success: false,
        message: `Failed to send email: ${error}`
      };
    }
  }

  // Batch send emails
  static async sendBatchEmails(emails: EmailData[]): Promise<{ success: boolean; message: string }> {
    console.log(`📧 Batch Email Service - Sending ${emails.length} emails`);

    for (const email of emails) {
      await this.sendEmail(email);
    }

    return {
      success: true,
      message: `${emails.length} emails processed`
    };
  }
}

// Helper function to replace fetch calls to /api/send-email
export async function sendEmailViaService(emailData: EmailData): Promise<Response> {
  const result = await EmailService.sendEmail(emailData);

  // Return a mock Response object that matches what fetch would return
  return {
    ok: result.success,
    status: result.success ? 200 : 500,
    json: async () => ({ message: result.message }),
    text: async () => result.message
  } as Response;
}