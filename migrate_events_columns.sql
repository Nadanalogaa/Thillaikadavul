-- Migration Script: Fix Events Table Column Names
-- Run this BEFORE running the main schema_final_complete.sql

-- This script handles the column name mismatch between existing events table 
-- (using 'date' column) and new events system (using 'event_date' column)

DO $$
BEGIN
    RAISE NOTICE '🔄 Starting Events Table Column Migration...';
    
    -- Check if the events table exists and has the old 'date' column
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='events' AND column_name='date') THEN
        
        RAISE NOTICE '✅ Found existing events table with "date" column';
        
        -- Add new columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='events' AND column_name='event_date') THEN
            ALTER TABLE events ADD COLUMN event_date DATE;
            RAISE NOTICE '✅ Added event_date column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='events' AND column_name='event_time') THEN
            ALTER TABLE events ADD COLUMN event_time TIME;
            RAISE NOTICE '✅ Added event_time column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='events' AND column_name='created_by') THEN
            ALTER TABLE events ADD COLUMN created_by UUID REFERENCES users(id);
            RAISE NOTICE '✅ Added created_by column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='events' AND column_name='target_audience') THEN
            ALTER TABLE events ADD COLUMN target_audience TEXT[] DEFAULT '{}';
            RAISE NOTICE '✅ Added target_audience column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='events' AND column_name='images') THEN
            ALTER TABLE events ADD COLUMN images JSONB DEFAULT '[]';
            RAISE NOTICE '✅ Added images column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='events' AND column_name='priority') THEN
            ALTER TABLE events ADD COLUMN priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High'));
            RAISE NOTICE '✅ Added priority column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='events' AND column_name='event_type') THEN
            ALTER TABLE events ADD COLUMN event_type TEXT DEFAULT 'General' CHECK (event_type IN ('General', 'Academic', 'Cultural', 'Sports', 'Notice'));
            RAISE NOTICE '✅ Added event_type column';
        END IF;
        
        -- Migrate data from old 'date' column to new 'event_date' column
        UPDATE events 
        SET event_date = date::date 
        WHERE event_date IS NULL AND date IS NOT NULL;
        
        RAISE NOTICE '✅ Migrated data from "date" to "event_date" column';
        
        -- Extract time from old datetime if it exists
        UPDATE events 
        SET event_time = date::time 
        WHERE event_time IS NULL AND date IS NOT NULL;
        
        RAISE NOTICE '✅ Extracted time data to "event_time" column';
        
    ELSE
        RAISE NOTICE '⚠️  Events table either doesn''t exist or already has correct column names';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Events Table Column Migration Complete!';
    RAISE NOTICE '✅ Now you can safely run schema_final_complete.sql';
    RAISE NOTICE '';

END $$;