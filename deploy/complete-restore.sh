#!/bin/bash
# Complete Database Restoration Script
# Run this ON the server (192.168.0.105)

set -e

echo "🔧 Complete Database Restoration"
echo "================================"
echo ""

# Configuration
CONTAINER="nadanaloga-main-postgres"
DB_USER="nadanaloga_user"
DB_NAME="nadanaloga"
BACKUP_FILE="supabase_backup.sql"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: $BACKUP_FILE not found!"
    echo "Please place the backup file in the current directory."
    exit 1
fi

echo "[1/6] Copying backup to PostgreSQL container..."
docker cp "$BACKUP_FILE" "$CONTAINER:/tmp/backup.sql"
echo "✓ Backup copied"
echo ""

echo "[2/6] Terminating existing connections..."
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d postgres <<EOF
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();
EOF
echo "✓ Connections terminated"
echo ""

echo "[3/6] Dropping and recreating database..."
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d postgres <<EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF
echo "✓ Database recreated"
echo ""

echo "[4/6] Restoring from backup... (this may take a minute)"
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
echo "✓ Backup restored"
echo ""

echo "[5/6] Adding missing columns..."
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<'EOF'
-- Users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS class_preference VARCHAR(20) DEFAULT 'Hybrid';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Grade exams table
ALTER TABLE public.grade_exams ADD COLUMN IF NOT EXISTS exam_date DATE;
ALTER TABLE public.grade_exams ADD COLUMN IF NOT EXISTS exam_time TIME;
ALTER TABLE public.grade_exams ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.grade_exams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Locations table
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Timestamps for other tables
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.demo_bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.demo_bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.book_materials ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.book_materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

SELECT 'Columns added successfully' as status;
EOF
echo "✓ Missing columns added"
echo ""

echo "[6/6] Restarting application container..."
docker restart nadanaloga-main-app
echo "✓ Application restarted"
echo ""

echo "✅ DATABASE RESTORATION COMPLETE!"
echo ""
echo "Next steps:"
echo "1. Wait 30 seconds for app to fully start"
echo "2. Visit www.nadanaloga.com"
echo "3. Test adding locations, students, teachers, etc."
echo ""
