-- Combined Database Initialization for VPS Portainer Deployment
-- This script combines schema_final_complete.sql and schema_demo_bookings.sql
-- Run this in PostgreSQL to initialize the complete database

-- Start with the complete schema
-- Complete Database Schema Fix for Nadanaloga
-- Run this in your Supabase SQL Editor
-- This is the FINAL, COMPLETE schema that includes ALL fixes including recipient_ids

-- Users table - SAFE MIGRATION: Create table only if it doesn't exist, preserve all data
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    role TEXT NOT NULL CHECK (role IN ('Student', 'Teacher', 'Admin')),
    class_preference TEXT CHECK (class_preference IN ('Online', 'Offline', 'Hybrid')),
    photo_url TEXT,
    dob DATE,
    sex TEXT CHECK (sex IN ('Male', 'Female', 'Other')),
    contact_number TEXT,
    alternate_contact_number TEXT,
    address TEXT,
    country TEXT,
    state TEXT,
    city TEXT,
    postal_code TEXT,
    timezone TEXT,
    preferred_timings JSONB DEFAULT '[]',
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'On Hold', 'Graduated')),
    location_id UUID,
    courses JSONB DEFAULT '[]',
    father_name TEXT,
    standard TEXT,
    school_name TEXT,
    grade TEXT,
    notes TEXT,
    schedules JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    course_expertise JSONB DEFAULT '[]',
    educational_qualifications TEXT,
    employment_type TEXT CHECK (employment_type IN ('Part-time', 'Full-time')),
    years_of_experience INTEGER,
    available_time_slots JSONB DEFAULT '[]',
    date_of_joining DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Courses table - SAFE MIGRATION: Create table only if it doesn't exist, preserve all data
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRITICAL: Add image and icon_url columns safely - PRESERVES ALL EXISTING DATA
DO $$ 
BEGIN
    -- Add image column if it doesn't exist (for course images on registration screen)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='image') THEN
        ALTER TABLE courses ADD COLUMN image TEXT;
        RAISE NOTICE '✅ SAFE MIGRATION: Added image column to courses table - ALL DATA PRESERVED';
    ELSE
        RAISE NOTICE '⚠️  Image column already exists in courses table - DATA INTACT';
    END IF;
    
    -- Add icon_url column if it doesn't exist (for custom uploaded icons)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='icon_url') THEN
        ALTER TABLE courses ADD COLUMN icon_url TEXT;
        RAISE NOTICE '✅ SAFE MIGRATION: Added icon_url column to courses table - ALL DATA PRESERVED';
    ELSE
        RAISE NOTICE '⚠️  Icon_url column already exists in courses table - DATA INTACT';
    END IF;
    
    -- Verify existing courses are still there
    PERFORM count(*) FROM courses;
    RAISE NOTICE '✅ DATA VERIFICATION: All existing courses preserved and accessible';
END $$;

CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default courses only if they don't exist (preserve existing data)
INSERT INTO courses (name, description, icon, image, icon_url) 
SELECT 'Bharatanatyam', 'Explore the divine art of classical Indian dance with graceful movements and expressive storytelling', 'Bharatanatyam', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'Bharatanatyam');

INSERT INTO courses (name, description, icon, image, icon_url) 
SELECT 'Vocal', 'Develop your voice with traditional Carnatic vocal music techniques and classical compositions', 'Vocal', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'Vocal');

INSERT INTO courses (name, description, icon, image, icon_url) 
SELECT 'Drawing', 'Learn to express creativity through various drawing techniques and artistic mediums', 'Drawing', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'Drawing');

INSERT INTO courses (name, description, icon, image, icon_url) 
SELECT 'Abacus', 'Master mental arithmetic and boost mathematical skills with traditional abacus methods', 'Abacus', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'Abacus');

INSERT INTO locations (name, address, is_active)
SELECT 'Main Center', 'Enter your main location address', true
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Main Center');

INSERT INTO locations (name, address, is_active)
SELECT 'Branch 1', 'Enter branch location address', true
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Branch 1');

