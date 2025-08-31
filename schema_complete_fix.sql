 -- Complete Database Schema Fix for Nadanaloga
  -- Run this in your Supabase SQL Editor

  CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      role TEXT NOT NULL CHECK (role IN ('Student', 'Teacher', 'Admin')),
      class_preference TEXT CHECK (class_preference IN ('Online', 'Offline',
   'Hybrid')),
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
      status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive',
  'On Hold', 'Graduated')),
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
      employment_type TEXT CHECK (employment_type IN ('Part-time',
  'Full-time')),
      years_of_experience INTEGER,
      available_time_slots JSONB DEFAULT '[]',
      date_of_joining DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMP WITH TIME ZONE
  );

  DO $$
  BEGIN
      BEGIN
          ALTER TABLE users ADD COLUMN preferred_timings JSONB DEFAULT '[]';
      EXCEPTION
          WHEN duplicate_column THEN NULL;
      END;

      BEGIN
          ALTER TABLE users ADD COLUMN country TEXT;
      EXCEPTION
          WHEN duplicate_column THEN NULL;
      END;

      BEGIN
          ALTER TABLE users ADD COLUMN state TEXT;
      EXCEPTION
          WHEN duplicate_column THEN NULL;
      END;

      BEGIN
          ALTER TABLE users ADD COLUMN city TEXT;
      EXCEPTION
          WHEN duplicate_column THEN NULL;
      END;

      BEGIN
          ALTER TABLE users ADD COLUMN postal_code TEXT;
      EXCEPTION
          WHEN duplicate_column THEN NULL;
      END;

      BEGIN
          ALTER TABLE users ADD COLUMN father_name TEXT;
      EXCEPTION
          WHEN duplicate_column THEN NULL;
      END;

      BEGIN
          ALTER TABLE users ADD COLUMN standard TEXT;
      EXCEPTION
          WHEN duplicate_column THEN NULL;
      END;

      BEGIN
          ALTER TABLE users ADD COLUMN school_name TEXT;
      EXCEPTION
          WHEN duplicate_column THEN NULL;
      END;

      BEGIN
          ALTER TABLE users ADD COLUMN grade TEXT;
      EXCEPTION
          WHEN duplicate_column THEN NULL;
      END;

      BEGIN
          ALTER TABLE users ADD COLUMN date_of_joining DATE DEFAULT
  CURRENT_DATE;
      EXCEPTION
          WHEN duplicate_column THEN NULL;
      END;

      BEGIN
          ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
      EXCEPTION
          WHEN duplicate_column THEN NULL;
      END;

      BEGIN
          ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
      EXCEPTION
          WHEN duplicate_column THEN NULL;
      END;

  END $$;

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

  INSERT INTO locations (name, address, is_active)
  SELECT 'Main Center', 'Enter your main location address', true
  WHERE NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Main Center');

  INSERT INTO locations (name, address, is_active)
  SELECT 'Branch 1', 'Enter branch location address', true
  WHERE NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Branch 1');

-- Batches table
CREATE TABLE IF NOT EXISTS batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    schedule JSONB DEFAULT '[]', -- Array of {timing: string, studentIds: string[]} objects
    capacity INTEGER DEFAULT 0, -- Maximum number of students
    enrolled INTEGER DEFAULT 0, -- Current number of enrolled students
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
    time TEXT, -- Time string like "12:00 PM"
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
    data TEXT, -- For base64 PDF data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to book_materials if table exists but columns are missing
DO $$
BEGIN
    BEGIN
        ALTER TABLE book_materials ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE book_materials ADD COLUMN course_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE book_materials ADD COLUMN type TEXT CHECK (type IN ('PDF', 'Video', 'YouTube'));
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE book_materials ADD COLUMN data TEXT;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);
CREATE INDEX IF NOT EXISTS idx_batches_course_id ON batches(course_id);
CREATE INDEX IF NOT EXISTS idx_batches_teacher_id ON batches(teacher_id);
CREATE INDEX IF NOT EXISTS idx_batches_is_active ON batches(is_active);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_grade_exams_date ON grade_exams(date);
CREATE INDEX IF NOT EXISTS idx_book_materials_course_id ON book_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_fee_structures_course_id ON fee_structures(course_id);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
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
END $$;

