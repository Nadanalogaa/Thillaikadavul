-- Step 2: CMS Setup Script  
-- Run this AFTER checking step 1 results
-- This safely creates missing CMS components

-- Create content_status enum with correct values if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
        CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'archived', 'rejected');
        RAISE NOTICE 'Created content_status enum';
    ELSE
        RAISE NOTICE 'content_status enum already exists';
    END IF;
END $$;

-- Create homepage_sections table only if it doesn't exist
CREATE TABLE IF NOT EXISTS homepage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_key VARCHAR(100) NOT NULL UNIQUE,
    section_type section_type NOT NULL, -- Uses existing enum
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

-- Create section_content_blocks table only if it doesn't exist
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

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'section_content_blocks_section_id_fkey'
    ) THEN
        ALTER TABLE section_content_blocks 
        ADD CONSTRAINT section_content_blocks_section_id_fkey 
        FOREIGN KEY (section_id) REFERENCES homepage_sections(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Insert default sections only if they don't exist (using correct enum values)
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

-- Create initial content blocks for sections that don't have any
DO $$
DECLARE
    section_record RECORD;
BEGIN
    FOR section_record IN 
        SELECT id, section_key, section_type, name FROM homepage_sections 
        WHERE NOT EXISTS (
            SELECT 1 FROM section_content_blocks WHERE section_id = homepage_sections.id
        )
    LOOP
        INSERT INTO section_content_blocks (
            section_id, 
            title, 
            description, 
            body_content, 
            status,
            version,
            is_current_version,
            rich_content
        ) VALUES (
            section_record.id,
            section_record.name,
            'Default content for ' || section_record.name,
            CASE 
                WHEN section_record.section_key = 'hero-main' THEN 'Dance, Draw and Fine Arts - Nurturing creativity through traditional and contemporary artistic expression at Nadanaloga Fine Arts Academy.'
                WHEN section_record.section_key = 'about-academy' THEN 'We are a premier fine arts academy dedicated to offering comprehensive training in Bharatanatyam classical dance, Carnatic vocal music, drawing & painting, and Abacus mathematics. Our experienced instructors guide students of all ages through their artistic journey.'
                WHEN section_record.section_key = 'programs-overview' THEN 'Explore our diverse range of programs designed to cultivate artistic excellence: Classical Dance, Vocal Music, Visual Arts, and Mathematical Skills Development. Each program is carefully structured to build foundational skills while encouraging creative expression.'
                WHEN section_record.section_key = 'testimonials-student' THEN 'Hear from our community of satisfied students and parents about their transformative experiences at Nadanaloga Fine Arts Academy.'
                WHEN section_record.section_key = 'contact-info' THEN 'Connect with us to begin your artistic journey. We offer both online and offline classes with flexible scheduling to accommodate your needs.'
                WHEN section_record.section_key = 'featured-programs' THEN 'Discover our signature programs that combine traditional techniques with modern teaching methodologies.'
                WHEN section_record.section_key = 'statistics-academy' THEN 'Over 500+ happy students, 98% satisfaction rate, and 10+ years of excellence in fine arts education.'
                ELSE 'Quality content for ' || section_record.name
            END,
            'published',
            1,
            true,
            CASE 
                WHEN section_record.section_type IN ('hero', 'about', 'featured_projects') THEN '{"image_url": "/images/default-section.jpg"}'::jsonb
                ELSE '{}'::jsonb
            END
        );
        RAISE NOTICE 'Created content for section: %', section_record.name;
    END LOOP;
END $$;

-- Create update timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
DROP TRIGGER IF EXISTS update_homepage_sections_updated_at ON homepage_sections;
CREATE TRIGGER update_homepage_sections_updated_at 
    BEFORE UPDATE ON homepage_sections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_section_content_blocks_updated_at ON section_content_blocks;
CREATE TRIGGER update_section_content_blocks_updated_at 
    BEFORE UPDATE ON section_content_blocks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Final success report
DO $$
DECLARE
    sections_count INTEGER;
    content_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO sections_count FROM homepage_sections;
    SELECT COUNT(*) INTO content_count FROM section_content_blocks;
    
    RAISE NOTICE '🎉 CMS Setup Complete!';
    RAISE NOTICE 'Homepage sections: %', sections_count;
    RAISE NOTICE 'Content blocks: %', content_count;
    RAISE NOTICE 'CMS ready at: https://thillaikadavul.vercel.app/admin/cms';
    RAISE NOTICE '';
    RAISE NOTICE 'Available sections:';
    
    -- List all sections
    FOR section_record IN 
        SELECT section_key, name, section_type FROM homepage_sections ORDER BY order_index
    LOOP
        RAISE NOTICE '  - % (%) - %', section_record.section_key, section_record.section_type, section_record.name;
    END LOOP;
END $$;