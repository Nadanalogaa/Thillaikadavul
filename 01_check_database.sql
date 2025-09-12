-- Step 1: Database Inspection Script
-- Run this FIRST to see what exists in your database

-- Check if section_type enum exists and show its values
SELECT 'section_type enum values:' as info;
SELECT unnest(enum_range(NULL::section_type)) as section_type_values;

-- Check if content_status enum exists and show its values  
SELECT 'content_status enum values:' as info;
SELECT unnest(enum_range(NULL::content_status)) as content_status_values;

-- Check if homepage_sections table exists
SELECT 'homepage_sections table info:' as info;
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'homepage_sections' 
ORDER BY ordinal_position;

-- Check if section_content_blocks table exists
SELECT 'section_content_blocks table info:' as info;
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'section_content_blocks' 
ORDER BY ordinal_position;

-- Count existing data
SELECT 'Existing data counts:' as info;
SELECT 
    (SELECT COUNT(*) FROM homepage_sections) as sections_count,
    (SELECT COUNT(*) FROM section_content_blocks) as content_blocks_count;

-- Show existing sections if any
SELECT 'Existing sections:' as info;
SELECT id, section_key, section_type, name, is_active 
FROM homepage_sections 
ORDER BY order_index;

RAISE NOTICE 'Database inspection complete. Review the results above before running step 2.';