# Nadanaloga Academy - Portainer VPS Deployment Guide

## 🚀 Complete Migration Guide from Local to VPS Portainer

This guide will help you migrate your Nadanaloga Academy application with both `schema_final_complete.sql` and `schema_demo_bookings.sql` to your VPS using Portainer.

---

## 📋 Prerequisites

1. **VPS with Docker & Portainer installed**
2. **Domain name** (optional, can use IP address)
3. **Supabase project** (for authentication and additional features)
4. **Email service** (optional, for notifications)

---

## 🔧 Step 1: Prepare Your VPS

### Install Docker & Portainer (if not already installed)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Portainer
docker volume create portainer_data
docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce:latest
```

---

## 📁 Step 2: Upload Files to VPS

Upload these files to your VPS in a directory (e.g., `/home/ubuntu/nadanaloga/`):

1. **`docker-compose.portainer.yml`** (from deploy folder)
2. **`init-database.sql`** (combined schema from deploy folder)
3. **`Dockerfile`** (from your project root)
4. **`.env`** (create from `.env.example` template)
5. **`nginx.conf`** (if using nginx)
6. **Application source code** (entire project)

---

## ⚙️ Step 3: Configure Environment Variables

1. **Copy the environment template:**
   ```bash
   cp deploy/.env.example .env
   ```

2. **Edit `.env` file with your actual values:**
   ```bash
   nano .env
   ```

### Required Environment Variables:

```env
# Database
POSTGRES_PASSWORD=your-super-secure-postgres-password

# Application Security
SESSION_SECRET=your-super-secure-session-secret-key

# Supabase (Get from your Supabase project settings)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Email (Optional - for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# AI (Optional)
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

---

## 🐳 Step 4: Deploy via Portainer

### Method 1: Using Portainer Web Interface

1. **Access Portainer**: `https://your-vps-ip:9443`
2. **Go to Stacks** → **Add Stack**
3. **Name**: `nadanaloga-academy`
4. **Upload docker-compose.portainer.yml** or **paste its contents**
5. **Environment Variables**: Add from your `.env` file
6. **Deploy Stack**

### Method 2: Using Docker Compose (Command Line)

```bash
# Navigate to your project directory
cd /home/ubuntu/nadanaloga/

# Create and start services
docker-compose -f deploy/docker-compose.portainer.yml up -d

# Check status
docker-compose -f deploy/docker-compose.portainer.yml ps

# View logs
docker-compose -f deploy/docker-compose.portainer.yml logs -f
```

---

## 🔍 Step 5: Verify Deployment

### Check Database Initialization

```bash
# Connect to PostgreSQL container
docker exec -it nadanaloga-postgres psql -U nadanaloga_user -d nadanaloga

# Verify tables were created
\dt

# Check sample data
SELECT name FROM courses;
SELECT COUNT(*) FROM demo_bookings;

# Exit PostgreSQL
\q
```

### Check Application Health

```bash
# Test application endpoint
curl http://your-vps-ip:3000/api/health

# Check application logs
docker logs nadanaloga-app
```

### Test Database Schema

The `init-database.sql` script includes:
- ✅ Complete application schema (`schema_final_complete.sql`)
- ✅ Demo bookings system (`schema_demo_bookings.sql`)
- ✅ All indexes and performance optimizations
- ✅ Default courses: Bharatanatyam, Vocal, Drawing, Abacus
- ✅ Notification system with recipient_ids
- ✅ Events system with image support

---

## 🌐 Step 6: Configure Domain & SSL (Optional)

### Using Cloudflare (Recommended)

1. **Point your domain to VPS IP** in Cloudflare DNS
2. **Enable Cloudflare SSL/TLS** (Full or Full Strict)
3. **Update application URLs** in your `.env` file

### Using Let's Encrypt (Direct)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Update docker-compose to mount SSL certificates
# Uncomment SSL volumes in docker-compose.portainer.yml
```

---

## 📊 Step 7: Post-Deployment Setup

### 1. Create Admin User

Access your application and create the first admin user:
- **URL**: `http://your-vps-ip:3000` or `https://yourdomain.com`
- **Go to**: Registration → Select "Admin" role
- **Complete setup** through the admin panel

### 2. Upload Course Images

1. **Login as Admin**
2. **Go to**: Admin → Courses
3. **Upload images** for each course
4. **Test**: Visit registration page to see course images

### 3. Configure Email Notifications

1. **Set up email service** (Gmail, SendGrid, etc.)
2. **Update `.env`** with email credentials
3. **Restart application**: `docker-compose restart app`
4. **Test**: Create an event and send to students

---

## 🔧 Maintenance & Monitoring

### View Logs

```bash
# Application logs
docker logs nadanaloga-app -f

# Database logs
docker logs nadanaloga-postgres -f

# All services logs
docker-compose -f deploy/docker-compose.portainer.yml logs -f
```

### Backup Database

```bash
# Create backup
docker exec nadanaloga-postgres pg_dump -U nadanaloga_user nadanaloga > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker exec -i nadanaloga-postgres psql -U nadanaloga_user nadanaloga < backup.sql
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f deploy/docker-compose.portainer.yml up -d --build
```

---

## 🚨 Troubleshooting

### Database Issues

```bash
# Check database connection
docker exec nadanaloga-app node -e "console.log(process.env.DATABASE_URL)"

# Reset database (WARNING: This will delete all data)
docker-compose -f deploy/docker-compose.portainer.yml down -v
docker-compose -f deploy/docker-compose.portainer.yml up -d
```

### Application Not Starting

```bash
# Check environment variables
docker exec nadanaloga-app printenv

# Check if all required env vars are set
docker logs nadanaloga-app | grep -i error
```

### Port Conflicts

```bash
# Check what's using port 3000
sudo netstat -tlnp | grep :3000

# Change port in docker-compose.yml if needed
ports:
  - "8080:3000"  # Change external port to 8080
```

---

## 📱 Features Deployed

### ✅ Complete Application Features:
- **Student Management System**
- **Teacher Management**  
- **Course Management** with image uploads
- **Batch Management**
- **Events System** with notifications
- **Grade Exams**
- **Book Materials** sharing
- **Notice Board**
- **Fee Management**
- **Invoice System**
- **Demo Booking System** (NEW!)
- **Notification System**
- **Contact Management**
- **Media Library** for homepage

### ✅ Admin Panel Features:
- **Dashboard Analytics**
- **User Management**
- **Course Image Uploads**
- **Event Creation** with image support
- **Bulk Notifications**
- **Student Enrollment**
- **Teacher Assignment**
- **Fee Structure Management**

### ✅ Student Dashboard Features:
- **My Courses** view
- **Event Notifications**
- **Grade Exam Registration**
- **Material Downloads**
- **Notice Board**
- **Profile Management**

---

## 🎉 Success!

Your Nadanaloga Academy application is now successfully deployed on your VPS with Portainer! 

- **Application URL**: `http://your-vps-ip:3000`
- **Portainer URL**: `https://your-vps-ip:9443`
- **Database**: PostgreSQL with complete schema
- **Features**: All systems operational

### Next Steps:
1. **Configure your domain** for production use
2. **Set up SSL certificates** for security
3. **Configure email notifications** for user engagement
4. **Upload course content** and media
5. **Train your staff** on the admin panel

---

## 💡 Pro Tips

1. **Regular Backups**: Set up automated database backups
2. **Monitoring**: Use Portainer's monitoring features
3. **Updates**: Keep Docker images updated for security
4. **Scaling**: Use Docker Swarm if you need to scale
5. **CDN**: Use Cloudflare for better performance worldwide

---

**Congratulations! Your academy management system is now live! 🚀**