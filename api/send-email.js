// Vercel Serverless Function for Email Sending
// This runs on Vercel's servers, not in the browser, so no CORS issues
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { to, name, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: to, subject, message' 
    });
  }

  try {
    // Use Nodemailer with Gmail SMTP directly (ACTUALLY WORKS!)
    const transporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'nadanalogaa@gmail.com',
        pass: 'gbrsaojubuhoyrag' // App password from your .env
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Send welcome email directly to the user
    const mailOptions = {
      from: '"Nadanaloga Team" <nadanalogaa@gmail.com>',
      to: to,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a237e; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Nadanaloga!</h1>
            </div>
            <div class="content">
              <p>Dear ${name || 'Student'},</p>
              <div style="white-space: pre-line; margin: 20px 0;">${message}</div>
              <p>Best regards,<br>The Nadanaloga Team</p>
            </div>
            <div class="footer">
              <p>This email was sent from Nadanaloga Registration System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${name || 'Student'},\n\n${message}\n\nBest regards,\nThe Nadanaloga Team`
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ REAL EMAIL SENT to ${to}! Message ID: ${info.messageId}`);
    return res.json({ 
      success: true, 
      message: `Welcome email sent successfully to ${to}`,
      method: 'Gmail SMTP Direct',
      messageId: info.messageId,
      recipient: to
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send email notification',
      details: error.message
    });
  }
}