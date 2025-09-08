# 🚀 Vercel Deployment Guide

Your Nadanaloga application is now ready for Vercel! Follow these simple steps:

## Step 1: Set Up Supabase Database (Free)

1. **Go to https://supabase.com**
2. **Sign up with GitHub**
3. **Create New Project:**
   - Project Name: `nadanaloga`
   - Database Password: Create a strong password
   - Region: Choose closest to your users
4. **Wait for setup to complete** (2-3 minutes)

5. **Get your credentials:**
   - Go to Settings → API
   - Copy `Project URL` (SUPABASE_URL)
   - Copy `anon public` key (SUPABASE_ANON_KEY)

6. **Set up database tables:**
   - Go to SQL Editor in Supabase
   - Run this SQL to create your tables:

```sql
-- Create users table
CREATE TABLE users (
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

-- Create other tables
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE batches (
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
('Abacus', 'Enhance mental math skills and concentration with our abacus program.', 'Abacus');

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_batches_course_id ON batches(course_id);
```

## Step 2: Deploy to Vercel

1. **Go to https://vercel.com**
2. **Sign up with GitHub**
3. **Click "Import Project"**
4. **Select your GitHub repository: `Nadanalogaa/Thillaikadavul`**
5. **Configure project:**
   - Framework Preset: `Vite`
   - Root Directory: `./` (leave as default)
   - Build Command: `npm run build`
   - Output Directory: `dist`

## Step 3: Set Environment Variables

In Vercel dashboard:
1. **Go to Settings → Environment Variables**
2. **Add these variables:**

```
SUPABASE_URL = your-supabase-project-url
SUPABASE_ANON_KEY = your-supabase-anon-key
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = your-gmail@gmail.com
SMTP_PASS = your-gmail-app-password
SMTP_FROM_EMAIL = "Nadanaloga <your-gmail@gmail.com>"
JWT_SECRET = your-super-secret-jwt-key-here
NODE_ENV = production
VITE_SUPABASE_URL = your-supabase-project-url
VITE_SUPABASE_ANON_KEY = your-supabase-anon-key
VITE_SERVER_URL = https://your-server-domain-or-render-url/api
```

Optional (only if you want Vercel to proxy email calls to your server):

```
EMAIL_SERVER_URL = https://your-server-domain-or-render-url/api
```

**To get Gmail App Password:**
1. Go to Google Account settings
2. Security → 2-Step Verification
3. App passwords → Generate password
4. Use that password (not your regular Gmail password)

## Step 4: Deploy!

1. **Click "Deploy"**
2. **Wait 2-3 minutes**
3. **Your site will be live!** 🎉

## Step 5: Test Your Application

1. **Visit your Vercel URL**
2. **Test registration with a new account**
3. **Login as admin:** `admin@nadanaloga.com` (register this email to get admin access)
4. **Test all features:**
   - Student registration
   - Admin panel
   - Course management
   - Notifications

## Benefits of This Setup:

✅ **Global CDN** - Lightning fast worldwide
✅ **Auto-scaling** - Handles millions of users
✅ **99.99% uptime** - Enterprise-grade reliability  
✅ **Free tier** - Perfect for getting started
✅ **Automatic HTTPS** - Secure by default
✅ **Git integration** - Deploy on every push
✅ **Serverless** - No server management needed

## Automatic Updates

Every time you push to GitHub:
1. Vercel automatically builds and deploys
2. Zero downtime deployments
3. Instant rollback if needed

## Cost Structure

- **Vercel**: Free for personal projects, $20/month for teams
- **Supabase**: 500MB database free, $25/month for more
- **Total**: $0-45/month (vs $60+/month traditional hosting)

Your educational platform is now enterprise-ready! 🚀

## Next Steps

1. **Custom Domain**: Add your own domain in Vercel settings
2. **Monitoring**: Use Vercel Analytics to track performance  
3. **Scaling**: Add more Vercel Functions as you grow

Need help? The deployment should work seamlessly with these steps!
