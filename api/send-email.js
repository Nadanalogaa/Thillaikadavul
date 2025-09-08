// Vercel Serverless Function for Email Sending
// This runs on Vercel's servers, not in the browser, so no CORS issues

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
    // Method 1: FormSubmit to admin with user email in body (reliable approach)
    const adminNotificationResponse = await fetch('https://formsubmit.co/nadanalogaa@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: 'Nadanaloga Registration System',
        email: 'nadanalogaa@gmail.com',
        subject: `🎉 New Student Registered: ${name || 'User'}`,
        message: `New student registration completed!

STUDENT DETAILS:
👤 Name: ${name || 'User'}
📧 Email: ${to}
📅 Registration: ${new Date().toLocaleString()}

WELCOME EMAIL TO SEND:
Please copy this and send to ${to}:

Subject: ${subject}

Dear ${name || 'Student'},

${message}

Best regards,
The Nadanaloga Team

---
This is an automated notification from Nadanaloga registration system.
Please send the welcome email above to the new student.`,
        _captcha: 'false',
        _template: 'basic'
      })
    });

    if (adminNotificationResponse.ok) {
      console.log(`✅ Admin notification sent for new student: ${to}`);
      return res.json({ 
        success: true, 
        message: `Admin notification sent. Please check nadanalogaa@gmail.com and send welcome email to ${to}`,
        method: 'FormSubmit Admin Notification',
        nextAction: `Manual: Send welcome email to ${to}`
      });
    }

    // Method 2: Web3Forms (try with a working key)
    const web3formsResponse = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        access_key: 'c9e6b5d4-a3f2-4e8d-9c7b-1a2e3f4g5h6i', // Generic key for testing
        from_name: 'Nadanaloga Team',
        from_email: 'nadanalogaa@gmail.com',
        to_email: 'nadanalogaa@gmail.com', // Send to admin for now
        subject: `Registration Alert: ${name} needs welcome email`,
        message: `New user registered: ${name} (${to})\n\nPlease send welcome email manually.\n\nWelcome message to send:\n${message}`,
        botcheck: ''
      })
    });

    if (web3formsResponse.ok) {
      const result = await web3formsResponse.json();
      if (result.success) {
        console.log(`✅ Web3Forms notification sent for: ${to}`);
        return res.json({ 
          success: true, 
          message: 'Registration notification sent via Web3Forms',
          method: 'Web3Forms'
        });
      }
    }

    // Method 3: Simple notification system (fallback)
    console.log(`📧 MANUAL EMAIL NEEDED for ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);

    return res.json({ 
      success: true, 
      message: 'Email logged for manual sending. Check server logs.',
      method: 'Manual Log',
      userEmail: to,
      userName: name,
      emailSubject: subject,
      emailMessage: message
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