-- =====================================================
-- ADVANCED HOMEPAGE CMS DATABASE SCHEMA
-- Complete content management system for 25+ sections
-- =====================================================

-- Section Types Enum
CREATE TYPE section_type AS ENUM (
  'cta_overlay', 'hero', 'parallax_divider', 'about', 'statistics', 
  'marquee_text', 'featured_projects', 'services_stack', 'approach_philosophy',
  'carousel_images_dual', 'awards_publications', 'testimonials_slider', 
  'marquee_secondary', 'partners_grid', 'blog_preview', 'final_cta',
  'custom'
);

-- Content Status for Approval Workflow
CREATE TYPE content_status AS ENUM (
  'draft', 'pending_review', 'approved', 'published', 'archived', 'rejected'
);

-- Media Types
CREATE TYPE media_type AS ENUM (
  'image', 'video', 'youtube', 'audio', 'document', 'svg'
);

-- Animation Direction Types
CREATE TYPE animation_direction AS ENUM (
  'left_to_right', 'right_to_left', 'top_to_bottom', 'bottom_to_top', 'fade_in', 'zoom_in'
);

-- =====================================================
-- CORE CONTENT MANAGEMENT TABLES
-- =====================================================

-- Homepage Sections Master Table
CREATE TABLE homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key VARCHAR(100) NOT NULL UNIQUE, -- hero, about, statistics, etc.
  section_type section_type NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Layout Configuration
  layout_config JSONB DEFAULT '{}',
  responsive_settings JSONB DEFAULT '{}',
  animation_config JSONB DEFAULT '{}',
  custom_css TEXT,
  
  -- SEO & Meta
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Create unique constraint on order_index
  CONSTRAINT unique_section_order UNIQUE(order_index)
);

-- Section Content Blocks (versioned content)
CREATE TABLE section_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES homepage_sections(id) ON DELETE CASCADE,
  
  -- Version Control
  version INTEGER NOT NULL DEFAULT 1,
  is_current_version BOOLEAN DEFAULT true,
  
  -- Content Fields
  title TEXT,
  subtitle TEXT,
  description TEXT,
  body_content TEXT,
  rich_content JSONB, -- For complex structured content
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[],
  
  -- Workflow Status
  status content_status DEFAULT 'draft',
  
  -- AI-Generated Content
  ai_generated_content JSONB DEFAULT '{}',
  ai_suggestions JSONB DEFAULT '{}',
  ai_seo_score INTEGER CHECK (ai_seo_score >= 0 AND ai_seo_score <= 100),
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID, -- References users table
  updated_by UUID,
  
  -- Constraints
  CONSTRAINT unique_current_version UNIQUE(section_id, is_current_version) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Enhanced Media Library
CREATE TABLE media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Properties
  filename VARCHAR(500) NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  media_type media_type NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  
  -- Image/Video Properties
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- For videos in seconds
  
  -- AI-Enhanced Properties
  alt_text TEXT,
  ai_generated_alt TEXT,
  ai_description TEXT,
  detected_objects TEXT[],
  dominant_colors VARCHAR(7)[], -- Hex colors
  mood_tags TEXT[],
  ai_quality_score INTEGER CHECK (ai_quality_score >= 0 AND ai_quality_score <= 100),
  
  -- SEO Properties
  seo_title VARCHAR(255),
  seo_description TEXT,
  caption TEXT,
  credit TEXT,
  
  -- Processing Status
  is_processed BOOLEAN DEFAULT false,
  processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  processing_error TEXT,
  
  -- Variants (for responsive images)
  variants JSONB DEFAULT '{}', -- {small: url, medium: url, large: url, webp: url}
  
  -- Upload Info
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_media_type (media_type),
  INDEX idx_media_created_at (created_at),
  INDEX idx_media_uploader (uploaded_by)
);

