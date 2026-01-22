# Database Migration Checklist

Print this or keep it open while migrating!

---

## Pre-Migration Checks

- [x] Portainer containers running
  - [x] `nadanaloga-sub-postgres` (172.23.0.2)
  - [x] `nadanaloga-sub-app` (172.23.0.3:3001)
- [ ] Backup file ready: `supabase_backup.sql` exists
- [ ] PostgreSQL password known
- [ ] Network configured: `nadanaloga-sub-network`
- [ ] 1-2 hours available for this task

---

## Migration Steps

### Step 1: Import Database ⏱️ 5 minutes

```bash
cd /Users/ayyappanp/Documents/tk/Thillaikadavul
./deploy/import-supabase-backup.sh nadanaloga-sub-postgres ./supabase_backup.sql
```

**Expected output:**
- [ ] ✓ Backup file copied successfully
- [ ] ✓ Database and user configured
- [ ] ✓ Backup imported successfully
- [ ] ✓ Permissions configured
- [ ] ✓ Found XX tables in the database

**If errors:** Check troubleshooting section in QUICK_START.md

---

### Step 2: Get PostgreSQL Password ⏱️ 1 minute

In Portainer:
1. [ ] Go to **Containers** → `nadanaloga-sub-postgres`
2. [ ] Click **Duplicate/Edit**
3. [ ] Click **Env** tab
4. [ ] Find `POSTGRES_PASSWORD` value
5. [ ] Copy password: ___________________________

---

### Step 3: Update App Environment Variables ⏱️ 3 minutes

In Portainer:
1. [ ] Go to **Containers** → `nadanaloga-sub-app`
2. [ ] Click **Duplicate/Edit**
3. [ ] Click **Env** tab
4. [ ] Add/Update these variables:

**Required Variables:**
```
DATABASE_URL=postgresql://nadanaloga_user:YOUR_PASSWORD@nadanaloga-sub-postgres:5432/nadanaloga
```
Replace YOUR_PASSWORD with the password from Step 2

**Optional (if not set):**
```
SESSION_SECRET=your-secure-random-string
CLIENT_URL=http://172.23.0.3:3001
VITE_SUPABASE_URL=https://ojuybeasovauzkntbydd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

5. [ ] Click **Deploy the container**

---

### Step 4: Verify Network ⏱️ 2 minutes

1. [ ] Portainer → **Networks**
2. [ ] Find or create: `nadanaloga-sub-network`
3. [ ] Verify connected containers:
   - [ ] `nadanaloga-sub-postgres` connected
   - [ ] `nadanaloga-sub-app` connected

---

### Step 5: Restart Application ⏱️ 1 minute

1. [ ] Portainer → **Containers** → `nadanaloga-sub-app`
2. [ ] Click **Restart**
3. [ ] Wait 30 seconds for startup
4. [ ] Container status shows "Running"

---

### Step 6: Check Logs ⏱️ 2 minutes

1. [ ] Portainer → Containers → `nadanaloga-sub-app` → **Logs**
2. [ ] Look for success messages:
   - [ ] "Server running on port 3000" or similar
   - [ ] No "Connection refused" errors
   - [ ] No "Authentication failed" errors
   - [ ] No "ECONNREFUSED" errors

**If errors:** See troubleshooting section below

---

### Step 7: Test Application ⏱️ 10-15 minutes

**Open browser:** http://172.23.0.3:3001

**Test these features:**

#### Basic Functionality
- [ ] Homepage loads correctly
- [ ] Navigation works
- [ ] No console errors (F12 → Console tab)

#### Database Operations
- [ ] Courses page displays data
- [ ] Events page displays data
- [ ] All lists load correctly

#### Authentication
- [ ] Login page works
- [ ] Can log in with existing credentials
- [ ] Can log out
- [ ] Protected pages require auth

#### Write Operations
- [ ] Can create new records (if applicable)
- [ ] Can update existing records
- [ ] Can delete records (test on non-critical data)

#### File Operations
- [ ] Images load correctly
- [ ] Can upload new images (if applicable)

**Overall test result:** ⬜ PASS / ⬜ FAIL

---

## Post-Migration Tasks

### Immediate (Today)

- [ ] Create first backup:
  ```bash
  ./deploy/backup-postgres.sh nadanaloga-sub-postgres ./backups
  ```
- [ ] Verify backup file created in `./backups/`
- [ ] Document any issues encountered
- [ ] Update team (if applicable)

### This Week

- [ ] Monitor application logs daily
- [ ] Check database connection stability
- [ ] Monitor performance
- [ ] Test all edge cases
- [ ] Keep Supabase running (don't delete!)

### Set Up Automated Backups

- [ ] Test backup script manually first
- [ ] Add to crontab (Linux/Mac):
  ```bash
  crontab -e
  # Add: 0 2 * * * cd /path/to/project && ./deploy/backup-postgres.sh nadanaloga-sub-postgres ./backups
  ```
- [ ] Or use Task Scheduler (Windows)
- [ ] Verify automated backup runs successfully

---

## Troubleshooting

### ❌ Connection Refused

**Symptoms:** "ECONNREFUSED", "Connection refused"

**Fixes:**
```bash
# Check containers running
docker ps | grep nadanaloga-sub

