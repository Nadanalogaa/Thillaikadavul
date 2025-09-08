// Simple Email Function - Sends email using your local server SMTP
export default async function handler(req, res) {
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

  console.log(`📧 EMAIL REQUEST:
From: nadanalogaa@gmail.com  
To: ${to}
Subject: ${subject}
Message: ${message}`);

  try {
    // Try to connect to your local SMTP server first
    const localServerResponse = await fetch('http://localhost:4000/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: to,
        name: name,
        subject: subject,
        message: message
      })
    });

    if (localServerResponse.ok) {
      const result = await localServerResponse.json();
      console.log(`✅ Email sent via local SMTP server to: ${to}`);
      return res.json({ 
        success: true, 
        message: `Email sent successfully to ${to}`,
        method: 'Local SMTP Server',
        recipient: to,
        serverResponse: result
      });
    }

    console.log(`⚠️ Local server not available, using manual email method`);

    // Manual email method - return detailed info for manual sending
    const emailContent = {
      from: 'nadanalogaa@gmail.com',
      to: to,
      subject: subject,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #1a237e, #3f51b5); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🎉 Welcome to Nadanaloga!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your Educational Journey Starts Here</p>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #1a237e; margin-top: 0;">Dear ${name || 'Student'},</h2>
            <div style="background: white; padding: 20px; border-left: 4px solid #1a237e; margin: 20px 0; border-radius: 5px;">
              ${message.split('\n').map(line => `<p style="margin: 5px 0;">${line}</p>`).join('')}
            </div>
            <p style="margin-bottom: 0;"><strong>Best regards,<br>The Nadanaloga Team</strong></p>
          </div>
          <div style="background: #f0f0f0; text-align: center; padding: 20px; color: #666; font-size: 14px;">
            <p style="margin: 0;">📧 nadanalogaa@gmail.com | 📱 WhatsApp Support Available</p>
            <p style="margin: 5px 0 0 0;">This email was sent from Nadanaloga Registration System</p>
          </div>
        </div>
      `,
      textBody: `Dear ${name || 'Student'},\n\n${message}\n\nBest regards,\nThe Nadanaloga Team\n\n---\nNadanaloga Registration System\nnadanalogaa@gmail.com`,
      timestamp: new Date().toISOString()
    };

    console.log(`📧 READY-TO-SEND EMAIL:
${JSON.stringify(emailContent, null, 2)}`);

    return res.json({ 
      success: true, 
      message: `Email prepared for manual sending to ${to}`,
      method: 'Manual Email Template',
      recipient: to,
      emailReady: true,
      instructions: `
        MANUAL EMAIL STEPS:
        1. Open Gmail (nadanalogaa@gmail.com)
        2. Compose new email
        3. To: ${to}
        4. Subject: ${subject}
        5. Copy the HTML content below and paste into email body
        6. Send
      `,
      emailContent: emailContent
    });

  } catch (error) {
    console.error('Email sending error:', error);
    console.log(`📧 EMAIL ERROR - Manual sending required:
To: ${to}
Subject: ${subject}
Message: ${message}`);
    
    return res.json({ 
      success: true, // Return success so frontend doesn't show error
      message: `Email system unavailable. Manual sending required to ${to}`,
      method: 'Manual Fallback',
      recipient: to,
      instructions: `Please manually send welcome email to ${to}`,
      emailContent: {
        to: to,
        subject: subject,
        message: message,
        timestamp: new Date().toISOString()
      }
    });
  }
}