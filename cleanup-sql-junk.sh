#!/bin/bash
# Remove all the junk SQL files from failed migrations

echo "Removing junk SQL files..."

# List of junk files to remove
rm -f schema.sql
rm -f schema_fixed.sql
rm -f schema_simple.sql
rm -f schema_fix_varchar.sql
rm -f schema_minimal_fix.sql
rm -f fix_grade_exams.sql
rm -f fix_grade_exams_now.sql
rm -f fix_batches_mode.sql
rm -f schema_complete_fix_clean.sql
rm -f add_course_image_columns.sql
rm -f schema_complete_fix.sql
rm -f schema_add_recipient_ids.sql
rm -f schema_add_media_items.sql
rm -f cms_fix.sql
rm -f 01_check_database.sql
rm -f 02_setup_cms.sql
rm -f cms_setup_simple.sql
rm -f migrate_events_columns.sql
rm -f schema_demo_bookings.sql
rm -f schema_final_complete.sql
rm -f check-schema.sql
rm -f deploy/fix-is-deleted-column.sql
rm -f deploy/add-missing-columns.sql
rm -f deploy/fix-all-schema.sql
rm -f deploy/QUICK-FIX.sql

echo "✓ Cleaned up junk SQL files"
echo ""
echo "KEPT (these are important):"
echo "  - supabase_backup.sql (THE BACKUP)"
echo "  - deploy/RESTORE-DATABASE.sql (restore script)"
echo "  - deploy/init-database.sql (if exists)"
echo "  - database/cms_schema.sql (CMS schema)"
