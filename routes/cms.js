/**
 * CMS API Routes
 * Comprehensive content management system endpoints
 * Supports all homepage sections with AI integration
 */

import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';
import aiService from '../services/aiService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'static', 'images', 'cms');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp|mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

// =====================================================
// SECTION MANAGEMENT ENDPOINTS
// =====================================================

/**
 * GET /api/cms/sections
 * Retrieve all homepage sections with their current content
 */
router.get('/sections', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id,
        s.section_key,
        s.section_type,
        s.name,
        s.description,
        s.order_index,
        s.is_active,
        s.layout_config,
        s.responsive_settings,
        s.animation_config,
        s.custom_css,
        s.seo_title,
        s.seo_description,
        s.seo_keywords,
        c.id as content_id,
        c.version,
        c.title,
        c.subtitle,
        c.description as content_description,
        c.body_content,
        c.rich_content,
        c.metadata,
        c.tags,
        c.status,
        c.ai_generated_content,
        c.ai_seo_score,
        c.updated_at
      FROM homepage_sections s
      LEFT JOIN section_content_blocks c ON s.id = c.section_id AND c.is_current_version = true
      ORDER BY s.order_index ASC
    `;
    
    const result = await pool.query(query);
    
    // Group sections and fetch associated media/CTAs
    const sections = [];
    for (const row of result.rows) {
      const section = {
        id: row.id,
        section_key: row.section_key,
        section_type: row.section_type,
        name: row.name,
        description: row.description,
        order_index: row.order_index,
        is_active: row.is_active,
        layout_config: row.layout_config,
        responsive_settings: row.responsive_settings,
        animation_config: row.animation_config,
        custom_css: row.custom_css,
        seo: {
          title: row.seo_title,
          description: row.seo_description,
          keywords: row.seo_keywords
        },
        content: row.content_id ? {
          id: row.content_id,
          version: row.version,
          title: row.title,
          subtitle: row.subtitle,
          description: row.content_description,
          body_content: row.body_content,
          rich_content: row.rich_content,
          metadata: row.metadata,
          tags: row.tags,
          status: row.status,
          ai_generated_content: row.ai_generated_content,
          ai_seo_score: row.ai_seo_score,
          updated_at: row.updated_at
        } : null
      };
      
      // Fetch media associations
      if (section.content) {
        section.content.media = await getSectionMedia(section.content.id);
        section.content.ctas = await getSectionCTAs(section.content.id);
        
        // Fetch specialized content based on section type
        section.content.specialized = await getSpecializedContent(section.section_type, section.content.id);
      }
      
      sections.push(section);
    }
    
    res.json({
      success: true,
      data: sections,
      count: sections.length
    });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sections',
      details: error.message
    });
  }
});

/**
 * POST /api/cms/sections
 * Create a new homepage section
 */
router.post('/sections', requireAuth, requireRole(['admin', 'editor']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      section_key,
      section_type,
      name,
      description,
      order_index,
      layout_config = {},
      responsive_settings = {},
      animation_config = {},
      custom_css = '',
      seo = {}
    } = req.body;
    
    // Insert section
    const sectionQuery = `
      INSERT INTO homepage_sections (
        section_key, section_type, name, description, order_index,
        layout_config, responsive_settings, animation_config, custom_css,
        seo_title, seo_description, seo_keywords
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const sectionResult = await client.query(sectionQuery, [
      section_key,
      section_type,
      name,
      description,
      order_index,
      JSON.stringify(layout_config),
      JSON.stringify(responsive_settings),
      JSON.stringify(animation_config),
      custom_css,
      seo.title || null,
      seo.description || null,
      seo.keywords || null
    ]);
    
    const section = sectionResult.rows[0];
    
    // Create initial content block
    const contentQuery = `
      INSERT INTO section_content_blocks (
        section_id, title, status, created_by, updated_by
      ) VALUES ($1, $2, 'draft', $3, $3)
      RETURNING *
    `;
    
    const contentResult = await client.query(contentQuery, [
      section.id,
      `${name} Content`,
      req.user.id
    ]);
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: {
        section,
        content: contentResult.rows[0]
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create section',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/cms/sections/:id
 * Update a homepage section
 */
router.put('/sections/:id', requireAuth, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      order_index,
      is_active,
      layout_config,
      responsive_settings,
      animation_config,
      custom_css,
      seo
    } = req.body;
    
    const query = `
      UPDATE homepage_sections SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        order_index = COALESCE($3, order_index),
        is_active = COALESCE($4, is_active),
        layout_config = COALESCE($5, layout_config),
        responsive_settings = COALESCE($6, responsive_settings),
        animation_config = COALESCE($7, animation_config),
        custom_css = COALESCE($8, custom_css),
        seo_title = COALESCE($9, seo_title),
        seo_description = COALESCE($10, seo_description),
        seo_keywords = COALESCE($11, seo_keywords),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name,
      description,
      order_index,
      is_active,
      layout_config ? JSON.stringify(layout_config) : null,
      responsive_settings ? JSON.stringify(responsive_settings) : null,
      animation_config ? JSON.stringify(animation_config) : null,
      custom_css,
      seo?.title,
      seo?.description,
      seo?.keywords,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Section not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update section',
      details: error.message
    });
  }
});

/**
 * DELETE /api/cms/sections/:id
 * Delete a homepage section (soft delete - set is_active to false)
 */
router.delete('/sections/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      UPDATE homepage_sections 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Section not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Section deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete section',
      details: error.message
    });
  }
});

/**
 * POST /api/cms/sections/reorder
 * Reorder sections by updating order_index
 */
router.post('/sections/reorder', requireAuth, requireRole(['admin', 'editor']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { section_orders } = req.body; // [{ id, order_index }]
    
    for (const { id, order_index } of section_orders) {
      await client.query(
        'UPDATE homepage_sections SET order_index = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [order_index, id]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Sections reordered successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reordering sections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder sections',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// =====================================================
// CONTENT MANAGEMENT ENDPOINTS
// =====================================================

/**
 * PUT /api/cms/content/:id
 * Update section content with AI enhancements
 */
router.put('/content/:id', requireAuth, requireRole(['admin', 'editor']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      title,
      subtitle,
      description,
      body_content,
      rich_content,
      metadata = {},
      tags = [],
      generate_ai_content = false,
      ai_options = {}
    } = req.body;
    
    // Generate AI content if requested
    let ai_generated_content = {};
    let ai_seo_score = null;
    
    if (generate_ai_content) {
      const content_text = `${title || ''} ${subtitle || ''} ${description || ''} ${body_content || ''}`;
      
      try {
        // Generate AI enhancements based on options
        if (ai_options.description) {
          const aiDescription = await aiService.generateDescription(
            ai_options.section_type || 'general',
            content_text,
            ai_options.tone || 'professional',
            ai_options.max_length || 200
          );
          ai_generated_content.description = aiDescription;
        }
        
        if (ai_options.seo_meta) {
          const seoMeta = await aiService.generateSEOMetadata(title, content_text, tags);
          ai_generated_content.seo = seoMeta;
          ai_seo_score = seoMeta.score;
        }
        
        if (ai_options.tags) {
          const aiTags = await aiService.generateTags(content_text);
          ai_generated_content.tags = aiTags;
        }
        
        if (ai_options.optimize_content) {
          const optimization = await aiService.optimizeContent(
            content_text,
            ai_options.target_audience || 'students_parents'
          );
          ai_generated_content.optimization = optimization;
        }
      } catch (aiError) {
        console.warn('AI content generation failed:', aiError);
        // Continue without AI enhancements
      }
    }
    
    // Create new version of content
    const currentVersionQuery = 'SELECT MAX(version) as max_version FROM section_content_blocks WHERE section_id = (SELECT section_id FROM section_content_blocks WHERE id = $1)';
    const versionResult = await client.query(currentVersionQuery, [id]);
    const newVersion = (versionResult.rows[0].max_version || 0) + 1;
    
    // Set current version to false
    await client.query('UPDATE section_content_blocks SET is_current_version = false WHERE section_id = (SELECT section_id FROM section_content_blocks WHERE id = $1)', [id]);
    
    // Insert new version
    const insertQuery = `
      INSERT INTO section_content_blocks (
        section_id, version, is_current_version,
        title, subtitle, description, body_content, rich_content,
        metadata, tags, ai_generated_content, ai_seo_score,
        status, created_by, updated_by
      )
      SELECT 
        section_id, $2, true,
        COALESCE($3, title),
        COALESCE($4, subtitle), 
        COALESCE($5, description),
        COALESCE($6, body_content),
        COALESCE($7, rich_content),
        COALESCE($8, metadata),
        COALESCE($9, tags),
        COALESCE($10, ai_generated_content),
        COALESCE($11, ai_seo_score),
        'draft', $12, $12
      FROM section_content_blocks WHERE id = $1
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [
      id,
      newVersion,
      title,
      subtitle,
      description,
      body_content,
      rich_content ? JSON.stringify(rich_content) : null,
      JSON.stringify(metadata),
      tags,
      JSON.stringify(ai_generated_content),
      ai_seo_score,
      req.user.id
    ]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: result.rows[0],
      ai_generated: Object.keys(ai_generated_content).length > 0 ? ai_generated_content : null
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update content',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/cms/content/:id/versions
 * Get all versions of a content block
 */
router.get('/content/:id/versions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT c.*, u.name as updated_by_name
      FROM section_content_blocks c
      LEFT JOIN users u ON c.updated_by = u.id
      WHERE c.section_id = (SELECT section_id FROM section_content_blocks WHERE id = $1)
      ORDER BY c.version DESC
    `;
    
    const result = await pool.query(query, [id]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching content versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content versions',
      details: error.message
    });
  }
});

/**
 * POST /api/cms/content/:id/publish
 * Publish content (change status to published)
 */
router.post('/content/:id/publish', requireAuth, requireRole(['admin', 'reviewer']), async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_publish_at } = req.body;
    
    const query = `
      UPDATE section_content_blocks 
      SET status = 'published', 
          published_at = COALESCE($2, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      id,
      scheduled_publish_at ? new Date(scheduled_publish_at) : null
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error publishing content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish content',
      details: error.message
    });
  }
});

