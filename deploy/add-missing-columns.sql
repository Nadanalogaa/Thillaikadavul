-- Add missing columns to users table

-- Add is_deleted column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT false;
        COMMENT ON COLUMN users.is_deleted IS 'Soft delete flag';
    END IF;
END $$;

-- Add class_preference column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'class_preference'
    ) THEN
        ALTER TABLE users ADD COLUMN class_preference VARCHAR(20) DEFAULT 'Hybrid';
        COMMENT ON COLUMN users.class_preference IS 'User preference: Online, Offline, or Hybrid';
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        COMMENT ON COLUMN users.updated_at IS 'Last update timestamp';
    END IF;
END $$;

-- Show final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
