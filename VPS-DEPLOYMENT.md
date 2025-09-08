# VPS Deployment Guide - Nadanaloga Email Server

## 🚀 Universal SMTP Server Deployment

This guide works for **ANY** VPS provider (DigitalOcean, Linode, AWS, Google Cloud, etc.)

### 📋 Prerequisites

- VPS with Node.js support
- Domain name (optional but recommended)
- Email account (Gmail, Outlook, or custom domain)

## 🏗️ Step-by-Step Deployment

### 1. **Server Setup**

```bash
# Connect to your VPS
ssh root@your-vps-ip

# Install Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Create app directory
mkdir /var/www/nadanaloga
cd /var/www/nadanaloga
```

### 2. **Deploy Server Code**

```bash
# Upload server/ folder to VPS (use scp, git, or FTP)
# Example with git:
git clone https://github.com/Nadanalogaa/Thillaikadavul.git
cd Thillaikadavul/server

# Install dependencies
npm install

# Create production environment file
cp .env .env.production
```

### 3. **Configure Email Provider**

Edit `.env.production`:

#### Option A: Gmail (Easiest)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password  # Not regular password!
SMTP_FROM_EMAIL="Your Name <your-gmail@gmail.com>"
```

#### Option B: Custom Domain (Professional)
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=admin@yourdomain.com  
SMTP_PASS=your-password
SMTP_FROM_EMAIL="Nadanaloga <admin@yourdomain.com>"
```

#### Option C: SendGrid (High Volume)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM_EMAIL="Nadanaloga <noreply@yourdomain.com>"
```

### 4. **Firewall Configuration**

```bash
# Open required ports
sudo ufw allow 4000   # Your app port
sudo ufw allow 587    # SMTP port (outbound)
sudo ufw allow 465    # SMTP SSL port (outbound)
sudo ufw allow 22     # SSH
sudo ufw enable
```

### 5. **Start Server**

```bash
# Test the server first
NODE_ENV=production npm start

# If successful, run with PM2
pm2 start server.js --name "nadanaloga-email" --env production
pm2 save
pm2 startup  # Auto-start on reboot
```

### 6. **Domain Setup (Optional)**

```bash
# If you have a domain, set up reverse proxy with nginx
sudo apt install nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/nadanaloga

# Add this configuration:
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site and restart nginx
sudo ln -s /etc/nginx/sites-available/nadanaloga /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate (optional)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## 🔧 Frontend Configuration

Update your Vercel environment variables:

```env
# With domain:
VITE_SERVER_URL=https://api.yourdomain.com/api

# Without domain (direct IP):
VITE_SERVER_URL=http://your-vps-ip:4000/api
```

## 🧪 Testing

```bash
# Test email endpoint
curl -X POST http://your-vps-ip:4000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "name": "Test User",
    "subject": "Test Email",
    "message": "This is a test email from your VPS!"
  }'
```

## 📊 Monitoring

```bash
# Check server status
pm2 status
pm2 logs nadanaloga-email

# Check email service logs
pm2 logs nadanaloga-email --lines 50

# Restart if needed
pm2 restart nadanaloga-email
```

## 🔒 Security Best Practices

1. **Email Credentials**:
   - Use app-specific passwords for Gmail
   - Store credentials in environment files
   - Never commit credentials to git

2. **Server Security**:
   - Keep server updated: `sudo apt update && sudo apt upgrade`
   - Use strong SSH keys, disable password login
   - Configure firewall properly

3. **SSL/TLS**:
   - Use HTTPS for your API endpoint
   - Ensure SMTP uses TLS encryption (port 587)

## 🚨 Troubleshooting

### Email Connection Issues:

1. **Authentication Failed**:
   - Gmail: Enable 2FA and use app password
   - Outlook: Use app password or OAuth2
   - Custom domain: Verify SMTP settings with hosting provider

2. **Connection Timeout**:
   - Check VPS firewall settings
   - Verify SMTP ports (587, 465) are not blocked
   - Some VPS providers block SMTP by default

3. **Port Blocked**:
   ```bash
   # Test SMTP connection
   telnet smtp.gmail.com 587
   ```

### Common VPS Provider Notes:

- **DigitalOcean**: SMTP unblocked by default
- **AWS**: May need to request SMTP unblocking
- **Google Cloud**: SMTP blocked on port 25, use 587
- **Linode**: SMTP unblocked by default

## ✅ Success Checklist

- [ ] Server running on VPS
- [ ] Email provider configured
- [ ] SMTP connection verified
- [ ] Firewall ports opened  
- [ ] Frontend updated with server URL
- [ ] Test email sent successfully
- [ ] PM2 process manager configured
- [ ] SSL certificate installed (if using domain)

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs nadanaloga-email`
2. Verify environment variables are set correctly
3. Test SMTP connection manually
4. Check VPS provider's SMTP policies

Your email system will automatically detect the email provider and configure optimal settings!