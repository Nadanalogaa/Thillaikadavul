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

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
