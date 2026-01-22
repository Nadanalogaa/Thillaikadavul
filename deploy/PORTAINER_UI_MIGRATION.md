# Portainer UI Migration Guide (No Docker CLI Required)

Since Docker CLI is not available on your local machine, follow this guide to import your database using **Portainer's Web UI only**.

---

## Overview

Your Portainer is running on a remote server, so we'll use:
- ✅ Portainer Web Console
- ✅ File upload through Portainer
- ✅ SQL commands in PostgreSQL console

**No Docker CLI needed!**

---

## Step 1: Upload Backup File to Container (5 minutes)

### Option A: Using Portainer File Browser (Recommended)

Unfortunately, Portainer doesn't have a direct file upload feature. We'll use the console instead.

### Option B: Using Portainer Console + Copy-Paste

1. **Open your backup file locally:**
   ```bash
   # On your Mac, open the file
   open -a TextEdit /Users/ayyappanp/Documents/tk/Thillaikadavul/supabase_backup.sql
   ```

2. **This file is too large to copy-paste directly.** See Option C below.

### Option C: Upload via Web Server (Best Method)

We'll host the file temporarily and download it to the container:

#### Step C1: Host the Backup File

**On your Mac:**

```bash
# Navigate to your project
cd /Users/ayyappanp/Documents/tk/Thillaikadavul

# Start a simple HTTP server (Python 3)
python3 -m http.server 8080
```

Leave this running in your terminal. It will show:
```
Serving HTTP on :: port 8080 (http://[::]:8080/) ...
```

#### Step C2: Get Your Mac's Local IP Address

```bash
# In a new terminal window
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Look for something like: `inet 192.168.1.100` (your local network IP)

#### Step C3: Download to Container

1. **Go to Portainer** → **Containers** → `nadanaloga-sub-postgres`
2. Click **>_ Console**
3. Choose **Command**: `/bin/sh` (or `/bin/bash`)
4. Click **Connect**

In the console, run:

```bash
# Install wget if needed (Alpine Linux)
apk add --no-cache wget

# Download the backup file
# Replace 192.168.1.100 with your Mac's IP from Step C2
cd /tmp
wget http://192.168.1.100:8080/supabase_backup.sql

# Verify download
ls -lh supabase_backup.sql
```

**Expected output:** You should see the file size (several MB)

---

## Step 2: Import the Backup (10 minutes)

Still in the **Portainer Console** for `nadanaloga-sub-postgres`:

### Step 2.1: Create Database and User

```bash
# Connect as postgres superuser
psql -U postgres

# In the PostgreSQL prompt, run:
```

```sql
-- Create database
CREATE DATABASE nadanaloga;

-- Create user (change password!)
CREATE USER nadanaloga_user WITH PASSWORD 'SecurePassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE nadanaloga TO nadanaloga_user;

-- Exit
\q
```

### Step 2.2: Import the Backup

```bash
# Import the SQL file
psql -U postgres -d nadanaloga < /tmp/supabase_backup.sql
```

**This will take 2-5 minutes.** You'll see lots of output like:
```
CREATE TABLE
CREATE INDEX
ALTER TABLE
...
```

**Some warnings are normal:**
- "extension does not exist" - OK
- "role does not exist" - OK
- These are Supabase-specific items

### Step 2.3: Set Permissions

After import completes:

```bash
# Connect to database
psql -U postgres -d nadanaloga
```

```sql
-- Grant all permissions to your user
GRANT USAGE ON SCHEMA public TO nadanaloga_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nadanaloga_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nadanaloga_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO nadanaloga_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nadanaloga_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nadanaloga_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO nadanaloga_user;

-- Exit
\q
```

### Step 2.4: Verify Import

```bash
# List all tables
psql -U postgres -d nadanaloga -c "\dt public.*"
```

**Expected:** You should see a list of tables like:
- courses
- contacts
- events
- event_images
- locations
- etc.

Count the tables:
```bash
psql -U postgres -d nadanaloga -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

**Expected:** Should show a number > 0 (probably 20-50 tables)

