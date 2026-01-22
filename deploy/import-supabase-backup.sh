#!/bin/bash
# Script to import Supabase backup into self-hosted PostgreSQL container
# Usage: ./import-supabase-backup.sh [container-name] [backup-file]

set -e

# Configuration
CONTAINER_NAME="${1:-nadanaloga-sub-postgres}"
BACKUP_FILE="${2:-supabase_backup.sql}"
DB_NAME="nadanaloga"
DB_USER="nadanaloga_user"

echo "========================================="
echo "Supabase to Self-Hosted PostgreSQL Import"
echo "========================================="
echo "Container: $CONTAINER_NAME"
echo "Backup file: $BACKUP_FILE"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "========================================="

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file '$BACKUP_FILE' not found!"
    echo "Please provide the path to supabase_backup.sql"
    exit 1
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Error: Container '$CONTAINER_NAME' is not running!"
    echo "Please start the container in Portainer first."
    exit 1
fi

echo ""
echo "Step 1: Copying backup file to container..."
docker cp "$BACKUP_FILE" "$CONTAINER_NAME:/tmp/backup.sql"
echo "✓ Backup file copied successfully"

echo ""
echo "Step 2: Creating database and user (if not exists)..."
docker exec -i "$CONTAINER_NAME" psql -U postgres <<EOF
-- Create database if it doesn't exist
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Create user if it doesn't exist
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '${POSTGRES_PASSWORD:-SecurePassword123!}';
  END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF
echo "✓ Database and user configured"

echo ""
echo "Step 3: Importing backup (this may take a few minutes)..."
echo "Note: You may see some warnings about extensions/roles - this is normal"
docker exec -i "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" < <(cat "$BACKUP_FILE")
echo "✓ Backup imported successfully"

echo ""
echo "Step 4: Setting proper permissions..."
docker exec -i "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" <<EOF
-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;
EOF
echo "✓ Permissions configured"

echo ""
echo "Step 5: Verifying import..."
TABLE_COUNT=$(docker exec -i "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "✓ Found $TABLE_COUNT tables in the database"

echo ""
echo "Step 6: Listing imported tables..."
docker exec -i "$CONTAINER_NAME" psql -U postgres -d "$DB_NAME" -c "\dt public.*"

echo ""
echo "========================================="
echo "✓ Import completed successfully!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Verify the data in Portainer console"
echo "2. Update your .env.sub file with DATABASE_URL"
echo "3. Restart the nadanaloga-sub-app container"
echo ""
