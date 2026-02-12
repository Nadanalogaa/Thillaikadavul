-- Migration: Add batch support to fee structures and create discount system
-- Date: 2026-02-12
-- Description:
--   1. Add batch_ids array to fee_structures table
--   2. Create student_discounts table for course and batch-level discounts

-- Step 1: Add batch_ids column to fee_structures
ALTER TABLE fee_structures
ADD COLUMN IF NOT EXISTS batch_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Step 2: Create student_discounts table
CREATE TABLE IF NOT EXISTS student_discounts (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('course', 'batch')),
    course_id INTEGER,
    batch_id INTEGER,
    discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Ensure course_id is provided for both types
    CONSTRAINT course_required CHECK (course_id IS NOT NULL),

    -- Ensure batch_id is only set for batch-type discounts
    CONSTRAINT batch_type_validation CHECK (
        (discount_type = 'course' AND batch_id IS NULL) OR
        (discount_type = 'batch' AND batch_id IS NOT NULL)
    ),

    -- Unique constraint: one active discount per student per course/batch
    CONSTRAINT unique_active_discount UNIQUE (student_id, discount_type, course_id, batch_id, is_active)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_student_discounts_student
ON student_discounts(student_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_student_discounts_course
ON student_discounts(course_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_student_discounts_batch
ON student_discounts(batch_id) WHERE is_active = TRUE;

-- Add comment to the table
COMMENT ON TABLE student_discounts IS 'Stores course-level and batch-level discounts for students';
COMMENT ON COLUMN student_discounts.discount_type IS 'Type of discount: course (applies to all batches) or batch (specific batch only)';
COMMENT ON COLUMN student_discounts.batch_id IS 'NULL for course-level discounts, specific batch ID for batch-level discounts';

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '1. Added batch_ids column to fee_structures';
    RAISE NOTICE '2. Created student_discounts table';
    RAISE NOTICE '3. Created indexes for performance';
END $$;
