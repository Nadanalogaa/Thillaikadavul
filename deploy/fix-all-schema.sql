-- Comprehensive Schema Fix for PostgreSQL Database
-- This script adds all missing columns that the application expects

-- ========================================
-- FIX USERS TABLE
-- ========================================
-- Add is_deleted column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add class_preference column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'class_preference'
    ) THEN
        ALTER TABLE users ADD COLUMN class_preference VARCHAR(20) DEFAULT 'Hybrid';
    END IF;
END $$;

-- Add updated_at column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- ========================================
-- FIX EVENTS TABLE
-- ========================================
-- Add is_active column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE events ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add is_public column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'is_public'
    ) THEN
        ALTER TABLE events ADD COLUMN is_public BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ========================================
-- FIX GRADE_EXAMS TABLE
-- ========================================
-- Check if exam_date column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'grade_exams' AND column_name = 'exam_date'
    ) THEN
        ALTER TABLE grade_exams ADD COLUMN exam_date DATE;
    END IF;
END $$;

-- Check if exam_time column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'grade_exams' AND column_name = 'exam_time'
    ) THEN
        ALTER TABLE grade_exams ADD COLUMN exam_time TIME;
    END IF;
END $$;

-- ========================================
-- FIX LOCATIONS TABLE
-- ========================================
-- Add is_active column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'locations' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE locations ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- ========================================
-- ADD created_at and updated_at TO ALL TABLES
-- ========================================
-- Add created_at to batches
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'batches' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE batches ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at to batches
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'batches' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE batches ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add created_at to courses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'courses' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE courses ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at to courses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'courses' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE courses ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add created_at to fee_structures
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fee_structures' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE fee_structures ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at to fee_structures
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fee_structures' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE fee_structures ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add created_at to demo_bookings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'demo_bookings' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE demo_bookings ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at to demo_bookings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'demo_bookings' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE demo_bookings ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add created_at to events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE events ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at to events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE events ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add created_at to grade_exams
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'grade_exams' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE grade_exams ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at to grade_exams
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'grade_exams' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE grade_exams ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add created_at to book_materials
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'book_materials' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE book_materials ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at to book_materials
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'book_materials' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE book_materials ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add created_at to notices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notices' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE notices ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at to notices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notices' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE notices ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add created_at to locations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'locations' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE locations ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at to locations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'locations' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE locations ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add created_at to invoices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE invoices ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at to invoices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE invoices ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- ========================================
-- VERIFICATION QUERY
-- ========================================
\echo 'Schema migration complete! Verifying critical columns...'

-- Check users table
SELECT 'users table' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('is_deleted', 'class_preference', 'updated_at')
ORDER BY column_name;

-- Check events table
SELECT 'events table' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events'
AND column_name IN ('is_active', 'is_public', 'event_date', 'created_at')
ORDER BY column_name;

-- Check grade_exams table
SELECT 'grade_exams table' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'grade_exams'
AND column_name IN ('exam_date', 'exam_time', 'created_at')
ORDER BY column_name;

-- Check locations table
SELECT 'locations table' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'locations'
AND column_name IN ('is_active', 'created_at')
ORDER BY column_name;

\echo 'Done! You can now restart the app container.'
