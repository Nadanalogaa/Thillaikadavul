-- Migration: Add days, start_time, and end_time fields to batches table
-- Purpose: Allow admins to select multiple weekdays and set class timing when creating/editing batches
-- Display: Batch listings will show formatted schedule like "Tuesday & Thursday, 5:00 PM - 6:30 PM"

-- Add days column (array of weekday names)
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS days TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add start_time column
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS start_time TIME;

-- Add end_time column
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add comment to clarify usage
COMMENT ON COLUMN batches.days IS 'Array of weekday names (Monday, Tuesday, etc.) when batch classes occur';
COMMENT ON COLUMN batches.start_time IS 'Class start time (e.g., 17:00 for 5:00 PM)';
COMMENT ON COLUMN batches.end_time IS 'Class end time (e.g., 18:30 for 6:30 PM)';

-- Example update (commented out):
-- UPDATE batches SET
--   days = ARRAY['Tuesday', 'Thursday'],
--   start_time = '17:00',
--   end_time = '18:30'
-- WHERE id = 'some-batch-id';