-- Section Media Associations (Many-to-Many)
CREATE TABLE section_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_content_id UUID NOT NULL REFERENCES section_content_blocks(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_library(id) ON DELETE CASCADE,
  
  -- Association Properties
  media_role VARCHAR(100) NOT NULL, -- 'hero_image', 'gallery_image', 'background', 'thumbnail'
  order_index INTEGER DEFAULT 0,
  display_config JSONB DEFAULT '{}',
  
  -- Carousel-specific properties
  animation_direction animation_direction,
  animation_speed INTEGER DEFAULT 1, -- 1-10 speed scale
  
  -- Responsive Settings
  responsive_config JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(section_content_id, media_id, media_role)
);

-- Call-to-Action Management
CREATE TABLE section_ctas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_content_id UUID NOT NULL REFERENCES section_content_blocks(id) ON DELETE CASCADE,
  
  -- CTA Properties
  label VARCHAR(200) NOT NULL,
  url VARCHAR(1000),
  action_type VARCHAR(50) DEFAULT 'link', -- 'link', 'modal', 'scroll', 'download'
  target VARCHAR(20) DEFAULT '_self', -- '_self', '_blank'
  
  -- Styling
  button_style VARCHAR(100) DEFAULT 'primary', -- 'primary', 'secondary', 'outline', 'ghost'
  custom_css TEXT,
  icon VARCHAR(100), -- Icon class or name
  
  -- Positioning
  order_index INTEGER DEFAULT 0,
  position VARCHAR(50) DEFAULT 'default', -- 'default', 'floating', 'fixed'
  
  -- Analytics
  click_tracking BOOLEAN DEFAULT true,
  conversion_goal VARCHAR(100),
  
  -- A/B Testing
  variant_id UUID,
  variant_weight INTEGER DEFAULT 100,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SPECIALIZED SECTION TABLES
-- =====================================================

-- Statistics/Counter Configuration
CREATE TABLE section_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_content_id UUID NOT NULL REFERENCES section_content_blocks(id) ON DELETE CASCADE,
  
  -- Counter Properties
  label VARCHAR(200) NOT NULL,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  suffix VARCHAR(20), -- %, +, K, M
  prefix VARCHAR(20),
  
  -- Animation
  animation_duration INTEGER DEFAULT 2000, -- milliseconds
  count_up BOOLEAN DEFAULT true,
  
  -- Styling
  icon VARCHAR(100),
  color_scheme VARCHAR(50),
  
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Testimonials Management
CREATE TABLE section_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_content_id UUID NOT NULL REFERENCES section_content_blocks(id) ON DELETE CASCADE,
  
  -- Testimonial Content
  content TEXT NOT NULL,
  author_name VARCHAR(200) NOT NULL,
  author_title VARCHAR(200),
  author_company VARCHAR(200),
  author_image_id UUID REFERENCES media_library(id),
  
  -- Rating
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  
  -- Display
  is_featured BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project/Portfolio Items
CREATE TABLE section_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_content_id UUID NOT NULL REFERENCES section_content_blocks(id) ON DELETE CASCADE,
  
  -- Project Details
  title VARCHAR(300) NOT NULL,
  description TEXT,
  excerpt TEXT,
  project_url VARCHAR(1000),
  
  -- Project Images
  featured_image_id UUID REFERENCES media_library(id),
  gallery_images UUID[], -- Array of media_library IDs
  
  -- Categorization
  category VARCHAR(100),
  tags TEXT[],
  technologies TEXT[],
  
  -- Display Properties
  is_featured BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  
  -- Project Metadata
  client_name VARCHAR(200),
  completion_date DATE,
  project_duration INTEGER, -- in days
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Awards and Publications
CREATE TABLE section_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_content_id UUID NOT NULL REFERENCES section_content_blocks(id) ON DELETE CASCADE,
  
  -- Award Details
  title VARCHAR(300) NOT NULL,
  description TEXT,
  award_type VARCHAR(100), -- 'award', 'publication', 'recognition'
  
  -- Award Info
  issuer VARCHAR(200),
  award_date DATE,
  award_url VARCHAR(1000),
  
  -- Media
  image_id UUID REFERENCES media_library(id),
  certificate_id UUID REFERENCES media_library(id),
  
  -- Display
  is_featured BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Marquee/Carousel Content
