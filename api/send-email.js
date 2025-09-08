// Vercel serverless email endpoint.
// Default behavior: do NOT send email from Vercel.
// Use your backend SMTP server instead:
//  - Frontend: set VITE_SERVER_URL so the app calls your server /api/send-email
//  - Or set EMAIL_SERVER_URL here to proxy requests to your backend.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { to, name, subject, message } = req.body || {};
  if (!to || !subject || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields: to, subject, message' });
  }

  // Optional proxy to backend SMTP server
  const proxyBase = process.env.EMAIL_SERVER_URL; // e.g., https://your-server.onrender.com/api
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

  // Honest default: not configured to send
  return res.status(501).json({
    success: false,
    error: 'Email not configured on Vercel. Set VITE_SERVER_URL in the frontend to use your SMTP server, or set EMAIL_SERVER_URL here to proxy.'
  });
}

