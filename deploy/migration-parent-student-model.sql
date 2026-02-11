-- ============================================================================
-- MIGRATION: Parent-Student Relationship Model
-- ============================================================================
-- This migration adds support for parents with multiple student children.
-- Parents log in with their email, and can switch between their children's profiles.

-- 1. Add parent_id column to users table to link students to parents
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. Add is_primary flag to indicate if this student can self-login
-- If true, the student can login independently. If false, only parent can access.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT true;

-- 3. Add display_name for student profiles (since multiple students share parent email)
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 4. Create index for faster parent->children lookup
CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);

-- 5. Migration: For existing students with duplicate emails, link them to a parent
-- This identifies duplicate emails and creates parent accounts

DO $$
DECLARE
    duplicate_email RECORD;
    parent_user_id UUID;
    child_user RECORD;
    child_count INT;
BEGIN
    -- Loop through each duplicate email
    FOR duplicate_email IN
        SELECT email, COUNT(*) as count
        FROM users
        WHERE role = 'Student' AND is_deleted = false AND email NOT LIKE '%+%'
        GROUP BY email
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Processing duplicate email: % (% students)', duplicate_email.email, duplicate_email.count;

        -- Check if a parent account exists for this email
        SELECT id INTO parent_user_id
        FROM users
        WHERE email = duplicate_email.email
          AND role = 'Parent'
          AND is_deleted = false
        LIMIT 1;

        -- If no parent exists, create one from the first student
        IF parent_user_id IS NULL THEN
            -- Get the first student with this email
            SELECT * INTO child_user
            FROM users
            WHERE email = duplicate_email.email
              AND role = 'Student'
              AND is_deleted = false
            ORDER BY created_at
            LIMIT 1;

            -- Convert first student to parent role
            UPDATE users
            SET role = 'Parent',
                display_name = child_user.name || ' (Parent)',
                updated_at = NOW()
            WHERE id = child_user.id;

            parent_user_id := child_user.id;
            RAISE NOTICE '  Created parent account from student: %', child_user.name;
        END IF;

        -- Link all other students with this email to the parent
        child_count := 0;
        FOR child_user IN
            SELECT * FROM users
            WHERE email = duplicate_email.email
              AND role = 'Student'
              AND is_deleted = false
              AND id != parent_user_id
        LOOP
            -- Generate unique email for child using +alias
            child_count := child_count + 1;

            -- Extract email parts
            UPDATE users
            SET parent_id = parent_user_id,
                email = REPLACE(duplicate_email.email, '@', '+child' || child_count || '@'),
                display_name = child_user.name,
                is_primary = false,
                updated_at = NOW()
            WHERE id = child_user.id;

            RAISE NOTICE '    Linked student: % (new email: %)', child_user.name, REPLACE(duplicate_email.email, '@', '+child' || child_count || '@');
        END LOOP;
    END LOOP;
END $$;

-- 6. Update existing single students to have display_name
UPDATE users
SET display_name = name
WHERE role = 'Student'
  AND display_name IS NULL
  AND is_deleted = false;

-- 7. Create view for easy parent-children lookup
CREATE OR REPLACE VIEW parent_students_view AS
SELECT
    p.id as parent_id,
    p.name as parent_name,
    p.email as parent_email,
    s.id as student_id,
    s.display_name as student_name,
    s.email as student_email,
    s.dob as student_dob,
    s.grade as student_grade,
    s.courses as student_courses,
    s.status as student_status
FROM users p
LEFT JOIN users s ON s.parent_id = p.id
WHERE p.role = 'Parent' AND p.is_deleted = false
  AND (s.role = 'Student' OR s.role IS NULL)
  AND (s.is_deleted = false OR s.is_deleted IS NULL);

-- 8. Add notification improvements for student-specific context
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON notifications(student_id);

COMMENT ON COLUMN notifications.student_id IS 'For parent accounts, this specifies which child student this notification is about';

-- 9. Update existing notifications to set student_id = user_id for students
UPDATE notifications n
SET student_id = n.user_id
WHERE student_id IS NULL
  AND EXISTS (SELECT 1 FROM users u WHERE u.id = n.user_id AND u.role = 'Student');

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   - Parents: %', (SELECT COUNT(*) FROM users WHERE role = 'Parent' AND is_deleted = false);
    RAISE NOTICE '   - Students: %', (SELECT COUNT(*) FROM users WHERE role = 'Student' AND is_deleted = false);
    RAISE NOTICE '   - Parent-child relationships: %', (SELECT COUNT(*) FROM users WHERE parent_id IS NOT NULL AND is_deleted = false);
END $$;
