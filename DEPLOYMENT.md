# Nadanaloga Deployment Guide for Portainer

## Prerequisites
- Portainer installed and running
- Docker environment
- Access to your Git repository
- Domain name configured (e.g., dev.nadanaloga.com)

## Deployment Options

### Option 1: Using Docker Repository (Recommended)
1. Build and push your Docker image first
2. Deploy using Portainer Stack

### Option 2: Using Git Repository
Deploy directly from Git repository using Portainer's Git integration

## Step-by-Step Deployment

### 1. Prepare Environment Variables
Copy the values from `.env.example` and update them as needed:

```bash
POSTGRES_PASSWORD=YourSecurePassword123!
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
VITE_SUPABASE_URL=https://ojuybeasovauzkntbydd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=nadanalogaa@gmail.com
SMTP_PASS=gbrsaojubuhoyrag
SMTP_FROM_EMAIL="Nadanaloga <nadanalogaa@gmail.com>"
CLIENT_URL=https://dev.nadanaloga.com
NODE_ENV=production
```

### 2A. Docker Image Deployment (Recommended)

#### Build and Push Image
```bash
# Build the image
docker build -t nadanaloga/app:latest .

# Tag for your registry (optional)
docker tag nadanaloga/app:latest your-registry/nadanaloga/app:latest

# Push to registry (optional)
docker push your-registry/nadanaloga/app:latest
```

#### Deploy in Portainer
1. Go to **Portainer** → **Stacks** → **Add Stack**
2. **Name**: `nadanaloga-production`
3. **Web editor**: Copy contents from `portainer-stack.yml`
4. **Environment variables**: Add all variables from step 1
5. Click **Deploy the stack**

### 2B. Git Repository Deployment

1. Go to **Portainer** → **Stacks** → **Add Stack**
2. **Name**: `nadanaloga-production`
3. **Repository**: Select Git repository option
4. **Repository URL**: `https://github.com/yourusername/your-repo.git`
5. **Repository reference**: `main` (or your branch)
6. **Compose path**: `docker-compose.yml`
7. **Environment variables**: Add all variables from step 1
8. Click **Deploy the stack**

### 3. Configure Nginx Proxy Manager

Based on your existing setup:

1. Go to **Nginx Proxy Manager** → **Proxy Hosts** → **Add Proxy Host**
2. **Details Tab**:
   - Domain Names: `dev.nadanaloga.com`
   - Scheme: `http`
   - Forward Hostname/IP: `your-docker-host-ip` or `nadanaloga-app`
   - Forward Port: `3000`
3. **SSL Tab**:
   - Request a new SSL Certificate
   - Use a DNS Challenge or HTTP Challenge
   - Force SSL: ✅
   - HTTP/2 Support: ✅
   - HSTS Enabled: ✅
   - HSTS Subdomains: ✅
4. Click **Save**

### 4. Verify Deployment

1. **Check Stack Status**: 
   - Go to Portainer → Stacks → nadanaloga-production
   - Ensure all services are running (green status)

2. **Check Health**:
   - App: `http://your-domain:3000/api/health`
   - Database: Check Portainer logs for postgres service

3. **Test Application**:
   - Visit `https://dev.nadanaloga.com`
   - Test key functionality

## Database Setup

The PostgreSQL database will automatically:
- Create the `nadanaloga` database
- Import your Supabase backup from `supabase_backup.sql`
- Set up the user `nadanaloga_user`

## Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Check if postgres service is healthy
   - Verify POSTGRES_PASSWORD matches in both services
   - Check database logs: Portainer → Containers → nadanaloga-postgres → Logs

2. **App Won't Start**:
   - Check app logs: Portainer → Containers → nadanaloga-app → Logs
   - Verify all environment variables are set
   - Ensure DATABASE_URL is correct

3. **502 Bad Gateway**:
   - Check if app is running on port 3000
   - Verify Nginx Proxy Manager configuration
   - Check network connectivity between services

### Logs Access
- **Portainer**: Containers → [service-name] → Logs
- **Real-time logs**: Use the log streaming feature

### Service Commands
```bash
# Restart stack
docker-compose restart

# View logs
docker-compose logs -f app
docker-compose logs -f postgres

# Check status
docker-compose ps
```

## Maintenance

### Updates
1. Pull latest code changes
2. In Portainer → Stacks → nadanaloga-production → Editor
3. Click **Update the stack**
4. Or rebuild and redeploy if using Docker images

### Backups
- Database: Use PostgreSQL backup tools
- Volumes: Back up named volumes in Portainer
- Application data: Located in `nadanaloga_app_uploads` volume

## Security Notes
- Change default passwords
- Use strong SESSION_SECRET
- Keep environment variables secure
- Regularly update Docker images
- Monitor logs for security issues

## Support
- Check application logs in Portainer
- Review Docker Compose configuration
- Test database connectivity
- Verify environment variables

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