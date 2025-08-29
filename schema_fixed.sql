-- Thillaikadavul Database Schema
-- Run this script in your Supabase SQL editor to ensure all tables have the correct structure

-- First, let's add missing columns to existing tables if they exist
-- Add capacity and enrolled columns to batches table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'batches') THEN
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
    END IF;
END $$;

-- Now create tables that don't exist
-- Users table
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
    
    -- Student specific fields
    courses JSONB DEFAULT '[]',
    father_name TEXT,
    standard TEXT,
    school_name TEXT,
    grade TEXT,
    notes TEXT,
    schedules JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    
    -- Teacher specific fields
    course_expertise JSONB DEFAULT '[]',
    educational_qualifications TEXT,
    employment_type TEXT CHECK (employment_type IN ('Part-time', 'Full-time')),
    years_of_experience INTEGER,
    available_time_slots JSONB DEFAULT '[]',
    
    -- Timestamps
    date_of_joining DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Soft delete fields
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batches table
CREATE TABLE IF NOT EXISTS batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    schedule JSONB DEFAULT '[]',
    capacity INTEGER DEFAULT 0,
    enrolled INTEGER DEFAULT 0,
    mode TEXT CHECK (mode IN ('Online', 'Offline')),
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TEXT,
    location TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grade Exams table
CREATE TABLE IF NOT EXISTS grade_exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TEXT,
    duration TEXT,
    course TEXT,
    grade TEXT,
    syllabus_url TEXT,
    registration_fee DECIMAL(10,2),
    registration_deadline DATE,
    is_open BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Book Materials table
CREATE TABLE IF NOT EXISTS book_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    course_name TEXT,
    type TEXT CHECK (type IN ('PDF', 'Video', 'YouTube')),
    url TEXT,
    data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notices table
CREATE TABLE IF NOT EXISTS notices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fee Structures table
CREATE TABLE IF NOT EXISTS fee_structures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    course_name TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    billing_cycle TEXT CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Annually')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE,
    course_name TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    billing_period TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue')),
    payment_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact form submissions table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (only if tables exist)
DO $$ 
BEGIN
    -- Create indexes only if the tables exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_deleted') THEN
            CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'batches') THEN
        CREATE INDEX IF NOT EXISTS idx_batches_course_id ON batches(course_id);
        CREATE INDEX IF NOT EXISTS idx_batches_teacher_id ON batches(teacher_id);
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'is_active') THEN
            CREATE INDEX IF NOT EXISTS idx_batches_is_active ON batches(is_active);
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'events') THEN
        CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'grade_exams') THEN
        CREATE INDEX IF NOT EXISTS idx_grade_exams_date ON grade_exams(date);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoices') THEN
        CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id);
        CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    END IF;
END $$;

-- Insert basic courses if they don't exist
INSERT INTO courses (name, description, icon) 
VALUES 
    ('Bharatanatyam', 'Classical Indian dance form', 'Bharatanatyam'),
    ('Vocal', 'Carnatic vocal music', 'Vocal'),
    ('Drawing', 'Art and drawing classes', 'Drawing'),
    ('Abacus', 'Mental arithmetic training', 'Abacus')
ON CONFLICT (name) DO NOTHING;

-- Insert basic locations if they don't exist
INSERT INTO locations (name, address, is_active) 
VALUES 
    ('Main Center', 'Enter your main location address', true),
    ('Branch 1', 'Enter branch location address', true)
ON CONFLICT DO NOTHING;