# Deployment Documentation

This folder contains all the documentation and scripts needed to deploy and manage the Nadanaloga application in Portainer with self-hosted PostgreSQL.

---

## Quick Links

### 🚀 **Getting Started**
Start here if you're migrating from Supabase to self-hosted PostgreSQL:

👉 **[QUICK_START.md](./QUICK_START.md)** - Step-by-step checklist for SUB branch migration

---

### 📚 **Documentation**

1. **[QUICK_START.md](./QUICK_START.md)**
   - Quick reference checklist
   - All migration steps in one place
   - Troubleshooting guide
   - **Start here!**

2. **[PORTAINER_DATABASE_MIGRATION.md](./PORTAINER_DATABASE_MIGRATION.md)**
   - Comprehensive migration guide
   - Detailed explanations
   - Environment configuration
   - MAIN branch migration plan

3. **[ARCHITECTURE.md](./ARCHITECTURE.md)**
   - System architecture overview
   - Network diagram
   - Data flow
   - Security considerations

---

### 🛠️ **Scripts**

1. **[import-supabase-backup.sh](./import-supabase-backup.sh)**
   - Import Supabase backup into PostgreSQL container
   - Automatic permission setup
   - Verification steps

   ```bash
   ./deploy/import-supabase-backup.sh nadanaloga-sub-postgres ./supabase_backup.sql
   ```

2. **[backup-postgres.sh](./backup-postgres.sh)**
   - Create timestamped database backups
   - Automatic compression
   - Retention management (keeps last 7 days)

   ```bash
   ./deploy/backup-postgres.sh nadanaloga-sub-postgres ./backups
   ```

---

## Migration Overview

### Current Status

Your environment:
- ✅ **Portainer** is set up
- ✅ **nadanaloga-sub-postgres** container created
- ✅ **nadanaloga-sub-app** container running
- ⏳ **Database migration** ready to start
- ⏳ **MAIN branch** waiting for SUB to stabilize

### What You're Migrating

**FROM:**
```
Supabase (Cloud)
├── PostgreSQL Database (hosted by Supabase)
├── Authentication (Supabase Auth)
└── Storage (Supabase Storage)
```

**TO:**
```
Portainer (Self-Hosted)
├── PostgreSQL Database (your container)
├── Authentication (still Supabase - for now)
└── Storage (your container - if needed)
```

### Migration Strategy

**Phase 1: SUB Branch** (Do this now)
- Migrate database to self-hosted PostgreSQL
- Keep Supabase Auth working
- Test everything thoroughly

**Phase 2: MAIN Branch** (After SUB is stable)
- Repeat for production
- Carefully planned switchover
- Minimize downtime

---

## File Structure

```
deploy/
├── README.md                          ← You are here
├── QUICK_START.md                     ← Start your migration here
├── PORTAINER_DATABASE_MIGRATION.md    ← Detailed guide
├── ARCHITECTURE.md                    ← System architecture
├── import-supabase-backup.sh          ← Import script
├── backup-postgres.sh                 ← Backup script
└── .env.example                       ← Environment template
```

---

## Quick Start (TL;DR)

If you want to get started right now:

```bash
# 1. Navigate to project
cd /Users/ayyappanp/Documents/tk/Thillaikadavul

# 2. Import database
./deploy/import-supabase-backup.sh nadanaloga-sub-postgres ./supabase_backup.sql

# 3. Configure Portainer environment (see QUICK_START.md)

# 4. Restart app container in Portainer

# 5. Test: http://172.23.0.3:3001
```

For detailed instructions, see **[QUICK_START.md](./QUICK_START.md)**

---

## Prerequisites

Before starting the migration:

- [ ] Docker and Portainer access
- [ ] Both containers running in Portainer:
  - `nadanaloga-sub-postgres`
  - `nadanaloga-sub-app`
- [ ] Supabase backup file: `supabase_backup.sql`
- [ ] PostgreSQL password (set in Portainer)
- [ ] Containers on same network

---

## Support

### Documentation Order

1. **First time?** Read [QUICK_START.md](./QUICK_START.md)
2. **Need details?** See [PORTAINER_DATABASE_MIGRATION.md](./PORTAINER_DATABASE_MIGRATION.md)
3. **Understanding the system?** Check [ARCHITECTURE.md](./ARCHITECTURE.md)

### Common Issues

See the **Troubleshooting** section in:
- [QUICK_START.md](./QUICK_START.md#troubleshooting)
- [PORTAINER_DATABASE_MIGRATION.md](./PORTAINER_DATABASE_MIGRATION.md#troubleshooting)

### Getting Help

If you encounter issues:
1. Check container logs in Portainer
2. Review troubleshooting guides
3. Verify environment variables
4. Test database connection manually

---

## Environment Files

The project uses branch-specific environment files:

- **`.env.sub`** - SUB branch configuration (development)
- **`.env.main`** - MAIN branch configuration (production)

These files have been updated with PostgreSQL connection strings. Make sure to:
1. Set proper passwords
2. Configure in Portainer environment variables
3. Never commit secrets to git

---

## Backup Strategy

### Creating Backups

```bash
# Manual backup
./deploy/backup-postgres.sh nadanaloga-sub-postgres ./backups

# Verify backup
ls -lh ./backups/
```

### Automated Backups

Add to crontab for daily backups:

```bash
# Edit crontab
crontab -e

# Add this line (daily at 2 AM)
0 2 * * * cd /Users/ayyappanp/Documents/tk/Thillaikadavul && ./deploy/backup-postgres.sh nadanaloga-sub-postgres ./backups
```

### Restoring Backups

```bash
# Decompress and restore
gunzip -c ./backups/nadanaloga-sub-postgres_20251022_140530.sql.gz | \
  docker exec -i nadanaloga-sub-postgres psql -U postgres -d nadanaloga
```

---

## Next Steps

1. ✅ **Review this README** - You're doing it now!
2. 📖 **Read QUICK_START.md** - Get step-by-step instructions
3. 🚀 **Import database** - Run the import script
4. ⚙️ **Configure Portainer** - Set environment variables
5. ✅ **Test application** - Verify everything works
6. 💾 **Set up backups** - Automate daily backups
7. 🎯 **Plan MAIN migration** - When SUB is stable

---

## Migration Checklist

### SUB Branch (Current)

- [ ] Import Supabase backup
- [ ] Configure environment variables
- [ ] Verify network configuration
- [ ] Restart application container
- [ ] Test database connection
- [ ] Test application features
- [ ] Set up automated backups
- [ ] Monitor for issues (1-2 weeks)

### MAIN Branch (Future)

- [ ] Create MAIN PostgreSQL container
- [ ] Export fresh Supabase backup
- [ ] Import to MAIN database
- [ ] Configure MAIN environment
- [ ] Schedule maintenance window
- [ ] Test MAIN environment
- [ ] Switch production traffic
- [ ] Monitor closely

---

## Important Notes

⚠️ **DO NOT** touch MAIN branch until SUB is 100% stable

✅ **DO** keep Supabase running as backup during migration

✅ **DO** create regular backups before making changes

✅ **DO** test thoroughly on SUB before migrating MAIN

---

## Version History

| Version | Date       | Changes                           |
|---------|------------|-----------------------------------|
| 1.0     | 2025-10-22 | Initial documentation created     |
|         |            | Migration scripts added           |
|         |            | SUB branch ready for migration    |

---

**Last Updated:** 2025-10-22
**Status:** Ready for SUB branch migration
**Next Milestone:** Complete SUB migration and testing