// =====================================================
// MEDIA MANAGEMENT ENDPOINTS
// =====================================================

/**
 * POST /api/cms/media/upload
 * Upload and process media files
 */
router.post('/media/upload', requireAuth, upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const {
      alt_text,
      caption,
      credit,
      seo_title,
      seo_description,
      generate_ai_metadata = false
    } = req.body;
    
    const file = req.file;
    const fileUrl = `/static/images/cms/${file.filename}`;
    const filePath = file.path;
    
    let width = null;
    let height = null;
    let variants = {};
    let ai_generated_alt = null;
    let ai_description = null;
    let detected_objects = [];
    let dominant_colors = [];
    let mood_tags = [];
    let ai_quality_score = null;
    
    // Process image if it's an image file
    if (file.mimetype.startsWith('image/')) {
      const imageInfo = await sharp(filePath).metadata();
      width = imageInfo.width;
      height = imageInfo.height;
      
      // Generate responsive variants
      const variantSizes = [
        { name: 'thumbnail', width: 300, height: 300 },
        { name: 'medium', width: 800 },
        { name: 'large', width: 1200 }
      ];
      
      for (const variant of variantSizes) {
        const variantFilename = `${path.parse(file.filename).name}-${variant.name}${path.extname(file.filename)}`;
        const variantPath = path.join(path.dirname(filePath), variantFilename);
        
        let sharpInstance = sharp(filePath).resize(variant.width, variant.height, {
          fit: 'cover',
          withoutEnlargement: true
        });
        
        // Convert to WebP for better compression
        const webpFilename = `${path.parse(file.filename).name}-${variant.name}.webp`;
        const webpPath = path.join(path.dirname(filePath), webpFilename);
        
        await sharpInstance.webp({ quality: 85 }).toFile(webpPath);
        
        variants[variant.name] = `/static/images/cms/${variantFilename}`;
        variants[`${variant.name}_webp`] = `/static/images/cms/${webpFilename}`;
      }
      
      // AI analysis if requested
      if (generate_ai_metadata) {
        try {
          const analysis = await aiService.analyzeImage(filePath, `${req.protocol}://${req.get('host')}${fileUrl}`);
          
          if (analysis.ai) {
            detected_objects = analysis.ai.objects || [];
            mood_tags = [analysis.ai.mood] || [];
            ai_quality_score = Math.round(analysis.quality_score || 70);
          }
          
          if (analysis.colors) {
            dominant_colors = analysis.colors
              .map(c => `#${c.mean.toString(16).padStart(2, '0').repeat(3)}`)
              .slice(0, 5);
          }
          
          // Generate AI alt text if not provided
          if (!alt_text && req.body.context) {
            const aiAlt = await aiService.generateAltText(
              `${req.protocol}://${req.get('host')}${fileUrl}`,
              req.body.context
            );
            ai_generated_alt = aiAlt.alt_text;
          }
        } catch (aiError) {
          console.warn('AI media analysis failed:', aiError);
        }
      }
    }
    
    // Insert media record
    const mediaQuery = `
      INSERT INTO media_library (
        filename, original_filename, file_path, url, media_type, mime_type, file_size,
        width, height, alt_text, ai_generated_alt, ai_description,
        detected_objects, dominant_colors, mood_tags, ai_quality_score,
        seo_title, seo_description, caption, credit, variants,
        is_processed, processing_status, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *
    `;
    
    const mediaType = file.mimetype.startsWith('image/') ? 'image' : 
                     file.mimetype.startsWith('video/') ? 'video' : 'document';
    
    const mediaResult = await client.query(mediaQuery, [
      file.filename,
      file.originalname,
      filePath,
      fileUrl,
      mediaType,
      file.mimetype,
      file.size,
      width,
      height,
      alt_text || ai_generated_alt || null,
      ai_generated_alt,
      ai_description,
      detected_objects,
      dominant_colors,
      mood_tags,
      ai_quality_score,
      seo_title || null,
      seo_description || null,
      caption || null,
      credit || null,
      JSON.stringify(variants),
      true, // is_processed
      'completed',
      req.user.id
    ]);
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: mediaResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error uploading media:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload media',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/cms/media
 * Get all media files with filtering and pagination
 */
router.get('/media', requireAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      search,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = '1=1';
    const queryParams = [];
    let paramCount = 0;
    
    if (type) {
      paramCount++;
      whereClause += ` AND media_type = $${paramCount}`;
      queryParams.push(type);
    }
    
    if (search) {
      paramCount++;
      whereClause += ` AND (filename ILIKE $${paramCount} OR alt_text ILIKE $${paramCount} OR caption ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }
    
    const query = `
      SELECT m.*, u.name as uploaded_by_name
      FROM media_library m
      LEFT JOIN users u ON m.uploaded_by = u.id
      WHERE ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(limit, offset);
    
    const result = await pool.query(query, queryParams);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM media_library WHERE ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch media',
      details: error.message
    });
  }
});

