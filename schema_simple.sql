-- Simple fix for immediate issues
-- Add missing columns to batches table
DO $$ 
BEGIN
    -- Add capacity column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'capacity') THEN
        ALTER TABLE batches ADD COLUMN capacity INTEGER DEFAULT 0;
    END IF;
    
    -- Add enrolled column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'enrolled') THEN
        ALTER TABLE batches ADD COLUMN enrolled INTEGER DEFAULT 0;
    END IF;
    
    -- Add start_date column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'start_date') THEN
        ALTER TABLE batches ADD COLUMN start_date DATE;
    END IF;
    
    -- Add end_date column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'end_date') THEN
        ALTER TABLE batches ADD COLUMN end_date DATE;
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'is_active') THEN
        ALTER TABLE batches ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Insert basic courses only if table is empty
INSERT INTO courses (name, description, icon) 
SELECT 'Bharatanatyam', 'Classical Indian dance form', 'Bharatanatyam'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'Bharatanatyam');

INSERT INTO courses (name, description, icon) 
SELECT 'Vocal', 'Carnatic vocal music', 'Vocal'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'Vocal');

INSERT INTO courses (name, description, icon) 
SELECT 'Drawing', 'Art and drawing classes', 'Drawing'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'Drawing');

INSERT INTO courses (name, description, icon) 
SELECT 'Abacus', 'Mental arithmetic training', 'Abacus'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'Abacus');