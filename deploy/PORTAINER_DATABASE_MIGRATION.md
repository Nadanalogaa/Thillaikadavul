# Portainer Database Migration Guide

## Migration from Supabase to Self-Hosted PostgreSQL

This guide walks you through migrating your database from Supabase to self-hosted PostgreSQL in Portainer.

---

## Current Status

- ✅ **nadanaloga-sub-postgres** container created and running
- ✅ **nadanaloga-sub-app** container created and running
- ⏳ **Database import** - pending
- ⏳ **Application configuration** - pending

---

## Phase 1: SUB Branch Migration (Development)

### Prerequisites

- [ ] Portainer access with both containers running
- [ ] Supabase backup file: `supabase_backup.sql`
- [ ] Docker CLI access to run import script
- [ ] Database password (set in Portainer environment variables)

---

### Step 1: Import Supabase Backup

**Option A: Using the Import Script (Recommended)**

```bash
# Navigate to project directory
cd /Users/ayyappanp/Documents/tk/Thillaikadavul

# Run the import script
./deploy/import-supabase-backup.sh nadanaloga-sub-postgres ./supabase_backup.sql
```

**Option B: Manual Import via Portainer Console**

1. Go to Portainer → Containers → `nadanaloga-sub-postgres`
2. Click **Console** → Connect as `root`
3. Copy the backup file to container:
   ```bash
   # From your local machine
   docker cp supabase_backup.sql nadanaloga-sub-postgres:/tmp/backup.sql
   ```
4. In the Portainer console:
   ```bash
   # Import the backup
   psql -U postgres -d nadanaloga < /tmp/backup.sql

   # Verify tables were imported
   psql -U postgres -d nadanaloga -c "\dt public.*"
   ```

---

### Step 2: Configure Database Permissions

After import, set proper permissions:

```sql
-- Connect to the database in Portainer console
psql -U postgres -d nadanaloga

-- Run these commands:
GRANT USAGE ON SCHEMA public TO nadanaloga_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nadanaloga_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nadanaloga_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO nadanaloga_user;

-- For future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nadanaloga_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nadanaloga_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO nadanaloga_user;
```

---

### Step 3: Update Environment Variables in Portainer

1. Go to Portainer → Containers → `nadanaloga-sub-app`
2. Click **Duplicate/Edit** → **Env** tab
3. Update/Add these environment variables:

```env
# Database Connection (IMPORTANT: Update this!)
DATABASE_URL=postgresql://nadanaloga_user:YOUR_PASSWORD@nadanaloga-sub-postgres:5432/nadanaloga

# Keep Supabase for Auth (Option A - Gradual Migration)
VITE_SUPABASE_URL=https://ojuybeasovauzkntbydd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Or remove Supabase (Option B - Full Migration)
# Remove the above three variables if migrating auth too
```

**Important Notes:**
- Replace `YOUR_PASSWORD` with the actual password set in `nadanaloga-sub-postgres` container
- The hostname is `nadanaloga-sub-postgres` (Docker internal network)
- Port is `5432` (internal container port, not the exposed port)

---

### Step 4: Configure Docker Network

Ensure both containers are on the same network:

1. Go to Portainer → Networks
2. Find or create: `nadanaloga-sub-network`
3. Ensure both containers are connected:
   - `nadanaloga-sub-postgres`
   - `nadanaloga-sub-app`

To check/add network in Portainer:
1. Container → `nadanaloga-sub-app` → **Network** tab
2. If not connected, add `nadanaloga-sub-network`

---

### Step 5: Restart Application Container

1. Go to Portainer → Containers → `nadanaloga-sub-app`
2. Click **Restart**
3. Check logs for successful database connection:
   ```
   Containers → nadanaloga-sub-app → Logs
   ```
4. Look for:
   - ✅ "Database connected successfully"
   - ❌ "Connection refused" or "Authentication failed" (troubleshoot below)

---

### Step 6: Verify the Migration

#### Test Database Connection

Access the app console in Portainer:
```bash
# Test database connection
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) FROM courses', (err, res) => {
  console.log(err || res.rows);
  pool.end();
});
"
```

#### Test Application

1. Open browser: `http://172.23.0.3:3001` (or your server IP)
2. Test these features:
   - [ ] Homepage loads
   - [ ] Courses page displays data
   - [ ] User login (auth)
   - [ ] Create/Update operations
   - [ ] Image uploads

---

## Troubleshooting

### Issue: Connection Refused