// =====================================================
// AI INTEGRATION ENDPOINTS
// =====================================================

/**
 * POST /api/cms/ai/generate-content
 * Generate AI content for sections
 */
router.post('/ai/generate-content', requireAuth, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const {
      type, // 'description', 'seo_meta', 'tags', 'alt_text'
      content_type, // 'hero', 'about', 'services', etc.
      existing_content = '',
      context = '',
      options = {}
    } = req.body;
    
    let result;
    
    switch (type) {
      case 'description':
        result = await aiService.generateDescription(
          content_type,
          existing_content,
          options.tone || 'professional',
          options.max_length || 200
        );
        break;
        
      case 'seo_meta':
        result = await aiService.generateSEOMetadata(
          options.title || '',
          existing_content,
          options.keywords || []
        );
        break;
        
      case 'tags':
        result = await aiService.generateTags(existing_content, options.max_tags || 10);
        break;
        
      case 'alt_text':
        if (!options.image_url) {
          return res.status(400).json({
            success: false,
            error: 'Image URL required for alt text generation'
          });
        }
        result = await aiService.generateAltText(options.image_url, context);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid generation type'
        });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('AI content generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI content',
      details: error.message
    });
  }
});

/**
 * POST /api/cms/ai/analyze-seo
 * Analyze content for SEO optimization
 */
