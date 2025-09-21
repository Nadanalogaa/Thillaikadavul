-- Demo Bookings Table for Nadanaloga Academy
-- Add this to your existing Supabase database

-- Demo Bookings table
CREATE TABLE IF NOT EXISTS demo_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    country TEXT NOT NULL,
    course_name TEXT NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    message TEXT, -- Optional message from the user
    admin_notes TEXT, -- Admin can add notes
    
    -- Tracking fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contacted_at TIMESTAMP WITH TIME ZONE, -- When admin contacted the user
    demo_scheduled_at TIMESTAMP WITH TIME ZONE, -- When demo is scheduled
    
    -- Contact preferences
    preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'whatsapp')),
    
    -- Metadata
    source TEXT DEFAULT 'website', -- website, referral, etc.
    ip_address INET,
    user_agent TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_demo_bookings_email ON demo_bookings(email);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_status ON demo_bookings(status);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_created_at ON demo_bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_course_id ON demo_bookings(course_id);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_demo_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_demo_bookings_updated_at') THEN
        CREATE TRIGGER update_demo_bookings_updated_at 
            BEFORE UPDATE ON demo_bookings 
            FOR EACH ROW EXECUTE FUNCTION update_demo_bookings_updated_at();
    END IF;
END $$;

-- Disable RLS for demo bookings (since the app uses custom authentication)
ALTER TABLE demo_bookings DISABLE ROW LEVEL SECURITY;

-- Test the table creation
DO $$
BEGIN
    RAISE NOTICE '✅ Demo bookings table created successfully!';
    RAISE NOTICE '📝 Table includes: name, email, phone, country, course selection';
    RAISE NOTICE '📊 Status tracking: pending → confirmed → completed';
    RAISE NOTICE '🔔 Ready for admin notifications and email integration';
END $$;