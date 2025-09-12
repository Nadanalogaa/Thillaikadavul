-- Step 1: Database Inspection Script
-- Run this FIRST to see what exists in your database

DO $$
BEGIN
    -- Show section_type enum values if exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'section_type') THEN
        RAISE NOTICE 'section_type enum exists with values:';
        -- Note: Individual enum values will be shown in query results below
    ELSE
        RAISE NOTICE 'section_type enum does NOT exist';
    END IF;
    
    -- Show content_status enum values if exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
        RAISE NOTICE 'content_status enum exists with values:';
    ELSE
        RAISE NOTICE 'content_status enum does NOT exist';
    END IF;
    
    -- Check tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'homepage_sections') THEN
        RAISE NOTICE 'homepage_sections table EXISTS';
    ELSE
        RAISE NOTICE 'homepage_sections table does NOT exist';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'section_content_blocks') THEN
        RAISE NOTICE 'section_content_blocks table EXISTS';
    ELSE
        RAISE NOTICE 'section_content_blocks table does NOT exist';
    END IF;
    
    RAISE NOTICE 'Database inspection complete. Review the query results below, then run step 2.';
END $$;

-- Show enum values (run these separately if tables exist)
-- Uncomment the lines below if the enums exist:

-- SELECT unnest(enum_range(NULL::section_type)) as section_type_values;
-- SELECT unnest(enum_range(NULL::content_status)) as content_status_values;

-- Show table structure (run these if tables exist)
-- Uncomment the lines below if the tables exist:

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'homepage_sections' 
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'section_content_blocks' 
-- ORDER BY ordinal_position;

-- Show existing data (run these if tables exist)
-- Uncomment the lines below if the tables exist:

-- SELECT COUNT(*) as homepage_sections_count FROM homepage_sections;
-- SELECT COUNT(*) as section_content_blocks_count FROM section_content_blocks;
-- SELECT id, section_key, section_type, name, is_active FROM homepage_sections ORDER BY order_index;