router.post('/ai/analyze-seo', requireAuth, async (req, res) => {
  try {
    const { content, metadata = {} } = req.body;
    
    const seoScore = await aiService.calculateSEOScore(content, metadata);
    
    res.json({
      success: true,
      data: seoScore
    });
  } catch (error) {
    console.error('SEO analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze SEO',
      details: error.message
    });
  }
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function getSectionMedia(contentId) {
  const query = `
    SELECT sm.*, m.filename, m.url, m.alt_text, m.width, m.height, m.media_type
    FROM section_media sm
    JOIN media_library m ON sm.media_id = m.id
    WHERE sm.section_content_id = $1
    ORDER BY sm.order_index ASC
  `;
  
  const result = await pool.query(query, [contentId]);
  return result.rows;
}

async function getSectionCTAs(contentId) {
  const query = `
    SELECT * FROM section_ctas
    WHERE section_content_id = $1
    ORDER BY order_index ASC
  `;
  
  const result = await pool.query(query, [contentId]);
  return result.rows;
}

async function getSpecializedContent(sectionType, contentId) {
  switch (sectionType) {
    case 'statistics':
      return await getStatisticsContent(contentId);
    case 'testimonials_slider':
      return await getTestimonialsContent(contentId);
    case 'featured_projects':
      return await getProjectsContent(contentId);
    case 'awards_publications':
      return await getAwardsContent(contentId);
    case 'carousel_images_dual':
      return await getMarqueeContent(contentId);
    default:
      return null;
  }
}

async function getStatisticsContent(contentId) {
  const query = 'SELECT * FROM section_statistics WHERE section_content_id = $1 ORDER BY order_index ASC';
  const result = await pool.query(query, [contentId]);
  return result.rows;
}

async function getTestimonialsContent(contentId) {
  const query = `
    SELECT t.*, m.url as author_image_url
    FROM section_testimonials t
    LEFT JOIN media_library m ON t.author_image_id = m.id
    WHERE t.section_content_id = $1
    ORDER BY t.order_index ASC
  `;
  const result = await pool.query(query, [contentId]);
  return result.rows;
}

async function getProjectsContent(contentId) {
  const query = `
    SELECT p.*, m.url as featured_image_url
    FROM section_projects p
    LEFT JOIN media_library m ON p.featured_image_id = m.id
    WHERE p.section_content_id = $1
    ORDER BY p.order_index ASC
  `;
  const result = await pool.query(query, [contentId]);
  return result.rows;
}

async function getAwardsContent(contentId) {
  const query = `
    SELECT a.*, m.url as image_url
    FROM section_awards a
    LEFT JOIN media_library m ON a.image_id = m.id
    WHERE a.section_content_id = $1
    ORDER BY a.order_index ASC
  `;
  const result = await pool.query(query, [contentId]);
  return result.rows;
}

async function getMarqueeContent(contentId) {
  const query = `
    SELECT m.*, ml.url as image_url
    FROM section_marquee m
    LEFT JOIN media_library ml ON m.image_id = ml.id
    WHERE m.section_content_id = $1
    ORDER BY m.row_position ASC, m.order_index ASC
  `;
  const result = await pool.query(query, [contentId]);
  return result.rows;
}

export default router;