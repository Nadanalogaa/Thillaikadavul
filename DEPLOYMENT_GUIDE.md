# Deployment Guide for Nadanaloga Academy

## Branch-Specific Deployment

This project supports deploying multiple branches (main, sub) simultaneously without conflicts.

## Environment Setup

### For Main Branch (Production)
```bash
# Set environment variable
export BRANCH_NAME=main

# Or use the provided .env file
cp .env.main .env

# Deploy
docker compose up -d --build
```

### For Sub Branch (Development/Staging)
```bash
# Set environment variable
export BRANCH_NAME=sub

# Or use the provided .env file
cp .env.sub .env

# Deploy
docker compose up -d --build
```

## Port Configuration

| Branch | Application Port | PostgreSQL Port |
|--------|-----------------|-----------------|
| main   | 3000            | 5432 (internal) |
| sub    | 3001            | 5433 (internal) |

## Container Naming

Containers are automatically named based on branch:
- Main branch: `nadanaloga-main-app`, `nadanaloga-main-postgres`
- Sub branch: `nadanaloga-sub-app`, `nadanaloga-sub-postgres`

## Fixing Container Conflicts

If you encounter name conflicts:

### Option 1: Clean Up Old Containers
```bash
# Stop all nadanaloga containers
docker ps -a | grep nadanaloga | awk '{print $1}' | xargs docker stop

# Remove all nadanaloga containers
docker ps -a | grep nadanaloga | awk '{print $1}' | xargs docker rm

# Deploy fresh
docker compose up -d --build
```

### Option 2: Branch-Specific Cleanup
```bash
# For main branch
docker stop nadanaloga-main-app nadanaloga-main-postgres
docker rm nadanaloga-main-app nadanaloga-main-postgres

# For sub branch
docker stop nadanaloga-sub-app nadanaloga-sub-postgres
docker rm nadanaloga-sub-app nadanaloga-sub-postgres
```

### Option 3: Complete Reset
```bash
# Stop and remove everything
docker compose down

# Remove volumes (WARNING: This deletes all data!)
docker volume rm $(docker volume ls -q | grep nadanaloga)

# Rebuild
docker compose up -d --build
```

## Deployment in Portainer

### For Main Branch
1. Stack Name: `nadanaloga-main`
2. Environment Variables:
   ```
   BRANCH_NAME=main
   APP_PORT=3000
   ```
3. Deploy from Git repository (main branch)

### For Sub Branch
1. Stack Name: `nadanaloga-sub`
2. Environment Variables:
   ```
   BRANCH_NAME=sub
   APP_PORT=3001
   ```
3. Deploy from Git repository (sub branch)

## Health Checks

Check if containers are running:
```bash
# View all containers
docker ps

# Check app health
curl http://localhost:3000/api/health  # Main
curl http://localhost:3001/api/health  # Sub

# View logs
docker compose logs -f app
docker compose logs -f postgres
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :3000
sudo lsof -i :3001

# Kill the process or change APP_PORT in .env
```

### Database Connection Issues
```bash
# Check postgres health
docker exec nadanaloga-main-postgres pg_isready -U nadanaloga_user

# Access database
docker exec -it nadanaloga-main-postgres psql -U nadanaloga_user -d nadanaloga
```

### Container Won't Start
```bash
# View detailed logs
docker logs nadanaloga-main-app

# Check resource usage
docker stats

# Verify environment variables
docker inspect nadanaloga-main-app | grep -A 20 Env
```

## Production Checklist

Before deploying to main:
- [ ] All tests pass
- [ ] Environment variables configured
- [ ] Database backup created
- [ ] SSL certificates configured
- [ ] Domain/subdomain pointed to correct port
- [ ] Monitoring and logging setup
- [ ] Security headers configured

## Rolling Back

To rollback to previous version:
```bash
# Stop current deployment
docker compose down

# Checkout previous commit/tag
git checkout <previous-commit>

# Deploy
docker compose up -d --build
```

## Support

For issues or questions:
- Email: nadanalogaa@gmail.com
- Phone: +91 95668 66588, +91 90929 08888