**Problem:** App can't connect to PostgreSQL

**Solutions:**
1. Verify both containers are on the same network
2. Check PostgreSQL is running: `docker ps | grep nadanaloga-sub-postgres`
3. Test connection from app container:
   ```bash
   docker exec -it nadanaloga-sub-app sh
   apk add postgresql-client
   psql postgresql://nadanaloga_user:PASSWORD@nadanaloga-sub-postgres:5432/nadanaloga
   ```

### Issue: Authentication Failed

**Problem:** Wrong password or user doesn't exist

**Solutions:**
1. Check postgres password in environment variables
2. Recreate user in PostgreSQL:
   ```sql
   psql -U postgres -d nadanaloga
   ALTER USER nadanaloga_user WITH PASSWORD 'your_new_password';
   ```
3. Update `DATABASE_URL` with correct password

### Issue: Tables Not Found

**Problem:** Import didn't complete or tables missing

**Solutions:**
1. Verify tables exist:
   ```bash
   docker exec -it nadanaloga-sub-postgres psql -U postgres -d nadanaloga -c "\dt public.*"
   ```
2. Re-run import script if needed
3. Check import logs for errors

### Issue: Auth Not Working

**Problem:** Users can't login

**Solutions:**
- **If using Option A (Supabase Auth):** Keep Supabase environment variables
- **If using Option B (Self-hosted):** You need to implement custom auth system
- Verify auth tokens are still valid in Supabase dashboard

---

## Phase 2: MAIN Branch Migration (Production)

⚠️ **DO NOT proceed until SUB branch is fully tested and stable**

Once SUB is working perfectly:

1. **Create MAIN database container:**
   - Name: `nadanaloga-main-postgres`
   - Port: 5432 (or different from SUB)
   - Volume: Separate from SUB

2. **Export latest data from Supabase:**
   ```bash
   # Get fresh backup before migration
   ./export_supabase.sh
   ```

3. **Import to MAIN:**
   ```bash
   ./deploy/import-supabase-backup.sh nadanaloga-main-postgres ./supabase_backup.sql
   ```

4. **Update MAIN app environment variables**

5. **Schedule maintenance window** for the switch

6. **Test thoroughly** before going live

---

## Environment Configuration Reference

### SUB Branch (.env.sub)
```env
BRANCH_NAME=sub
APP_PORT=3001

# Self-hosted PostgreSQL
DATABASE_URL=postgresql://nadanaloga_user:PASSWORD@nadanaloga-sub-postgres:5432/nadanaloga

# Keep Supabase for Auth (recommended)
VITE_SUPABASE_URL=https://ojuybeasovauzkntbydd.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### MAIN Branch (.env.main) - For Future Use
```env
BRANCH_NAME=main
APP_PORT=3000

# Self-hosted PostgreSQL (update after testing SUB)
DATABASE_URL=postgresql://nadanaloga_user:PASSWORD@nadanaloga-main-postgres:5432/nadanaloga

# Supabase (keep until fully migrated)
VITE_SUPABASE_URL=https://ojuybeasovauzkntbydd.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

---

## Rollback Plan

If something goes wrong with SUB:

1. **Keep Supabase running** - don't delete anything there yet
2. **Revert environment variable:**
   ```env
   # Change back to Supabase connection if needed
   # (Remove DATABASE_URL or point back to Supabase)
   ```
3. **Restart container** with old settings
4. **Investigate issues** before trying again

---

## Database Backup Strategy

### Regular Backups for Self-Hosted PostgreSQL

Create a backup script to run daily:

```bash
#!/bin/bash
# File: deploy/backup-postgres.sh

CONTAINER="nadanaloga-sub-postgres"
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

docker exec $CONTAINER pg_dump -U postgres nadanaloga > "$BACKUP_DIR/backup_$DATE.sql"

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

---

## Next Steps

1. [ ] Run import script to load Supabase data
2. [ ] Configure environment variables in Portainer
3. [ ] Restart nadanaloga-sub-app container
4. [ ] Test all application features
5. [ ] Monitor logs for errors
6. [ ] Set up automated backups
7. [ ] Document any issues encountered
8. [ ] When stable, plan MAIN migration

---

## Support

If you encounter issues:
1. Check Portainer container logs
2. Review troubleshooting section above
3. Verify environment variables are correct
4. Test database connection manually

---

**Created:** 2025-10-22
**Last Updated:** 2025-10-22
**Status:** SUB branch ready for migration
