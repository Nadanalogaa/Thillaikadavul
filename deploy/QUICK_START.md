# Quick Start: Database Migration Checklist

This is your quick reference guide for migrating the SUB branch to self-hosted PostgreSQL.

---

## Pre-Migration Checklist

- [x] PostgreSQL container created: `nadanaloga-sub-postgres`
- [x] Application container running: `nadanaloga-sub-app`
- [ ] Supabase backup file available: `supabase_backup.sql`
- [ ] PostgreSQL password set in Portainer
- [ ] Both containers on same network: `nadanaloga-sub-network`

---

## Migration Steps (Do This Now)

### 1. Import Database (5 minutes)

**Run from your project directory:**

```bash
cd /Users/ayyappanp/Documents/tk/Thillaikadavul

# Import Supabase backup into PostgreSQL
./deploy/import-supabase-backup.sh nadanaloga-sub-postgres ./supabase_backup.sql
```

**Expected output:**
```
✓ Backup file copied successfully
✓ Database and user configured
✓ Backup imported successfully
✓ Permissions configured
✓ Found XX tables in the database
```

---

### 2. Configure Portainer Environment Variables (2 minutes)

Go to Portainer:
1. **Containers** → `nadanaloga-sub-app` → **Duplicate/Edit**
2. Click **Env** tab
3. Add/Update these variables:

```env
# Database Connection (CRITICAL!)
DATABASE_URL=postgresql://nadanaloga_user:YOUR_PASSWORD@nadanaloga-sub-postgres:5432/nadanaloga

# Session Secret
SESSION_SECRET=generate-a-random-string-here

# Keep Supabase for Auth
VITE_SUPABASE_URL=https://ojuybeasovauzkntbydd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdXliZWFzb3ZhdXprbnRieWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNzMwNjQsImV4cCI6MjA3MTk0OTA2NH0.UlGxceKspC5mDgQkENV19hhppEGaNB8iAZQMnkL1Mag

# Client URL
CLIENT_URL=http://172.23.0.3:3001
```

**IMPORTANT:** Replace `YOUR_PASSWORD` with the actual password from `nadanaloga-sub-postgres` environment variables.

4. Click **Deploy the container**

---

### 3. Verify Network Configuration (1 minute)

1. Go to Portainer → **Networks**
2. Find `nadanaloga-sub-network` (or create if missing)
3. Verify both containers are connected:
   - `nadanaloga-sub-postgres` ✓
   - `nadanaloga-sub-app` ✓

---

### 4. Restart Application (1 minute)

1. Portainer → **Containers** → `nadanaloga-sub-app`
2. Click **Restart**
3. Wait 30 seconds for startup

---

### 5. Check Logs (2 minutes)

**In Portainer:**
1. Containers → `nadanaloga-sub-app` → **Logs**
2. Look for success messages:
   - ✅ "Server running on port 3000"
   - ✅ "Database connected" or similar
   - ❌ Any errors? See troubleshooting below

---

### 6. Test Application (5 minutes)

Open browser: **http://172.23.0.3:3001**

Test checklist:
- [ ] Homepage loads
- [ ] Login works (Supabase auth)
- [ ] Courses page displays data from PostgreSQL
- [ ] Create new record (tests write operations)
- [ ] Upload images (if applicable)
- [ ] Check browser console for errors

---

## Troubleshooting

### ❌ "Connection refused" error

**Fix:**
1. Check both containers are running
2. Verify network connection:
   ```bash
   docker exec nadanaloga-sub-app ping nadanaloga-sub-postgres
   ```
3. Check PostgreSQL is listening:
   ```bash
   docker exec nadanaloga-sub-postgres pg_isready -U postgres
   ```

### ❌ "Authentication failed" error

**Fix:**
1. Check password in `DATABASE_URL` matches PostgreSQL password
2. Reset password in PostgreSQL:
   ```bash
   docker exec -it nadanaloga-sub-postgres psql -U postgres
   ALTER USER nadanaloga_user WITH PASSWORD 'new_password';
   ```
3. Update `DATABASE_URL` in Portainer with new password
4. Restart app container

### ❌ "relation does not exist" error

**Fix:**
1. Tables weren't imported. Re-run import script:
   ```bash
   ./deploy/import-supabase-backup.sh nadanaloga-sub-postgres ./supabase_backup.sql
   ```
2. Verify tables exist:
   ```bash
   docker exec nadanaloga-sub-postgres psql -U postgres -d nadanaloga -c "\dt public.*"
   ```

### ❌ App loads but no data shown

**Fix:**
1. Check permissions on tables:
   ```sql
   docker exec -it nadanaloga-sub-postgres psql -U postgres -d nadanaloga
   GRANT ALL ON ALL TABLES IN SCHEMA public TO nadanaloga_user;
   ```
2. Check app is querying correct database (verify `DATABASE_URL`)

---

## After Successful Migration

### Daily Backup (Recommended)

Set up automated backups:

```bash
# Manual backup
./deploy/backup-postgres.sh nadanaloga-sub-postgres ./backups

# Or setup cron job (Linux/Mac)
crontab -e
# Add this line for daily backup at 2 AM:
0 2 * * * cd /path/to/project && ./deploy/backup-postgres.sh nadanaloga-sub-postgres ./backups
```

### Monitor Database

**Check database size:**
```bash
docker exec nadanaloga-sub-postgres psql -U postgres -d nadanaloga -c "\l+"
```

**Check table sizes:**
```bash
docker exec nadanaloga-sub-postgres psql -U postgres -d nadanaloga -c "
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

---

## Next: MAIN Branch Migration

⚠️ **Only proceed when SUB is 100% stable**

When ready to migrate MAIN:

1. **Create fresh Supabase backup:**
   ```bash
   ./export_supabase.sh
   ```

2. **Create MAIN PostgreSQL container in Portainer:**
   - Name: `nadanaloga-main-postgres`
   - Use different ports to avoid conflicts
   - Separate volume from SUB

3. **Import backup:**
   ```bash
   ./deploy/import-supabase-backup.sh nadanaloga-main-postgres ./supabase_backup.sql
   ```

4. **Test on MAIN** (same process as SUB)

5. **Schedule maintenance window** for production switch

---

## Getting Password from Portainer

If you don't know the PostgreSQL password:

1. Portainer → **Containers** → `nadanaloga-sub-postgres`
2. Click **Duplicate/Edit** → **Env** tab
3. Find `POSTGRES_PASSWORD` value
4. Copy that exact value to `DATABASE_URL`

---

## Support Contacts

- **Full Guide:** See [PORTAINER_DATABASE_MIGRATION.md](./PORTAINER_DATABASE_MIGRATION.md)
- **Import Script:** [import-supabase-backup.sh](./import-supabase-backup.sh)
- **Backup Script:** [backup-postgres.sh](./backup-postgres.sh)

---

## Status Tracker

- [ ] Step 1: Import completed
- [ ] Step 2: Environment variables configured
- [ ] Step 3: Network verified
- [ ] Step 4: App restarted
- [ ] Step 5: Logs checked (no errors)
- [ ] Step 6: Application tested successfully
- [ ] Backup automation set up

**Migration Status:** 🟡 In Progress

---

**Last Updated:** 2025-10-22
