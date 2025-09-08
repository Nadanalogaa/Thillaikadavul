-- Migration: Add recipient_ids column to events and notices tables
-- This fixes the "Could not find the 'recipient_ids' column" error

-- Add recipient_ids column to events table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='recipient_ids') THEN
        ALTER TABLE events ADD COLUMN recipient_ids JSONB DEFAULT '[]';
        COMMENT ON COLUMN events.recipient_ids IS 'Array of user IDs who should receive this event';
    END IF;
END $$;

-- Add recipient_ids column to notices table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='notices' AND column_name='recipient_ids') THEN
        ALTER TABLE notices ADD COLUMN recipient_ids JSONB DEFAULT '[]';
        COMMENT ON COLUMN notices.recipient_ids IS 'Array of user IDs who should receive this notice';
    END IF;
END $$;

-- Create indexes for better performance on recipient_ids queries
CREATE INDEX IF NOT EXISTS idx_events_recipient_ids ON events USING GIN (recipient_ids);
CREATE INDEX IF NOT EXISTS idx_notices_recipient_ids ON notices USING GIN (recipient_ids);

-- Verify the columns were added
SELECT 
    table_name, 
    column_name, 
    data_type, 
    column_default 
FROM information_schema.columns 
WHERE table_name IN ('events', 'notices') 
  AND column_name = 'recipient_ids'
ORDER BY table_name;