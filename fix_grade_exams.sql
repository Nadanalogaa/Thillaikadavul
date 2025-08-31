-- Fix grade_exams table date constraint issue
-- Run this to fix the immediate grade exam error

DO $$
BEGIN
    -- Remove NOT NULL constraint from date column in grade_exams
    BEGIN
        ALTER TABLE grade_exams ALTER COLUMN date DROP NOT NULL;
        RAISE NOTICE '✅ Removed NOT NULL constraint from grade_exams.date column';
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE '⚠️ grade_exams table does not exist yet';
        WHEN OTHERS THEN 
            RAISE NOTICE '⚠️ Could not alter grade_exams.date constraint: %', SQLERRM;
    END;
END $$;

-- Test that we can now insert a grade exam without a date
DO $$
BEGIN
    BEGIN
        INSERT INTO grade_exams (title, description, date, is_open)
        VALUES ('Test Exam', 'Test Description', NULL, true);
        
        -- Cleanup
        DELETE FROM grade_exams WHERE title = 'Test Exam';
        
        RAISE NOTICE '✅ Grade exams can now accept NULL dates - issue resolved!';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Grade exams test failed: %', SQLERRM;
    END;
END $$;