---

## Step 3: Clean Up

### Stop the Python Server

Go back to your Mac terminal where the HTTP server is running and press:
```
Ctrl + C
```

### Optional: Remove Backup from Container

In the Portainer console:
```bash
rm /tmp/supabase_backup.sql
```

---

## Step 4: Configure App Environment Variables (5 minutes)

### Step 4.1: Get PostgreSQL Password

1. **Portainer** → **Containers** → `nadanaloga-sub-postgres`
2. Click **Duplicate/Edit**
3. Scroll to **Env** tab
4. Find `POSTGRES_PASSWORD` value
5. **Copy this password** (you'll need it next)

### Step 4.2: Update App Environment

1. **Portainer** → **Containers** → `nadanaloga-sub-app`
2. Click **Duplicate/Edit**
3. Scroll to **Env** tab
4. Add or update these environment variables:

**Click "+ add environment variable" for each:**

| Name | Value |
|------|-------|
| `DATABASE_URL` | `postgresql://nadanaloga_user:YOUR_PASSWORD@nadanaloga-sub-postgres:5432/nadanaloga` |
| `SESSION_SECRET` | `your-random-secure-string-here` |
| `CLIENT_URL` | `http://172.23.0.3:3001` |

**IMPORTANT:**
- Replace `YOUR_PASSWORD` with the password from Step 4.1
- Make sure to use the container name `nadanaloga-sub-postgres` (not IP address)
- Port is `5432` (internal container port)

**Keep these existing variables** (don't remove):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Any other existing variables

5. Scroll down and click **Deploy the container**

---

## Step 5: Verify Network Configuration (2 minutes)

1. **Portainer** → **Networks**
2. Find `nadanaloga-sub-network` (or create if missing)
3. Click on the network name
4. Verify these containers are connected:
   - ✅ `nadanaloga-sub-postgres`
   - ✅ `nadanaloga-sub-app`

**If not connected:**
1. Go to **Containers** → `nadanaloga-sub-app` → **Duplicate/Edit**
2. Scroll to **Network** section
3. Select `nadanaloga-sub-network`
4. Deploy container

---

## Step 6: Restart and Verify (5 minutes)

### Step 6.1: Restart Application

1. **Portainer** → **Containers** → `nadanaloga-sub-app`
2. Click **Restart** button
3. Wait 30 seconds

### Step 6.2: Check Logs

1. Still on `nadanaloga-sub-app`, click **Logs** button
2. Click **Fetch logs** or enable auto-refresh

**Look for:**
- ✅ "Server running on port 3000" or similar
- ✅ "Database connected" or similar
- ❌ Any "ECONNREFUSED" errors
- ❌ Any "password authentication failed" errors

**If you see errors:** See troubleshooting section below

---

## Step 7: Test Application (10 minutes)

### Step 7.1: Open Application

Open browser and go to: **http://172.23.0.3:3001**

(Replace with your actual server IP if different)

### Step 7.2: Test Features

**Basic Tests:**
- [ ] Homepage loads
- [ ] Navigation works
- [ ] No errors in browser console (F12 → Console)

**Database Tests:**
- [ ] Courses page displays data
- [ ] Events page displays data
- [ ] Any list/table shows records

**Authentication Tests:**
- [ ] Can access login page
- [ ] Can log in with existing credentials
- [ ] Can log out

**Write Tests (careful!):**
- [ ] Can create a test record
- [ ] Can update a record
- [ ] Can delete a test record

---

## Troubleshooting

### ❌ Error: Connection Refused

**Symptoms:** App logs show "ECONNREFUSED" or "Connection refused"

**Fix 1: Check Network**

1. **Portainer** → **Containers** → `nadanaloga-sub-app` → **Console**
2. Connect with `/bin/sh`
3. Run:
   ```bash
   # Install ping
   apk add --no-cache iputils

   # Test connection
   ping nadanaloga-sub-postgres
   ```

If ping fails, containers aren't on same network. Go back to Step 5.

**Fix 2: Check PostgreSQL is Running**

1. **Portainer** → **Containers** → `nadanaloga-sub-postgres` → **Console**
2. Run:
   ```bash
   pg_isready -U postgres
   ```

Should say: `accepting connections`

### ❌ Error: Authentication Failed

**Symptoms:** "password authentication failed for user"

**Fix 1: Verify Password**

Check that the password in `DATABASE_URL` matches the password in `nadanaloga-sub-postgres` environment variables.

**Fix 2: Reset Password**

1. **Portainer** → **Containers** → `nadanaloga-sub-postgres` → **Console**
2. Run:
   ```bash
   psql -U postgres -d nadanaloga
   ```
   ```sql
   ALTER USER nadanaloga_user WITH PASSWORD 'your_new_password';
   \q
   ```
3. Update `DATABASE_URL` in `nadanaloga-sub-app` with new password
4. Restart app container

### ❌ Error: Tables Not Found

**Symptoms:** "relation does not exist", "table not found"

**Fix: Verify Import**

1. **Portainer** → **Containers** → `nadanaloga-sub-postgres` → **Console**
2. Run:
   ```bash
   psql -U postgres -d nadanaloga -c "\dt public.*"
   ```

If no tables shown, re-run import from Step 2.

### ❌ Error: Permission Denied

**Symptoms:** "permission denied for table"

**Fix:**

1. **Portainer** → **Containers** → `nadanaloga-sub-postgres` → **Console**
2. Run:
   ```bash
   psql -U postgres -d nadanaloga
   ```
   ```sql
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nadanaloga_user;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nadanaloga_user;
   \q
   ```

---

## Alternative: Direct SQL Import (If File Upload Fails)

If you can't download the file to the container, you can split and paste the SQL:

### Step 1: Split the Backup File

On your Mac:

```bash
cd /Users/ayyappanp/Documents/tk/Thillaikadavul

# Split into smaller files (10000 lines each)
split -l 10000 supabase_backup.sql backup_part_
```

This creates files: `backup_part_aa`, `backup_part_ab`, etc.

### Step 2: Execute Each Part

1. Open each part file
2. Copy the contents
3. In Portainer console for `nadanaloga-sub-postgres`:
   ```bash
   psql -U postgres -d nadanaloga
   ```
4. Paste the SQL and press Enter
5. Repeat for each part file

**Warning:** This is tedious and error-prone. Only use if other methods fail.

---

## Success Checklist

- [ ] Backup file uploaded to container
- [ ] Database and user created
- [ ] Backup imported successfully
- [ ] Tables verified (count > 0)
- [ ] Permissions granted
- [ ] App environment variables updated
- [ ] Network configuration verified
- [ ] App container restarted
- [ ] Logs show no errors
- [ ] Application loads in browser
- [ ] Data displays correctly
- [ ] Authentication works

**All checked?** Migration successful! 🎉

---

## Next Steps

1. [ ] Create first backup using Portainer console:
   ```bash
   # In nadanaloga-sub-postgres console
   pg_dump -U postgres nadanaloga > /tmp/backup_$(date +%Y%m%d).sql
   ```

2. [ ] Monitor application for 1-2 weeks
3. [ ] Keep Supabase running (don't delete!)
4. [ ] Document any issues encountered
5. [ ] Plan MAIN branch migration when stable

---

## Quick Reference: Common Commands

### Check Database Connection
```bash
# In nadanaloga-sub-postgres console
psql -U postgres -d nadanaloga -c "SELECT version();"
```

### List All Tables
```bash
psql -U postgres -d nadanaloga -c "\dt public.*"
```

### Count Records in a Table
```bash
psql -U postgres -d nadanaloga -c "SELECT COUNT(*) FROM courses;"
```

### Check Database Size
```bash
psql -U postgres -c "\l+ nadanaloga"
```

### View Active Connections
```bash
psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE datname = 'nadanaloga';"
```

---

**Created:** 2025-10-22
**Last Updated:** 2025-10-22
**Status:** Ready to use with Portainer UI only
