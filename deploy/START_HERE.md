# START HERE - Simple Migration Guide

## 🎯 Goal
Move **SUB branch only** from Supabase to self-hosted PostgreSQL.

**MAIN branch = DO NOT TOUCH!** ❌

---

## ✅ What You Have

- Portainer running on remote server
- `nadanaloga-sub-postgres` container ✅
- `nadanaloga-sub-app` container ✅
- `supabase_backup.sql` file on your Mac ✅

---

## 📝 Simple 3-Step Process

### Step 1: Upload Backup to PostgreSQL Container (10 min)

**On your Mac terminal:**

```bash
# Start a simple web server
cd /Users/ayyappanp/Documents/tk/Thillaikadavul
python3 -m http.server 8080
```

Leave this running! You'll see: `Serving HTTP on :: port 8080`

**Get your Mac's IP address** (in a new terminal):
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

You'll see something like: `inet 192.168.1.100` ← **Copy this IP**

---

**In Portainer Web UI:**

1. Go to **Containers** → `nadanaloga-sub-postgres`
2. Click **>_ Console** button
3. Choose: `/bin/sh` and click **Connect**

**In the console that opens, run these commands:**

```bash
# Install wget
apk add --no-cache wget

# Download backup (replace 192.168.1.100 with YOUR Mac IP!)
cd /tmp
wget http://192.168.1.100:8080/supabase_backup.sql

# Verify it downloaded
ls -lh supabase_backup.sql
```

You should see the file size. ✅

---

### Step 2: Import the Database (5 min)

**Still in the same Portainer console** for `nadanaloga-sub-postgres`:

```bash
# Create database and user
psql -U postgres <<EOF
CREATE DATABASE nadanaloga;
CREATE USER nadanaloga_user WITH PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE nadanaloga TO nadanaloga_user;
EOF

# Import the backup (this takes 2-5 minutes)
psql -U postgres -d nadanaloga < /tmp/supabase_backup.sql

# Set permissions
psql -U postgres -d nadanaloga <<EOF
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nadanaloga_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nadanaloga_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nadanaloga_user;
EOF

# Verify tables imported
psql -U postgres -d nadanaloga -c "\dt public.*"
```

You should see a list of tables! ✅

**Clean up:**
```bash
rm /tmp/supabase_backup.sql
```

**Stop the Python server on your Mac** (press Ctrl+C in that terminal)

---

### Step 3: Connect the App to PostgreSQL (5 min)

**In Portainer:**

1. Go to **Containers** → `nadanaloga-sub-app`
2. Click **Duplicate/Edit**
3. Scroll to **Env** tab
4. Add this environment variable:

Click **"+ add environment variable"**:

```
Name:  DATABASE_URL
Value: postgresql://nadanaloga_user:SecurePassword123!@nadanaloga-sub-postgres:5432/nadanaloga
```

**Keep all other variables as-is!** Especially these:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

5. Scroll to bottom, click **Deploy the container**

6. Wait 30 seconds, then click **Logs** to check for errors

---

## ✅ Test It

Open your browser: `http://172.23.0.3:3001`

**Check:**
- [ ] Homepage loads
- [ ] Courses page shows data
- [ ] Login works
- [ ] No errors in browser console (F12)

**If all good = SUCCESS!** 🎉

---

## ❌ Troubleshooting

### "Connection refused" error in logs

**Fix: Check network**

1. Containers → `nadanaloga-sub-app` → Duplicate/Edit
2. Scroll to **Network** section
3. Make sure it's on `nadanaloga-sub-network`
4. Deploy container

### "Authentication failed" error

**Fix: Check password matches**

The password in `DATABASE_URL` must match the password you used when creating the user.

To reset:
1. Containers → `nadanaloga-sub-postgres` → Console
2. Run:
   ```bash
   psql -U postgres -d nadanaloga
   ALTER USER nadanaloga_user WITH PASSWORD 'SecurePassword123!';
   \q
   ```
3. Update `DATABASE_URL` in app with same password
4. Restart app container

### "Tables not found" error

**Fix: Re-import**

Go back to Step 2 and run the import command again.

---

## 🛡️ Safety Notes

### ✅ Safe to Do
- Everything in this guide
- Test on SUB branch
- Make mistakes (you can retry)

### ❌ DO NOT DO
- Touch MAIN branch containers
- Delete anything from Supabase
- Remove MAIN from git

---

## 🔄 Rollback (If Needed)

If something goes wrong:

1. **Containers** → `nadanaloga-sub-app` → **Duplicate/Edit**
2. **Remove** the `DATABASE_URL` variable
3. **Deploy** the container
4. App will use Supabase again ✅

---

## 📋 Quick Checklist

- [ ] Step 1: Upload backup file (10 min)
- [ ] Step 2: Import to PostgreSQL (5 min)
- [ ] Step 3: Update app environment (5 min)
- [ ] Test application works
- [ ] Check logs (no errors)
- [ ] Keep running for 1-2 weeks
- [ ] **DO NOT TOUCH MAIN** ❌

---

## 🎯 After Success

1. Monitor SUB for 1-2 weeks
2. If stable, we can plan MAIN migration
3. Keep Supabase running (backup)
4. Document any issues

---

## 📞 Need More Help?

- **Detailed guide:** [PORTAINER_UI_MIGRATION.md](./PORTAINER_UI_MIGRATION.md)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Full docs:** [README.md](./README.md)

---

**Remember:** Only working on SUB branch containers!
- ✅ `nadanaloga-sub-postgres`
- ✅ `nadanaloga-sub-app`
- ❌ `nadanaloga-main-*` (don't touch!)

**Good luck!** 🚀
