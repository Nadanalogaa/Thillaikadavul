-- Media Items table for images, videos, and YouTube embeds
-- Run this after core schema has been created

CREATE TABLE IF NOT EXISTS media_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('image','video','youtube')),
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    upload_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Helpful index for ordering
CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON media_items(created_at DESC);

-- Optional: check constraint to limit total rows to 10 cannot be expressed directly,
-- we will enforce in application code. You may also create a trigger if needed.

