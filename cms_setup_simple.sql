-- Simple CMS Setup Script
-- Run this in your Supabase SQL Editor
-- This version avoids complex syntax and focuses on creating the CMS

-- Create content_status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
        CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'archived', 'rejected');
    END IF;
END $$;

-- Create homepage_sections table
CREATE TABLE IF NOT EXISTS homepage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_key VARCHAR(100) NOT NULL UNIQUE,
    section_type section_type NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    layout_config JSONB DEFAULT '{}',
    responsive_settings JSONB DEFAULT '{}',
    animation_config JSONB DEFAULT '{}',
    custom_css TEXT,
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create section_content_blocks table
CREATE TABLE IF NOT EXISTS section_content_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_current_version BOOLEAN DEFAULT true,
    title TEXT,
    subtitle TEXT,
    description TEXT,
    body_content TEXT,
    rich_content JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    status content_status DEFAULT 'draft',
    ai_generated_content JSONB DEFAULT '{}',
    ai_suggestions JSONB DEFAULT '{}',
    ai_seo_score INTEGER CHECK (ai_seo_score >= 0 AND ai_seo_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    updated_by UUID
);

-- Add foreign key constraint
ALTER TABLE section_content_blocks 
ADD CONSTRAINT IF NOT EXISTS section_content_blocks_section_id_fkey 
FOREIGN KEY (section_id) REFERENCES homepage_sections(id) ON DELETE CASCADE;

-- Insert default sections (using proper enum values)
INSERT INTO homepage_sections (section_key, section_type, name, description, order_index) 
VALUES 
    ('hero-main', 'hero', 'Main Hero Section', 'Primary hero section with title and CTA', 1),
    ('about-academy', 'about', 'About Academy Section', 'Information about the fine arts academy', 2),
    ('programs-overview', 'text_content', 'Programs Overview', 'Overview of courses and programs offered', 3),
    ('testimonials-student', 'testimonials', 'Student Testimonials', 'Reviews and feedback from students', 4),
    ('contact-info', 'contact', 'Contact Information', 'Contact details and location info', 5),
    ('featured-programs', 'featured_projects', 'Featured Programs', 'Highlight of main programs', 6),
    ('statistics-academy', 'statistics', 'Academy Statistics', 'Numbers and achievements', 7)
ON CONFLICT (section_key) DO NOTHING;

-- Insert content for hero section
INSERT INTO section_content_blocks (section_id, title, description, body_content, status, version, is_current_version, rich_content)
SELECT id, 'Dance, Draw and Fine Arts', 'Main hero section', 'Nurturing creativity through traditional and contemporary artistic expression at Nadanaloga Fine Arts Academy.', 'published', 1, true, '{"image_url": "/images/hero-bg.jpg"}'::jsonb
FROM homepage_sections WHERE section_key = 'hero-main'
ON CONFLICT DO NOTHING;

-- Insert content for about section
INSERT INTO section_content_blocks (section_id, title, description, body_content, status, version, is_current_version, rich_content)
SELECT id, 'About Our Academy', 'Academy information', 'We are a premier fine arts academy dedicated to offering comprehensive training in Bharatanatyam classical dance, Carnatic vocal music, drawing & painting, and Abacus mathematics. Our experienced instructors guide students of all ages through their artistic journey.', 'published', 1, true, '{"image_url": "/images/about-academy.jpg"}'::jsonb
FROM homepage_sections WHERE section_key = 'about-academy'
ON CONFLICT DO NOTHING;

-- Insert content for programs section
INSERT INTO section_content_blocks (section_id, title, description, body_content, status, version, is_current_version)
SELECT id, 'Our Programs', 'Programs overview', 'Explore our diverse range of programs designed to cultivate artistic excellence: Classical Dance, Vocal Music, Visual Arts, and Mathematical Skills Development. Each program is carefully structured to build foundational skills while encouraging creative expression.', 'published', 1, true
FROM homepage_sections WHERE section_key = 'programs-overview'
ON CONFLICT DO NOTHING;

-- Insert content for testimonials section
INSERT INTO section_content_blocks (section_id, title, description, body_content, status, version, is_current_version)
SELECT id, 'What Our Students Say', 'Student testimonials', 'Hear from our community of satisfied students and parents about their transformative experiences at Nadanaloga Fine Arts Academy.', 'published', 1, true
FROM homepage_sections WHERE section_key = 'testimonials-student'
ON CONFLICT DO NOTHING;

-- Insert content for contact section
INSERT INTO section_content_blocks (section_id, title, description, body_content, status, version, is_current_version)
SELECT id, 'Get In Touch', 'Contact information', 'Connect with us to begin your artistic journey. We offer both online and offline classes with flexible scheduling to accommodate your needs.', 'published', 1, true
FROM homepage_sections WHERE section_key = 'contact-info'
ON CONFLICT DO NOTHING;

-- Insert content for featured programs section
INSERT INTO section_content_blocks (section_id, title, description, body_content, status, version, is_current_version, rich_content)
SELECT id, 'Featured Programs', 'Highlighted programs', 'Discover our signature programs that combine traditional techniques with modern teaching methodologies.', 'published', 1, true, '{"image_url": "/images/featured-programs.jpg"}'::jsonb
FROM homepage_sections WHERE section_key = 'featured-programs'
ON CONFLICT DO NOTHING;

-- Insert content for statistics section
INSERT INTO section_content_blocks (section_id, title, description, body_content, status, version, is_current_version)
SELECT id, 'Our Impact', 'Academy statistics', 'Over 500+ happy students, 98% satisfaction rate, and 10+ years of excellence in fine arts education.', 'published', 1, true
FROM homepage_sections WHERE section_key = 'statistics-academy'
ON CONFLICT DO NOTHING;

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
DROP TRIGGER IF EXISTS update_homepage_sections_updated_at ON homepage_sections;
CREATE TRIGGER update_homepage_sections_updated_at 
    BEFORE UPDATE ON homepage_sections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_section_content_blocks_updated_at ON section_content_blocks;
CREATE TRIGGER update_section_content_blocks_updated_at 
    BEFORE UPDATE ON section_content_blocks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Show results
SELECT 'CMS Setup Complete!' as status;
SELECT COUNT(*) as sections_created FROM homepage_sections;
SELECT COUNT(*) as content_blocks_created FROM section_content_blocks;
SELECT 'Ready to use at: https://thillaikadavul.vercel.app/admin/cms' as next_step;