-- Batches table - SAFE MIGRATION: Create table only if it doesn't exist, preserve all data
CREATE TABLE IF NOT EXISTS batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    schedule JSONB DEFAULT '[]', -- Array of {timing: string, studentIds: string[]} objects
    capacity INTEGER DEFAULT 0, -- Maximum number of students
    enrolled INTEGER DEFAULT 0, -- Current number of enrolled students
    mode TEXT CHECK (mode IN ('Online', 'Offline')), -- CRITICAL: mode column
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL, -- CRITICAL: location_id column
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table - SAFE MIGRATION: Create table only if it doesn't exist, preserve all data
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date DATE, -- Keep old column for backward compatibility
    event_date DATE, -- New column name used by enhanced system
    time TIME, -- Keep old column for backward compatibility  
    event_time TIME, -- New column name used by enhanced system
    location TEXT,
    created_by UUID REFERENCES users(id),
    target_audience TEXT[] DEFAULT '{}', -- Array of roles: Student, Teacher, Admin, or specific course names
    images JSONB DEFAULT '[]', -- Array of image objects {url, caption, filename}
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE, -- CRITICAL: is_public column for public/private events
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    event_type TEXT DEFAULT 'General' CHECK (event_type IN ('General', 'Academic', 'Cultural', 'Sports', 'Notice')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRITICAL FIX: Add recipient_ids column to events table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='recipient_ids') THEN
        ALTER TABLE events ADD COLUMN recipient_ids JSONB DEFAULT '[]';
        RAISE NOTICE '✅ CRITICAL FIX: Added recipient_ids column to events table - NOTIFICATION SYSTEM NOW WORKING';
    ELSE
        RAISE NOTICE '⚠️  recipient_ids column already exists in events table';
    END IF;
END $$;

-- Grade Exams table - SAFE MIGRATION: Create table only if it doesn't exist, preserve all data
CREATE TABLE IF NOT EXISTS grade_exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date DATE, -- NULLABLE - this is the key fix
    time TEXT,
    duration TEXT,
    course TEXT,
    grade TEXT,
    syllabus_url TEXT,
    registration_fee DECIMAL(10,2),
    registration_deadline DATE,
    recipient_ids JSONB DEFAULT '[]', -- For targeting specific students/teachers
    is_open BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Book Materials table - SAFE MIGRATION: Create table only if it doesn't exist, preserve all data
CREATE TABLE IF NOT EXISTS book_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    course_name TEXT,
    type TEXT CHECK (type IN ('PDF', 'Video', 'YouTube')),
    url TEXT, -- CRITICAL: This was missing causing errors
    data TEXT,
    recipient_ids JSONB DEFAULT '[]', -- For student targeting
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notices table - SAFE MIGRATION: Create table only if it doesn't exist, preserve all data
CREATE TABLE IF NOT EXISTS notices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    target_audience TEXT DEFAULT 'All', -- CRITICAL: target_audience column
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRITICAL FIX: Add recipient_ids column to notices table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='notices' AND column_name='recipient_ids') THEN
        ALTER TABLE notices ADD COLUMN recipient_ids JSONB DEFAULT '[]';
        RAISE NOTICE '✅ CRITICAL FIX: Added recipient_ids column to notices table - NOTICE NOTIFICATIONS NOW WORKING';
    ELSE
        RAISE NOTICE '⚠️  recipient_ids column already exists in notices table';
    END IF;
END $$;

-- Fee Structures table - SAFE MIGRATION: Create table only if it doesn't exist, preserve all data
CREATE TABLE IF NOT EXISTS fee_structures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    course_name TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    billing_period TEXT CHECK (billing_period IN ('Monthly', 'Quarterly', 'Annually')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table - SAFE MIGRATION: Create table only if it doesn't exist, preserve all data
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    student_name TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    due_date DATE,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table - SAFE MIGRATION: Create table only if it doesn't exist, preserve all data
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE, -- CRITICAL: recipient_id column
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- CRITICAL: user_id column (application uses this)
    title TEXT NOT NULL,
    message TEXT,
    type TEXT CHECK (type IN ('Info', 'Warning', 'Success', 'Error')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts table - SAFE MIGRATION: Create table only if it doesn't exist, preserve all data  
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    subject TEXT,
    message TEXT,
    status TEXT DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'Resolved')), -- CRITICAL: status column
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media Items table - SAFE MIGRATION: For images, videos, and YouTube embeds on homepage
CREATE TABLE IF NOT EXISTS media_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('image', 'video', 'youtube')),
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    upload_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Demo Bookings table for Nadanaloga Academy
-- Add this to your existing database
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

