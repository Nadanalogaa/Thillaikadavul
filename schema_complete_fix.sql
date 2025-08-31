-- Complete Database Schema Fix for Nadanaloga
-- This script ensures all required fields exist and have proper constraints
-- Run this in your Supabase SQL Editor

-- First, let's create the users table with all required fields
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

-- Now add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add preferred_timings if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN preferred_timings JSONB DEFAULT '[]';
        RAISE NOTICE 'Added preferred_timings column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'preferred_timings column already exists';
    END;
    
    -- Add country if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN country TEXT;
        RAISE NOTICE 'Added country column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'country column already exists';
    END;
    
    -- Add state if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN state TEXT;
        RAISE NOTICE 'Added state column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'state column already exists';
    END;
    
    -- Add city if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN city TEXT;
        RAISE NOTICE 'Added city column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'city column already exists';
    END;
    
    -- Add postal_code if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN postal_code TEXT;
        RAISE NOTICE 'Added postal_code column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'postal_code column already exists';
    END;
    
    -- Add father_name if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN father_name TEXT;
        RAISE NOTICE 'Added father_name column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'father_name column already exists';
    END;
    
    -- Add standard if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN standard TEXT;
        RAISE NOTICE 'Added standard column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'standard column already exists';
    END;
    
    -- Add school_name if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN school_name TEXT;
        RAISE NOTICE 'Added school_name column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'school_name column already exists';
    END;
    
    -- Add grade if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN grade TEXT;
        RAISE NOTICE 'Added grade column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'grade column already exists';
    END;
    
    -- Add date_of_joining if it doesn't exist
    BEGIN
        ALTER TABLE users ADD COLUMN date_of_joining DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE 'Added date_of_joining column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'date_of_joining column already exists';
    END;

    -- Fix any VARCHAR constraints that might cause 400 errors
    BEGIN
        ALTER TABLE users ALTER COLUMN name TYPE TEXT;
        RAISE NOTICE 'Fixed name column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix name column: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE users ALTER COLUMN email TYPE TEXT;
        RAISE NOTICE 'Fixed email column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix email column: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE users ALTER COLUMN contact_number TYPE TEXT;
        RAISE NOTICE 'Fixed contact_number column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix contact_number column: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE users ALTER COLUMN father_name TYPE TEXT;
        RAISE NOTICE 'Fixed father_name column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix father_name column: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE users ALTER COLUMN standard TYPE TEXT;
        RAISE NOTICE 'Fixed standard column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix standard column: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE users ALTER COLUMN school_name TYPE TEXT;
        RAISE NOTICE 'Fixed school_name column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix school_name column: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE users ALTER COLUMN role TYPE TEXT;
        RAISE NOTICE 'Fixed role column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix role column: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE users ALTER COLUMN class_preference TYPE TEXT;
        RAISE NOTICE 'Fixed class_preference column to TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not fix class_preference column: %', SQLERRM;
    END;

END $$;

-- Create other required tables if they don't exist
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);