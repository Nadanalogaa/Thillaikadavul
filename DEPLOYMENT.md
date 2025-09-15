# AWS Lightsail Deployment Guide

This guide will help you deploy the Nadanaloga educational platform on AWS Lightsail.

## Prerequisites

1. AWS Lightsail instance (Ubuntu 20.04 LTS or later)
2. Domain name (optional but recommended)
3. SSH access to your Lightsail instance

## Quick Deployment

1. **SSH into your Lightsail instance:**
   ```bash
   ssh ubuntu@your-lightsail-ip
   ```

2. **Download and run the deployment script:**
   ```bash
   wget https://raw.githubusercontent.com/Nadanalogaa/Nadanaloga/main/deploy.sh
   chmod +x deploy.sh
   sudo ./deploy.sh
   ```

3. **Update your domain configuration:**
   - Edit `/home/ubuntu/Nadanaloga/server/.env`
   - Change `CLIENT_URL=https://your-domain.com` to your actual domain
   - Restart the application: `pm2 restart nadanaloga-api`

4. **Setup SSL (if you have a domain):**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d your-domain.com
   ```

## Manual Deployment Steps

If you prefer to deploy manually:

1. **Update system and install dependencies:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx git
   sudo npm install -g pm2
   ```

2. **Clone the repository:**
   ```bash
   cd /home/ubuntu
   git clone https://github.com/Nadanalogaa/Nadanaloga.git
   cd Nadanaloga
   ```

3. **Install dependencies:**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

4. **Setup environment:**
   ```bash
   cp server/.env.production server/.env
   # Edit server/.env to update CLIENT_URL with your domain
   ```

5. **Build and deploy:**
   ```bash
   npm run build
   sudo cp nginx.conf /etc/nginx/sites-available/nadanaloga
   sudo ln -sf /etc/nginx/sites-available/nadanaloga /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t && sudo systemctl restart nginx
   ```

6. **Start the application:**
   ```bash
   pm2 start server/server.js --name "nadanaloga-api"
   pm2 startup ubuntu -u ubuntu --hp /home/ubuntu
   pm2 save
   ```

## Post-Deployment

- Application will be available at your domain or Lightsail IP
- API endpoints are available at `/api/*`
- Check application status: `pm2 status`
- View logs: `pm2 logs`
- Restart application: `pm2 restart nadanaloga-api`

## Security

The deployment script automatically configures:
- UFW firewall (ports 22, 80, 443)
- PM2 process management
- Nginx reverse proxy
- SSL-ready configuration

## Troubleshooting

1. **Check application logs:**
   ```bash
   pm2 logs nadanaloga-api
   ```

2. **Check Nginx status:**
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

3. **Restart services:**
   ```bash
   pm2 restart all
   sudo systemctl restart nginx
   ```

## Updates

To update your deployment:
```bash
cd /home/ubuntu/Nadanaloga
git pull origin main
npm install && cd server && npm install && cd ..
npm run build
pm2 restart nadanaloga-api
```