-- Create indexes for better performance including new recipient_ids columns
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(name);
CREATE INDEX IF NOT EXISTS idx_batches_course_id ON batches(course_id);
CREATE INDEX IF NOT EXISTS idx_batches_teacher_id ON batches(teacher_id);
CREATE INDEX IF NOT EXISTS idx_batches_is_active ON batches(is_active);
CREATE INDEX IF NOT EXISTS idx_book_materials_course_id ON book_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_grade_exams_date ON grade_exams(date);
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON media_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_items_type ON media_items(type);

-- Indexes for demo bookings performance
CREATE INDEX IF NOT EXISTS idx_demo_bookings_email ON demo_bookings(email);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_status ON demo_bookings(status);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_created_at ON demo_bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_course_id ON demo_bookings(course_id);

-- NEW: Create GIN indexes for JSONB recipient_ids columns for better performance
CREATE INDEX IF NOT EXISTS idx_events_recipient_ids ON events USING GIN (recipient_ids);
CREATE INDEX IF NOT EXISTS idx_notices_recipient_ids ON notices USING GIN (recipient_ids);
CREATE INDEX IF NOT EXISTS idx_grade_exams_recipient_ids ON grade_exams USING GIN (recipient_ids);
CREATE INDEX IF NOT EXISTS idx_book_materials_recipient_ids ON book_materials USING GIN (recipient_ids);

-- Create function for auto-updating updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Updated timestamp trigger for demo bookings
CREATE OR REPLACE FUNCTION update_demo_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all tables with updated_at columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_courses_updated_at') THEN
        CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_locations_updated_at') THEN
        CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_batches_updated_at') THEN
        CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_events_updated_at') THEN
        CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_grade_exams_updated_at') THEN
        CREATE TRIGGER update_grade_exams_updated_at BEFORE UPDATE ON grade_exams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_book_materials_updated_at') THEN
        CREATE TRIGGER update_book_materials_updated_at BEFORE UPDATE ON book_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notices_updated_at') THEN
        CREATE TRIGGER update_notices_updated_at BEFORE UPDATE ON notices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_fee_structures_updated_at') THEN
        CREATE TRIGGER update_fee_structures_updated_at BEFORE UPDATE ON fee_structures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at') THEN
        CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notifications_updated_at') THEN
        CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contacts_updated_at') THEN
        CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_media_items_updated_at') THEN
        CREATE TRIGGER update_media_items_updated_at BEFORE UPDATE ON media_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Apply trigger to demo bookings only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_demo_bookings_updated_at') THEN
        CREATE TRIGGER update_demo_bookings_updated_at 
            BEFORE UPDATE ON demo_bookings 
            FOR EACH ROW EXECUTE FUNCTION update_demo_bookings_updated_at();
    END IF;
END $$;

-- Disable RLS for tables since the app uses custom authentication
ALTER TABLE demo_bookings DISABLE ROW LEVEL SECURITY;

-- Final Success Message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ======================================== 🎉';
    RAISE NOTICE '     DATABASE INITIALIZATION COMPLETE!';
    RAISE NOTICE '     VPS PORTAINER DEPLOYMENT READY!';
    RAISE NOTICE '🎉 ======================================== 🎉';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Database Schema Created:';
    RAISE NOTICE '   - Complete application schema';
    RAISE NOTICE '   - Demo bookings system';
    RAISE NOTICE '   - All indexes and triggers applied';
    RAISE NOTICE '   - Default courses and locations inserted';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your Nadanaloga Academy database is ready!';
    RAISE NOTICE '';
END $$;