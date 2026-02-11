-- ============================================================================
-- Quick Migration: Add Parent-Student Columns
-- ============================================================================
-- Adds minimal columns needed for parent-student relationships

-- 1. Add parent_id column to link students to parents
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. Add is_primary flag (if true, user can self-login; if false, only via parent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT true;

-- 3. Add display_name for student identification in parent view
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 4. Create index for faster parent->children lookup
CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);

-- 5. Add student_id to notifications for parent-student context
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON notifications(student_id);

-- 6. Set display_name = name for existing users
UPDATE users
SET display_name = name
WHERE display_name IS NULL AND is_deleted = false;

-- 7. Add Parent role if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        RAISE NOTICE 'user_role type does not exist, skipping';
    ELSE
        -- This will work if role column uses enum or text
        EXECUTE 'ALTER TABLE users ALTER COLUMN role TYPE TEXT';
    END IF;
END $$;

SELECT 'Migration completed successfully!' as status;