# Test network connectivity
docker exec nadanaloga-sub-app ping nadanaloga-sub-postgres

# Check PostgreSQL ready
docker exec nadanaloga-sub-postgres pg_isready -U postgres
```

- [ ] Both containers running?
- [ ] Same network?
- [ ] PostgreSQL healthy?

---

### ❌ Authentication Failed

**Symptoms:** "password authentication failed", "FATAL: password"

**Fixes:**
- [ ] Password matches in both containers?
- [ ] No typos in `DATABASE_URL`?
- [ ] User `nadanaloga_user` exists?

**Reset password:**
```bash
docker exec -it nadanaloga-sub-postgres psql -U postgres -d nadanaloga
ALTER USER nadanaloga_user WITH PASSWORD 'new_password';
\q
```
Then update `DATABASE_URL` with new password and restart app.

---

### ❌ Tables Not Found

**Symptoms:** "relation does not exist", "table not found"

**Fixes:**
- [ ] Verify tables imported:
  ```bash
  docker exec nadanaloga-sub-postgres psql -U postgres -d nadanaloga -c "\dt public.*"
  ```
- [ ] Count should be > 0
- [ ] If empty, re-run import script

---

### ❌ Permission Denied

**Symptoms:** "permission denied for table"

**Fixes:**
```bash
docker exec -it nadanaloga-sub-postgres psql -U postgres -d nadanaloga
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nadanaloga_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nadanaloga_user;
\q
```

---

## Rollback Plan (If Needed)

If migration fails and you need to rollback:

1. [ ] Stop using self-hosted PostgreSQL
2. [ ] Remove/comment out `DATABASE_URL` in Portainer
3. [ ] Ensure Supabase variables are set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. [ ] Restart `nadanaloga-sub-app` container
5. [ ] Test application (should use Supabase again)
6. [ ] Investigate issues before retrying

---

## Success Criteria

Migration is successful when:

- ✅ Application starts without errors
- ✅ All pages load correctly
- ✅ Database operations work (read/write)
- ✅ Authentication works
- ✅ No console errors
- ✅ No container log errors
- ✅ Performance is acceptable
- ✅ Backup created successfully

**All checked?** Migration successful! 🎉

---

## Next Steps After Success

1. [ ] Run SUB environment for 1-2 weeks
2. [ ] Monitor for any issues
3. [ ] Keep regular backups
4. [ ] Document lessons learned
5. [ ] Plan MAIN branch migration when ready

---

## Important Reminders

### DO
- ✅ Test thoroughly on SUB
- ✅ Keep Supabase running
- ✅ Create regular backups
- ✅ Monitor logs

### DON'T
- ❌ Touch MAIN branch yet
- ❌ Delete Supabase data
- ❌ Skip testing steps
- ❌ Rush to production

---

## Contact Info

**Documentation:**
- Quick Start: `deploy/QUICK_START.md`
- Full Guide: `deploy/PORTAINER_DATABASE_MIGRATION.md`
- Architecture: `deploy/ARCHITECTURE.md`

**Scripts:**
- Import: `deploy/import-supabase-backup.sh`
- Backup: `deploy/backup-postgres.sh`

---

## Migration Log

**Date Started:** _______________
**Date Completed:** _______________
**Issues Encountered:**

_______________________________________________
_______________________________________________
_______________________________________________

**Resolution:**

_______________________________________________
_______________________________________________
_______________________________________________

**Final Status:** ⬜ Success / ⬜ Rolled Back / ⬜ In Progress

---

**Print this checklist and mark items as you complete them!**

✅ = Completed
⏱️ = Estimated time
❌ = Problem/Error
⬜ = Not started

Good luck! 🚀
