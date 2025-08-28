import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database schema setup (run once)
export async function setupDatabase() {
  // Create users table
  const { error: usersError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('Student', 'Teacher', 'Admin')),
        class_preference VARCHAR(20) CHECK (class_preference IN ('Online', 'Offline', 'Hybrid')),
        photo_url TEXT,
        dob VARCHAR(20),
        sex VARCHAR(10) CHECK (sex IN ('Male', 'Female', 'Other')),
        contact_number VARCHAR(20),
        address TEXT,
        schedules JSONB DEFAULT '[]',
        documents JSONB DEFAULT '[]',
        date_of_joining VARCHAR(20),
        courses JSONB DEFAULT '[]',
        father_name VARCHAR(255),
        standard VARCHAR(50),
        school_name VARCHAR(255),
        grade VARCHAR(20) CHECK (grade IN ('Grade 1', 'Grade 2', 'Grade 3')),
        notes TEXT,
        course_expertise JSONB DEFAULT '[]',
        educational_qualifications TEXT,
        employment_type VARCHAR(20) CHECK (employment_type IN ('Part-time', 'Full-time')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS courses (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS batches (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
        course_name VARCHAR(255) NOT NULL,
        teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
        schedule JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Insert default courses
      INSERT INTO courses (name, description, icon) VALUES
      ('Bharatanatyam', 'Explore the grace and storytelling of classical Indian dance.', 'Bharatanatyam'),
      ('Vocal', 'Develop your singing voice with professional training techniques.', 'Vocal'),
      ('Drawing', 'Learn to express your creativity through sketching and painting.', 'Drawing'),
      ('Abacus', 'Enhance mental math skills and concentration with our abacus program.', 'Abacus')
      ON CONFLICT (name) DO NOTHING;

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_batches_course_id ON batches(course_id);
    `
  });

  if (usersError) {
    console.error('Database setup error:', usersError);
    return false;
  }

  return true;
}