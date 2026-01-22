# Nadanaloga Application Architecture

## Overview

This document describes the architecture of the Nadanaloga application with self-hosted PostgreSQL in Portainer.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Portainer                              │
│                                                                 │
│  ┌────────────────────────┐      ┌──────────────────────────┐  │
│  │  SUB Branch (Dev)      │      │  MAIN Branch (Prod)      │  │
│  │                        │      │                          │  │
│  │  ┌──────────────────┐  │      │  ┌──────────────────┐    │  │
│  │  │ nadanaloga-sub-  │  │      │  │ nadanaloga-main- │    │  │
│  │  │     app          │  │      │  │      app         │    │  │
│  │  │                  │  │      │  │                  │    │  │
│  │  │  Port: 3001      │  │      │  │  Port: 3000      │    │  │
│  │  │  IP: 172.23.0.3  │  │      │  │  IP: TBD         │    │  │
│  │  └────────┬─────────┘  │      │  └─────────┬────────┘    │  │
│  │           │             │      │            │             │  │
│  │           │ DATABASE_URL│      │            │ DATABASE_URL│  │
│  │           ▼             │      │            ▼             │  │
│  │  ┌──────────────────┐  │      │  ┌──────────────────┐    │  │
│  │  │ nadanaloga-sub-  │  │      │  │ nadanaloga-main- │    │  │
│  │  │    postgres      │  │      │  │    postgres      │    │  │
│  │  │                  │  │      │  │                  │    │  │
│  │  │  Port: 5432      │  │      │  │  Port: 5432      │    │  │
│  │  │  IP: 172.23.0.2  │  │      │  │  IP: TBD         │    │  │
│  │  │  Volume:         │  │      │  │  Volume:         │    │  │
│  │  │  nadanaloga-sub- │  │      │  │  nadanaloga-main-│    │  │
│  │  │  postgres-data   │  │      │  │  postgres-data   │    │  │
│  │  └──────────────────┘  │      │  └──────────────────┘    │  │
│  │                        │      │                          │  │
│  └────────────────────────┘      └──────────────────────────┘  │
│                                                                 │
│  Network: nadanaloga-sub-network  Network: nadanaloga-main-net │
└─────────────────────────────────────────────────────────────────┘

External Services:
┌──────────────────────┐
│  Supabase (Auth)     │  ← Still used for authentication
│  ojuybeasovauzknt... │     (Can be migrated later)
└──────────────────────┘

Git Workflow:
┌──────────┐          ┌──────────┐
│   sub    │  merge   │   main   │
│ (develop)│ ────────►│  (prod)  │
└──────────┘          └──────────┘
     │                      │
     ▼                      ▼
 Deploy to             Deploy to
 SUB containers        MAIN containers
```

---

## Container Details

### SUB Branch (Development)

#### nadanaloga-sub-app
- **Image:** Custom-built from Dockerfile
- **Port:** 3001 (external) → 3000 (internal)
- **IP:** 172.23.0.3
- **Network:** nadanaloga-sub-network
- **Environment:**
  - `NODE_ENV=production`
  - `DATABASE_URL=postgresql://nadanaloga_user:PASSWORD@nadanaloga-sub-postgres:5432/nadanaloga`
  - `VITE_SUPABASE_URL=https://ojuybeasovauzkntbydd.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=...`
  - `CLIENT_URL=http://172.23.0.3:3001`

#### nadanaloga-sub-postgres
- **Image:** postgres:15-alpine
- **Port:** 5432 (internal only, not exposed)
- **IP:** 172.23.0.2
- **Network:** nadanaloga-sub-network
- **Volume:** nadanaloga-sub-postgres-data
- **Database:** nadanaloga
- **User:** nadanaloga_user
- **Environment:**
  - `POSTGRES_DB=nadanaloga`
  - `POSTGRES_USER=nadanaloga_user`
  - `POSTGRES_PASSWORD=SecurePassword123!` (change this!)

---

### MAIN Branch (Production) - Future