CREATE TABLE section_marquee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_content_id UUID NOT NULL REFERENCES section_content_blocks(id) ON DELETE CASCADE,
  
  -- Marquee Item
  content_type VARCHAR(50) NOT NULL, -- 'text', 'image', 'mixed'
  text_content VARCHAR(500),
  image_id UUID REFERENCES media_library(id),
  link_url VARCHAR(1000),
  
  -- Animation Properties
  row_position INTEGER DEFAULT 1, -- 1 for top row, 2 for bottom row
  animation_direction animation_direction DEFAULT 'left_to_right',
  animation_speed INTEGER DEFAULT 1,
  
  -- Display
  order_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- WORKFLOW & APPROVAL SYSTEM
-- =====================================================

-- Approval Workflow Rules
CREATE TABLE approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Workflow Configuration
  stages JSONB NOT NULL, -- Array of workflow stages
  rules JSONB NOT NULL,  -- Approval rules and conditions
  
  -- Auto-approval Settings
  auto_approve_minor_changes BOOLEAN DEFAULT false,
  auto_approve_threshold INTEGER DEFAULT 5, -- Percentage of change
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Content Approval History
CREATE TABLE content_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_block_id UUID NOT NULL REFERENCES section_content_blocks(id) ON DELETE CASCADE,
  
  -- Approval Details
  reviewer_id UUID NOT NULL, -- References users table
  status content_status NOT NULL,
  comments TEXT,
  
  -- Change Summary
  changes_summary JSONB,
  previous_version INTEGER,
  approved_version INTEGER,
  
  -- Timestamps
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  scheduled_publish_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- AI & ANALYTICS TABLES
-- =====================================================

-- AI Content Generation History
CREATE TABLE ai_content_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_content_id UUID NOT NULL REFERENCES section_content_blocks(id) ON DELETE CASCADE,
  
  -- AI Request
  request_type VARCHAR(100) NOT NULL, -- 'description', 'seo_meta', 'alt_text', 'tags'
  input_prompt TEXT NOT NULL,
  
  -- AI Response
  generated_content TEXT NOT NULL,
  confidence_score DECIMAL(5,2),
  model_used VARCHAR(100),
  
  -- User Action
  was_accepted BOOLEAN,
  user_modifications TEXT,
  
  -- Request Info
  requested_by UUID,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Content Analytics
CREATE TABLE content_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES homepage_sections(id) ON DELETE CASCADE,
  
  -- Time Period
  date DATE NOT NULL,
  hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  
  -- Engagement Metrics
  view_count INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,
  average_time_spent INTEGER DEFAULT 0, -- seconds
  scroll_depth_percentage INTEGER DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  
  -- Conversion Metrics
  cta_clicks INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2),
  
  -- Performance Metrics
  load_time_ms INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure uniqueness per section per hour
  UNIQUE(section_id, date, hour_of_day)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Section Content Indexes
CREATE INDEX idx_section_content_section_id ON section_content_blocks(section_id);
CREATE INDEX idx_section_content_status ON section_content_blocks(status);
CREATE INDEX idx_section_content_version ON section_content_blocks(version);
CREATE INDEX idx_section_content_created_at ON section_content_blocks(created_at);

-- Media Indexes
CREATE INDEX idx_section_media_section ON section_media(section_content_id);
CREATE INDEX idx_section_media_media ON section_media(media_id);
CREATE INDEX idx_section_media_role ON section_media(media_role);

-- Analytics Indexes
CREATE INDEX idx_content_analytics_section_date ON content_analytics(section_id, date);
CREATE INDEX idx_content_analytics_date_hour ON content_analytics(date, hour_of_day);

-- Full-text search indexes
CREATE INDEX idx_section_content_text_search ON section_content_blocks 
  USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(body_content, '')));

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers
CREATE TRIGGER update_homepage_sections_updated_at 
  BEFORE UPDATE ON homepage_sections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_section_content_blocks_updated_at 
  BEFORE UPDATE ON section_content_blocks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_library_updated_at 
  BEFORE UPDATE ON media_library 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Version management function
