# 🚨 Fix: Container Name Conflict Error

## Error Message
```
Failed to deploy a stack: compose up operation failed:
Error response from daemon: Conflict. The container name
"/nadanaloga-sub-postgres" is already in use by container
"e3ce6247723f46d288d6b3489a0a719469f18eff8348fccfd269fff15dccdd0a"
```

## Root Cause
The old container from a previous deployment is still running and needs to be removed before the new deployment can use that name.

---

## 🔧 SOLUTION (Choose One Method)

### Method 1: Using the Cleanup Script (RECOMMENDED)

**On your server, run:**

```bash
# Download and run the cleanup script
chmod +x cleanup-docker.sh
./cleanup-docker.sh

# Then deploy
export BRANCH_NAME=main
docker compose up -d --build
```

---

### Method 2: Manual Cleanup (Quick Fix)

**Run these commands on your deployment server:**

```bash
# Stop the conflicting containers
docker stop nadanaloga-sub-postgres nadanaloga-sub-app

# Remove the containers
docker rm nadanaloga-sub-postgres nadanaloga-sub-app

# Now deploy
export BRANCH_NAME=main
docker compose up -d --build
```

---

### Method 3: Force Remove by Container ID

**If the name doesn't work, use the container ID from the error:**

```bash
# Remove by ID (from your error message)
docker rm -f e3ce6247723f

# Also remove the app container
docker ps -a | grep nadanaloga-sub-app | awk '{print $1}' | xargs docker rm -f

# Now deploy
export BRANCH_NAME=main
docker compose up -d --build
```

---

### Method 4: Nuclear Option (Complete Reset)

**⚠️ WARNING: This deletes ALL nadanaloga containers and data**

```bash
# Stop everything
docker compose down

# Remove all nadanaloga containers
docker ps -a | grep nadanaloga | awk '{print $1}' | xargs docker rm -f

# Remove volumes (DELETES DATA!)
docker volume ls | grep nadanaloga | awk '{print $2}' | xargs docker volume rm

# Remove networks
docker network ls | grep nadanaloga | awk '{print $2}' | xargs docker network rm

# Fresh deployment
export BRANCH_NAME=main
docker compose up -d --build
```

---

## 🎯 For Portainer Users

If deploying through Portainer:

1. **Go to Containers**
2. **Find containers with "nadanaloga-sub" in the name**
3. **Click Stop, then Remove**
4. **Redeploy the stack**

OR use Portainer's built-in cleanup:

1. **Go to Stacks**
2. **Remove the old stack completely**
3. **Redeploy fresh**

---

## ✅ Verify Deployment

After cleanup and redeployment:

```bash
# Check running containers
docker ps

# Should see (for main branch):
# nadanaloga-main-app
# nadanaloga-main-postgres

# Check logs
docker compose logs -f

# Test the application
curl http://localhost:3000/api/health
```

---

## 🔮 Prevent Future Conflicts

The docker-compose.yml has been updated to use branch-specific names:

**For Main Branch:**
```bash
export BRANCH_NAME=main
export APP_PORT=3000
docker compose up -d
```

**For Sub Branch:**
```bash
export BRANCH_NAME=sub
export APP_PORT=3001
docker compose up -d
```

Now both branches can run simultaneously without conflicts!

---

## 📞 Still Having Issues?

1. **Check if containers are still running:**
   ```bash
   docker ps -a | grep nadanaloga
   ```

2. **View container details:**
   ```bash
   docker inspect e3ce6247723f
   ```

3. **Check Docker daemon logs:**
   ```bash
   sudo journalctl -u docker -f
   ```

4. **Contact support:**
   - Email: nadanalogaa@gmail.com
   - Phone: +91 95668 66588