#### nadanaloga-main-app
- **Image:** Custom-built from Dockerfile
- **Port:** 3000 (external) → 3000 (internal)
- **Network:** nadanaloga-main-network
- **Environment:** Same as SUB but with MAIN database

#### nadanaloga-main-postgres
- **Image:** postgres:15-alpine
- **Port:** 5432 (internal only)
- **Network:** nadanaloga-main-network
- **Volume:** nadanaloga-main-postgres-data (separate from SUB)

---

## Data Flow

### User Request Flow

1. **User** → Browser (http://172.23.0.3:3001)
2. **Browser** → `nadanaloga-sub-app:3001`
3. **App** → Serves React frontend (from /app/dist)
4. **Frontend** → Makes API calls to backend
5. **Backend** → Queries PostgreSQL via `DATABASE_URL`
6. **App** → Queries `nadanaloga-sub-postgres:5432`
7. **PostgreSQL** → Returns data
8. **App** → Sends response to frontend
9. **Frontend** → Displays data to user

### Authentication Flow

Currently using **Supabase Auth** (Gradual Migration):

1. **User** → Login form
2. **Frontend** → Calls Supabase Auth API
3. **Supabase** → Validates credentials
4. **Supabase** → Returns JWT token
5. **Frontend** → Stores token, sends with requests
6. **Backend** → Validates token with Supabase

**Future (Full Migration):**
- Replace Supabase Auth with custom auth system
- Store users in self-hosted PostgreSQL
- Implement JWT signing/validation in backend

---

## Database Schema

### Current Tables (from Supabase)

The application uses these main tables:

- **courses** - Course information
- **contacts** - Contact form submissions
- **events** - Event management
- **event_images** - Event image storage
- **event_notifications** - Notification system
- **enrollments** - Course enrollments
- **locations** - Location data
- **section_*** - Various section content tables
- **testimonials** - User testimonials
- And more...

See `supabase_backup.sql` for complete schema.

---

## Network Configuration

### SUB Branch Network

```
Network: nadanaloga-sub-network
Type: Bridge
Driver: bridge

Connected Containers:
- nadanaloga-sub-app (172.23.0.3)
- nadanaloga-sub-postgres (172.23.0.2)

Communication:
- Containers can reach each other by name
- Example: nadanaloga-sub-app can connect to postgres://nadanaloga-sub-postgres:5432
```

### MAIN Branch Network (Future)

```
Network: nadanaloga-main-network
Type: Bridge
Driver: bridge

Connected Containers:
- nadanaloga-main-app
- nadanaloga-main-postgres
```

**Why Separate Networks?**
- Isolation between environments
- Prevents accidental cross-environment connections
- Better security

---

## Git Workflow

### Branch Strategy

```
main (production)
  │
  ├── Protected branch
  ├── Auto-deploys to nadanaloga-main-* containers
  ├── Requires PR approval
  └── Merges only from 'sub' branch

sub (development)
  │
  ├── Development branch
  ├── Auto-deploys to nadanaloga-sub-* containers
  ├── Test all changes here first
  └── Merge to 'main' when stable
```

### Deployment Workflow

1. **Develop on SUB:**
   ```bash
   git checkout sub
   git pull origin sub
   # Make changes
   git add .
   git commit -m "feat: add new feature"
   git push origin sub
   ```

2. **Portainer auto-rebuilds** `nadanaloga-sub-app` (if configured)

3. **Test on SUB** environment (http://172.23.0.3:3001)

4. **When stable, merge to MAIN:**
   ```bash
   git checkout main
   git merge sub
   git push origin main
   ```

5. **Portainer auto-rebuilds** `nadanaloga-main-app`

6. **Production** goes live with new changes

---

## Volume Management

### PostgreSQL Data Volumes

**SUB Branch:**
```
Name: nadanaloga-sub-postgres-data
Type: local
Mount: /var/lib/postgresql/data
Backup: ./backups/nadanaloga-sub-postgres_*.sql.gz
```

**MAIN Branch (Future):**
```
Name: nadanaloga-main-postgres-data
Type: local
Mount: /var/lib/postgresql/data
Backup: ./backups/nadanaloga-main-postgres_*.sql.gz
```

**Why Separate Volumes?**
- Complete isolation between environments
- SUB can have test data
- MAIN has production data
- Independent backups

### Application Upload Volumes

```
SUB: nadanaloga-sub-uploads
MAIN: nadanaloga-main-uploads
Mount: /app/dist/uploads
```

---

## Backup Strategy

### Automated Backups

Use the provided backup script:

```bash
# Manual backup
./deploy/backup-postgres.sh nadanaloga-sub-postgres ./backups

# Automated daily backup (cron)
0 2 * * * cd /path/to/project && ./deploy/backup-postgres.sh nadanaloga-sub-postgres ./backups
```

### Backup Retention

- **Daily backups:** Kept for 7 days
- **Weekly backups:** Keep manually (1st of month)
- **Before migrations:** Always create fresh backup

### Backup Location

```
./backups/
  ├── nadanaloga-sub-postgres_20251022_140530.sql.gz
  ├── nadanaloga-sub-postgres_20251023_020000.sql.gz
  └── ...
```

---

## Migration Phases

### Phase 1: SUB Branch (Current) ✅

- [x] Create PostgreSQL container
- [x] Import Supabase backup
- [ ] Configure app environment
- [ ] Test thoroughly
- [ ] Keep Supabase Auth

### Phase 2: Stabilization 🔄

- [ ] Monitor SUB for 1-2 weeks
- [ ] Fix any issues
- [ ] Optimize performance
- [ ] Document learnings

### Phase 3: MAIN Migration 🔜

- [ ] Create MAIN PostgreSQL container
- [ ] Import fresh Supabase backup
- [ ] Configure MAIN app
- [ ] Schedule maintenance window
- [ ] Switch production
- [ ] Monitor closely

### Phase 4: Full Independence (Optional) 🔮

- [ ] Migrate auth from Supabase
- [ ] Implement custom auth system
- [ ] Migrate file storage (if using Supabase Storage)
- [ ] Complete self-hosting

---

## Environment Variables Reference

### Required for App Container

```env
# Core
NODE_ENV=production
PORT=3000

# Database (Self-hosted)
DATABASE_URL=postgresql://nadanaloga_user:PASSWORD@nadanaloga-sub-postgres:5432/nadanaloga

# Session
SESSION_SECRET=random-secure-string

# Auth (Supabase - keep for now)
VITE_SUPABASE_URL=https://ojuybeasovauzkntbydd.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Client
CLIENT_URL=http://172.23.0.3:3001
```

### Required for PostgreSQL Container

```env
POSTGRES_DB=nadanaloga
POSTGRES_USER=nadanaloga_user
POSTGRES_PASSWORD=SecurePassword123!  # Change this!
```

---

## Security Considerations

### Network Security

- PostgreSQL ports NOT exposed externally
- Communication only within Docker network
- App container is the only entry point

### Database Security

- Strong passwords (change defaults!)
- User permissions properly scoped
- Regular backups
- Encrypted connections (future enhancement)

### Application Security

- Environment variables not committed to git
- Secrets stored in Portainer
- CORS properly configured
- Input validation

---

## Monitoring & Maintenance

### Health Checks

**PostgreSQL:**
```bash
docker exec nadanaloga-sub-postgres pg_isready -U postgres
```

**Application:**
```bash
curl http://172.23.0.3:3001/api/health
```

### Log Monitoring

**In Portainer:**
1. Containers → Select container → Logs
2. Look for errors, warnings
3. Monitor performance

**Via CLI:**
```bash
# App logs
docker logs -f nadanaloga-sub-app

# PostgreSQL logs
docker logs -f nadanaloga-sub-postgres
```

### Database Monitoring

**Size:**
```bash
docker exec nadanaloga-sub-postgres psql -U postgres -d nadanaloga -c "\l+"
```

**Connections:**
```bash
docker exec nadanaloga-sub-postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

---

## Troubleshooting

See [QUICK_START.md](./QUICK_START.md#troubleshooting) for common issues and solutions.

---

**Created:** 2025-10-22
**Version:** 1.0
**Status:** Active (SUB branch migrating)