CREATE OR REPLACE FUNCTION create_new_content_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Set all other versions to not current for this section
  UPDATE section_content_blocks 
  SET is_current_version = false 
  WHERE section_id = NEW.section_id AND id != NEW.id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER content_version_trigger 
  AFTER INSERT ON section_content_blocks 
  FOR EACH ROW EXECUTE FUNCTION create_new_content_version();

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Insert default sections based on current homepage
INSERT INTO homepage_sections (section_key, section_type, name, description, order_index) VALUES
('cta_overlay', 'cta_overlay', 'CTA Overlay', 'Floating demo booking and login CTAs over hero', 1),
('hero', 'hero', 'Hero Section', 'Main banner with animated title and floating images', 2),
('parallax_divider', 'parallax_divider', 'Parallax Divider', 'Small about us introduction section', 3),
('about', 'about', 'About Section', 'Company overview with featured image', 4),
('statistics', 'statistics', 'Statistics Cards', 'Happy students counters and metrics', 5),
('marquee_services', 'marquee_text', 'Service Tags Marquee', 'Scrolling service tags (Web dev, Branding, etc.)', 6),
('featured_projects', 'featured_projects', 'Featured Projects', 'Pinned projects with carousel', 7),
('services_stack', 'services_stack', 'Services Stacking Cards', 'Digital art, development, branding stacks', 8),
('approach_philosophy', 'approach_philosophy', 'Approach & Philosophy', 'Teaching methodology section', 9),
('carousel_dual_images', 'carousel_images_dual', 'Dual Direction Image Carousel', 'Two-row image carousel - top left-to-right, bottom right-to-left', 10),
('awards_publications', 'awards_publications', 'Awards & Publications', 'Recognition listings with hover reveals', 11),
('testimonials_slider', 'testimonials_slider', 'Client Testimonials', 'Customer reviews slider with ratings', 12),
('marquee_partners', 'marquee_secondary', 'Partners Marquee', 'Our Partners scrolling text', 13),
('partners_grid', 'partners_grid', 'Partners Grid', 'Partner logos in grid layout', 14),
('blog_insights', 'blog_preview', 'Recent Insights', 'Latest blog posts and articles', 15),
('final_cta', 'final_cta', 'Final CTA', 'Contact us call-to-action section', 16);

-- Create default approval workflow
INSERT INTO approval_workflows (name, description, stages, rules) VALUES
('Standard Content Approval', 'Standard approval process for content changes', 
'[
  {"name": "Draft", "order": 1, "required_roles": ["editor"], "auto_advance": false},
  {"name": "Review", "order": 2, "required_roles": ["reviewer", "admin"], "auto_advance": false},
  {"name": "Approved", "order": 3, "required_roles": ["admin"], "auto_advance": true},
  {"name": "Published", "order": 4, "required_roles": [], "auto_advance": true}
]',
'[
  {"trigger": "content_change", "threshold": 10, "action": "require_approval"},
  {"trigger": "media_upload", "action": "require_review"},
  {"trigger": "major_change", "threshold": 25, "action": "require_admin_approval"}
]');

-- =====================================================
-- COMMENTS FOR MAINTENANCE
-- =====================================================

COMMENT ON TABLE homepage_sections IS 'Master table for all homepage sections with configuration';
COMMENT ON TABLE section_content_blocks IS 'Versioned content blocks for each section with AI enhancements';
COMMENT ON TABLE media_library IS 'Enhanced media library with AI-generated metadata and variants';
COMMENT ON TABLE section_media IS 'Many-to-many relationship between content and media with carousel support';
COMMENT ON TABLE section_marquee IS 'Special table for dual-direction carousel/marquee content';
COMMENT ON TABLE content_analytics IS 'Detailed analytics for content performance tracking';
COMMENT ON TABLE ai_content_history IS 'History of AI-generated content for improvement and tracking';

-- End of schema