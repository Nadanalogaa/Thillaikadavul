#!/bin/bash

# Supabase to Local PostgreSQL Migration Script
# Run this script to export your Supabase database

echo "Exporting Supabase database..."

# Replace with your actual Supabase connection string
SUPABASE_URL="postgres://postgres.ojuybeasovauzkntbydd:5AirC1urQRqgfely@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"

# Export the database
pg_dump "$SUPABASE_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --file=supabase_backup.sql

if [ $? -eq 0 ]; then
    echo "✅ Supabase export completed successfully!"
    echo "📁 Backup saved as: supabase_backup.sql"
    echo ""
    echo "Next steps:"
    echo "1. Commit the updated docker-compose.yml"
    echo "2. Deploy the stack with local PostgreSQL"
    echo "3. Your data will be automatically imported!"
else
    echo "❌ Export failed. Check your connection string."
fi