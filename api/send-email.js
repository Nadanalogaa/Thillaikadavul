export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { to, name, subject, message } = req.body || {};
  if (!to || !subject || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields: to, subject, message' });
  }

  // Proxy to backend SMTP server (recommended approach)
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

  // Use Gmail API with service account (alternative to SMTP)
  const { GMAIL_API_KEY, SMTP_USER } = process.env;
  
  if (GMAIL_API_KEY && SMTP_USER) {
    try {
      // Simple Gmail send using REST API
      const emailContent = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${message}`;
      const encodedEmail = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GMAIL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedEmail })
      });

      if (response.ok) {
        return res.status(200).json({ 
          success: true, 
          method: 'gmail-api',
          message: 'Email sent successfully via Gmail API' 
        });
      } else {
        throw new Error(`Gmail API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Gmail API error:', error);
      // Fall through to error response
    }
  }

  // Not configured - return helpful error
  return res.status(501).json({
    success: false,
    error: 'Email not configured on Vercel. Set EMAIL_SERVER_URL to proxy to your backend, or set GMAIL_API_KEY for Gmail API.'
  });
}

