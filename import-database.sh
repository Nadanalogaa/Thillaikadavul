#!/bin/bash
# Database import script for Portainer deployment

echo "🗄️  Importing Supabase backup to PostgreSQL..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec nadanaloga-postgres pg_isready -U nadanaloga_user -d nadanaloga; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Copy backup file to container
echo "📄 Copying backup file to container..."
docker cp supabase_backup.sql nadanaloga-postgres:/tmp/backup.sql

# Import the backup
echo "🔄 Importing backup..."
docker exec nadanaloga-postgres psql -U nadanaloga_user -d nadanaloga -f /tmp/backup.sql

# Clean up
echo "🧹 Cleaning up..."
docker exec nadanaloga-postgres rm /tmp/backup.sql

echo "✅ Database import completed!"
echo "🚀 Your application should now have all the data from Supabase!"