-- Fix missing is_deleted column in users table
-- Run this in Portainer PostgreSQL console if you get API errors

-- Add is_deleted column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
AND column_name = 'is_deleted';

-- Show result
\echo '✅ is_deleted column verified!'
