-- MINIMAL SCHEMA FIX - Focus on core issues only
-- Run this first to fix critical problems, then run full schema

-- Step 1: Fix existing constraints that are causing issues
DO $$
BEGIN
    -- Remove NOT NULL constraint from password column if it exists
    BEGIN
        ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    
    -- Ensure is_deleted column exists and is nullable
    BEGIN
        ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    -- Ensure deleted_at column exists and is nullable
    BEGIN
        ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Step 2: Fix book_materials table completely
DROP TABLE IF EXISTS book_materials CASCADE;

CREATE TABLE book_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    course_name TEXT,
    type TEXT CHECK (type IN ('PDF', 'Video', 'YouTube')),
    url TEXT,
    data TEXT,
    recipient_ids JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Simple test to verify core functionality
DO $$
BEGIN
    -- Test that we can insert a user without password
    INSERT INTO users (name, email, role, is_deleted, deleted_at)
    VALUES ('Test User', 'test-' || gen_random_uuid() || '@example.com', 'Student', false, null);
    
    -- Test book_materials insert
    INSERT INTO book_materials (title, description, type, url, recipient_ids)
    VALUES ('Test Material', 'Test Description', 'PDF', 'test-url', '["test-id"]');
    
    -- Cleanup test data
    DELETE FROM users WHERE email LIKE 'test-%@example.com';
    DELETE FROM book_materials WHERE title = 'Test Material';
    
    RAISE NOTICE '✅ Core functionality test PASSED - Ready for full schema deployment!';
END $$;