-- Safe CMS Schema Fix - Only creates missing components
-- Run this in your Supabase SQL Editor

-- Check and create content_status enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
        CREATE TYPE content_status AS ENUM ('draft', 'pending', 'published');
    END IF;
END $$;

-- Create homepage_sections table only if it doesn't exist
CREATE TABLE IF NOT EXISTS homepage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_key VARCHAR(100) NOT NULL UNIQUE,
    section_type TEXT NOT NULL DEFAULT 'text_content',
    name VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    layout_config JSONB DEFAULT '{}',
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
    END IF;
END $$;

-- Insert default sections only if they don't exist
INSERT INTO homepage_sections (section_key, name, description, order_index) 
VALUES 
    ('hero', 'Hero Section', 'Main hero section of the homepage', 1),
    ('about', 'About Section', 'Academy description section', 2),
    ('programs', 'Programs Section', 'Our programs and courses', 3),
    ('testimonials', 'Testimonials Section', 'Student and parent testimonials', 4),
    ('contact', 'Contact Section', 'Contact information and form', 5)
ON CONFLICT (section_key) DO NOTHING;

-- Create initial content blocks for sections that don't have any
DO $$
DECLARE
    section_record RECORD;
BEGIN
    FOR section_record IN 
        SELECT id, section_key, name FROM homepage_sections 
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
            is_current_version
        ) VALUES (
            section_record.id,
            section_record.name,
            'Default content for ' || section_record.name,
            CASE 
                WHEN section_record.section_key = 'hero' THEN 'Dance, Draw and Fine Arts - Creative expression through traditional and modern arts'
                WHEN section_record.section_key = 'about' THEN 'We are a fine arts academy offering Bharatanatyam, Vocal music, Drawing, and Abacus training led by experienced instructors.'
                WHEN section_record.section_key = 'programs' THEN 'Explore our comprehensive programs in classical dance, music, visual arts, and mathematical skills development.'
                WHEN section_record.section_key = 'testimonials' THEN 'Hear from our satisfied students and parents about their journey with us.'
                WHEN section_record.section_key = 'contact' THEN 'Get in touch with us to start your artistic journey today.'
                ELSE 'Content for ' || section_record.name
            END,
            'published',
            1,
            true
        );
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

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ CMS Schema Setup Complete!';
    RAISE NOTICE 'Created sections: %', (SELECT COUNT(*) FROM homepage_sections);
    RAISE NOTICE 'Created content blocks: %', (SELECT COUNT(*) FROM section_content_blocks);
    RAISE NOTICE 'CMS is ready to use at /admin/cms';
END $$;