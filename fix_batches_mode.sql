-- URGENT FIX: Add missing mode column to batches table
-- This addresses the "Could not find the 'mode' column of 'batches'" error

DO $$
BEGIN
    -- Ensure mode column exists in batches table
    BEGIN
        ALTER TABLE batches ADD COLUMN mode TEXT CHECK (mode IN ('Online', 'Offline'));
        RAISE NOTICE '✅ Added mode column to batches table';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE '⚠️ mode column already exists in batches table';
        WHEN undefined_table THEN
            RAISE NOTICE '❌ batches table does not exist - run main schema first';
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Error adding mode column: %', SQLERRM;
    END;
    
    -- Test that we can insert a batch with mode
    BEGIN
        INSERT INTO batches (name, description, mode, capacity, is_active)
        VALUES ('Test Batch', 'Test Description', 'Online', 20, true);
        
        -- Cleanup test data
        DELETE FROM batches WHERE name = 'Test Batch';
        
        RAISE NOTICE '✅ SUCCESS: batches table with mode column working perfectly!';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Batches test failed: %', SQLERRM;
    END;
END $$;