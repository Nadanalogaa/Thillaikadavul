const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { to, name, subject, message } = req.body || {};
  if (!to || !subject || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields: to, subject, message' });
  }

  // Optional proxy to backend SMTP server
  const proxyBase = process.env.EMAIL_SERVER_URL;
  if (proxyBase) {
    try {
      const response = await fetch(`${proxyBase.replace(/\/$/, '')}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, name, subject, message })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.success) {
        return res.status(200).json({ success: true, method: 'proxy', message: 'Sent via backend SMTP', details: data });
      }
      return res.status(response.status || 502).json({ success: false, error: data?.error || 'Backend email failed' });
    } catch (err) {
      console.error('Vercel email proxy error:', err);
      return res.status(502).json({ success: false, error: 'Failed to reach backend email server' });
    }
  }

  // Direct SMTP configuration for Vercel
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL } = process.env;
  
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return res.status(501).json({
      success: false,
      error: 'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables on Vercel, or set EMAIL_SERVER_URL to proxy to your backend.'
    });
  }

  try {
    const transporter = nodemailer.createTransporter({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const mailOptions = {
      from: SMTP_FROM_EMAIL || SMTP_USER,
      to,
      subject,
      html: message,
    };

    await transporter.sendMail(mailOptions);
    
    return res.status(200).json({ 
      success: true, 
      method: 'smtp',
      message: 'Email sent successfully via SMTP' 
    });
    
  } catch (error) {
    console.error('SMTP error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send email via SMTP: ' + error.message 
    });
  }
}

