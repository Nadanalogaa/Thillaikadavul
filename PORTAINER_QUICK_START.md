# 🚀 Portainer Quick Start Guide

## Quick Deployment Steps

### 1. Environment Variables
Copy these into Portainer Stack environment section:

```
POSTGRES_PASSWORD=SecurePassword123!
SESSION_SECRET=43b3102eb9507c9d23fe5e7d944fae5552bf441cbfe0f0cfad087d0c0ffa176841fb7b3fbe12956c4c5f356c6de1e9cfa1c50c0ec98fade24986479aa9143c43
VITE_SUPABASE_URL=https://ojuybeasovauzkntbydd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdXliZWFzb3ZhdXprbnRieWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNzMwNjQsImV4cCI6MjA3MTk0OTA2NH0.UlGxceKspC5mDgQkENV19hhppEGaNB8iAZQMnkL1Mag
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdXliZWFzb3ZhdXprbnRieWRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM3MzA2NCwiZXhwIjoyMDcxOTQ5MDY0fQ.ILKtBMWajX5bDmiYguHOOjef-ShpG2LSs_RKBCbT63M
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=nadanalogaa@gmail.com
SMTP_PASS=gbrsaojubuhoyrag
SMTP_FROM_EMAIL="Nadanaloga <nadanalogaa@gmail.com>"
CLIENT_URL=https://dev.nadanaloga.com
NODE_ENV=production
```

### 2. Deploy via Git Repository (Easiest)

1. **Portainer** → **Stacks** → **Add Stack**
2. **Name**: `nadanaloga-app`
3. **Repository**: Select Git repository
4. **Repository URL**: Your git repository URL
5. **Compose path**: `docker-compose.yml`
6. **Environment variables**: Paste the variables from step 1
7. **Deploy the stack**

### 3. Nginx Proxy Manager Setup

Add new proxy host:
- **Domain**: `dev.nadanaloga.com`
- **Forward to**: `nadanaloga-app:3000` or your Docker host IP:3000
- **SSL**: Enable with Force SSL, HTTP/2, HSTS

### 4. What Happens Automatically

✅ PostgreSQL database created with `nadanaloga` name  
✅ Supabase backup imported automatically  
✅ Application built and started on port 3000  
✅ Health checks enabled for monitoring  
✅ Persistent volumes for database and uploads  

### 5. Check Status

- **Portainer**: Stacks → nadanaloga-app → Check all services are green
- **Health**: Visit your domain to test the application
- **Logs**: Check container logs if issues occur

That's it! Your application should be running at https://dev.nadanaloga.com