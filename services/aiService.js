/**
 * AI Integration Service
 * Comprehensive AI-powered content generation and analysis
 * Supports OpenAI GPT-4, Claude, and local processing
 */

import OpenAI from 'openai';
import sharp from 'sharp';
import { createHash } from 'crypto';
import { pool } from '../config/database.js';

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.contentCache = new Map();
    this.rateLimiter = new Map();
  }

  /**
   * CONTENT GENERATION SERVICES
   */

  async generateDescription(contentType, existingContent = '', tone = 'professional', maxLength = 200) {
    const cacheKey = this.getCacheKey('description', { contentType, existingContent, tone, maxLength });
    if (this.contentCache.has(cacheKey)) {
      return this.contentCache.get(cacheKey);
    }

    try {
      const prompt = this.buildDescriptionPrompt(contentType, existingContent, tone, maxLength);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert content writer specializing in educational technology and creative services. Write engaging, SEO-friendly descriptions that convert visitors into students."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: Math.ceil(maxLength * 1.5),
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const result = {
        content: completion.choices[0].message.content.trim(),
        confidence: this.calculateConfidence(completion),
        model: 'gpt-4-turbo',
        tokens_used: completion.usage.total_tokens,
        generated_at: new Date().toISOString()
      };

      this.contentCache.set(cacheKey, result);
      await this.logAIGeneration('description', prompt, result);
      
      return result;
    } catch (error) {
      console.error('AI Description Generation Error:', error);
      throw new Error(`Failed to generate description: ${error.message}`);
    }
  }

  async generateSEOMetadata(title, content, targetKeywords = []) {
    try {
      const prompt = `
        Generate SEO metadata for a Thillaikadavul (Tamil cultural arts education) webpage:
        
        Title: ${title}
        Content: ${content.substring(0, 1000)}...
        Target Keywords: ${targetKeywords.join(', ')}
        
        Please provide:
        1. SEO-optimized title (50-60 characters)
        2. Meta description (150-160 characters)
        3. 5-8 relevant keywords
        4. SEO score (1-100) with explanation
        5. Improvement suggestions
        
        Focus on Tamil arts, cultural education, traditional learning, and student success.
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are an SEO expert specializing in educational websites and cultural institutions. Optimize for both search engines and user engagement."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      });

      const response = completion.choices[0].message.content;
      const metadata = this.parseSEOResponse(response);
      
      await this.logAIGeneration('seo_metadata', prompt, metadata);
      return metadata;
    } catch (error) {
      console.error('AI SEO Generation Error:', error);
      throw new Error(`Failed to generate SEO metadata: ${error.message}`);
    }
  }

  async generateAltText(imageUrl, context = '') {
    try {
      const prompt = `
        Generate accessibility-focused alt text for an image on Thillaikadavul's website.
        
        Context: ${context}
        
        Requirements:
        - Descriptive but concise (max 125 characters)
        - Include cultural/educational context if relevant
        - Focus on what matters for screen readers
        - Avoid "image of" or "picture of"
        
        If this appears to be:
        - Student photos: Focus on activity/learning
        - Art/cultural images: Describe the art form/tradition
        - Facility photos: Describe the space/environment
        - Teacher photos: Focus on instruction/expertise
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "low"
                }
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      const result = {
        alt_text: completion.choices[0].message.content.trim(),
        confidence: this.calculateConfidence(completion),
        model: 'gpt-4-vision',
        generated_at: new Date().toISOString()
      };

      await this.logAIGeneration('alt_text', prompt, result);
      return result;
    } catch (error) {
      console.error('AI Alt Text Generation Error:', error);
      // Fallback to basic description
      return {
        alt_text: context ? `Image related to ${context}` : 'Educational content image',
        confidence: 0.3,
        model: 'fallback',
        generated_at: new Date().toISOString()
      };
    }
  }

  async generateTags(content, maxTags = 10) {
    try {
      const prompt = `
        Generate relevant tags for this Thillaikadavul content:
        
        Content: ${content.substring(0, 2000)}
        
        Generate ${maxTags} tags that are:
        - Relevant to Tamil cultural arts education
        - Mix of specific and broad terms
        - Useful for content organization
        - SEO-friendly
        - Include learning types, age groups, art forms, skills
        
        Return as comma-separated list.
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a content tagging expert for educational and cultural institutions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.4
      });

      const tagsString = completion.choices[0].message.content.trim();
      const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      const result = {
        tags,
        confidence: this.calculateConfidence(completion),
        model: 'gpt-4-turbo',
        generated_at: new Date().toISOString()
      };

      await this.logAIGeneration('tags', prompt, result);
      return result;
    } catch (error) {
      console.error('AI Tags Generation Error:', error);
      throw new Error(`Failed to generate tags: ${error.message}`);
    }
  }

  /**
   * IMAGE ANALYSIS SERVICES
   */

  async analyzeImage(imagePath, imageUrl = null) {
    try {
      // Basic image analysis using Sharp
      const imageBuffer = await sharp(imagePath);
      const metadata = await imageBuffer.metadata();
      
      // Color analysis
      const stats = await imageBuffer.stats();
      const dominantColors = this.extractDominantColors(stats);
      
      // AI-powered analysis
      const aiAnalysis = imageUrl ? await this.analyzeImageWithAI(imageUrl) : {};
      
      return {
        technical: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          colorSpace: metadata.space,
          hasAlpha: metadata.hasAlpha,
          fileSize: metadata.size
        },
        colors: dominantColors,
        ai: aiAnalysis,
        quality_score: this.calculateImageQuality(metadata, stats),
        analyzed_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Image Analysis Error:', error);
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
  }

  async analyzeImageWithAI(imageUrl) {
    try {
      const prompt = `
        Analyze this image for a Thillaikadavul (Tamil cultural arts education) website:
        
        Provide:
        1. Object detection (what's in the image)
        2. Mood/emotion (professional, joyful, focused, etc.)
        3. Educational context (if relevant)
        4. Cultural elements (if visible)
        5. Suggested use cases on website
        6. Quality assessment (composition, lighting, clarity)
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 600,
        temperature: 0.3
      });

      return this.parseImageAnalysisResponse(completion.choices[0].message.content);
    } catch (error) {
      console.error('AI Image Analysis Error:', error);
      return {
        objects: [],
        mood: 'neutral',
        context: 'general',
        cultural_elements: [],
        use_cases: ['general content'],
        quality: 'unknown'
      };
    }
  }

  /**
   * CONTENT OPTIMIZATION SERVICES
   */

  async optimizeContent(content, targetAudience = 'students_parents', goals = ['engagement', 'conversion']) {
    try {
      const prompt = `
        Optimize this content for Thillaikadavul's website:
        
        Original Content: ${content}
        Target Audience: ${targetAudience}
        Goals: ${goals.join(', ')}
        
        Provide:
        1. Optimized version (maintain key information)
        2. Readability score improvement
        3. SEO enhancements
        4. Engagement improvements
        5. Call-to-action suggestions
        6. Cultural sensitivity check
        
        Focus on Tamil cultural arts education, traditional values, and student success.
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a content optimization expert specializing in educational institutions and cultural organizations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.4
      });

      const optimization = this.parseOptimizationResponse(completion.choices[0].message.content);
      
      await this.logAIGeneration('content_optimization', prompt, optimization);
      return optimization;
    } catch (error) {
      console.error('Content Optimization Error:', error);
      throw new Error(`Failed to optimize content: ${error.message}`);
    }
  }

  /**
   * ANALYTICS & SCORING SERVICES
   */

  async calculateSEOScore(content, metadata = {}) {
    const factors = {
      title_length: this.scoreTitleLength(metadata.title || ''),
      description_length: this.scoreDescriptionLength(metadata.description || ''),
      keyword_density: this.scoreKeywordDensity(content, metadata.keywords || []),
      readability: await this.scoreReadability(content),
      structure: this.scoreContentStructure(content),
      images: this.scoreImageOptimization(metadata.images || [])
    };

    const totalScore = Math.round(
      Object.values(factors).reduce((sum, score) => sum + score, 0) / Object.keys(factors).length
    );

    return {
      overall_score: totalScore,
      factors,
      recommendations: this.getSEORecommendations(factors),
      calculated_at: new Date().toISOString()
    };
  }

  /**
   * UTILITY METHODS
   */

  buildDescriptionPrompt(contentType, existingContent, tone, maxLength) {
    const typePrompts = {
      hero: "Create an inspiring hero section description that immediately captures attention and communicates Thillaikadavul's mission",
      about: "Write a compelling about section that builds trust and showcases expertise in Tamil cultural arts education",
      services: "Describe educational services that highlight benefits and outcomes for students",
      testimonials: "Create engaging testimonial context that emphasizes student success and transformation",
      portfolio: "Write portfolio descriptions that showcase achievement and learning outcomes",
      contact: "Create welcoming contact section text that encourages prospective students to reach out"
    };

    return `
      Create a ${tone} ${maxLength}-character description for a ${contentType} section on Thillaikadavul's website.
      
      Context: ${typePrompts[contentType] || 'Create engaging educational content'}
      Existing content reference: ${existingContent.substring(0, 500)}
      
      Requirements:
      - ${maxLength} characters maximum
      - ${tone} tone
      - Focus on Tamil cultural arts education
      - Include emotional connection
      - Encourage action/engagement
      - Culturally appropriate
      
      The description should inspire prospective students and parents while highlighting the unique value of traditional Tamil arts education.
    `;
  }

  getCacheKey(type, params) {
    const paramString = JSON.stringify(params);
    return createHash('md5').update(`${type}:${paramString}`).digest('hex');
  }

  calculateConfidence(completion) {
    // Simple confidence calculation based on response quality indicators
    const finishReason = completion.choices[0].finish_reason;
    const contentLength = completion.choices[0].message.content.length;
    
    let confidence = 0.7; // Base confidence
    
    if (finishReason === 'stop') confidence += 0.2;
    if (contentLength > 50) confidence += 0.1;
    if (completion.usage?.total_tokens < 1000) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }

  async logAIGeneration(type, prompt, result) {
    try {
      const query = `
        INSERT INTO ai_content_history (request_type, input_prompt, generated_content, confidence_score, model_used, generated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await pool.query(query, [
        type,
        prompt.substring(0, 5000), // Limit prompt length
        JSON.stringify(result),
        result.confidence || 0.5,
        result.model || 'unknown',
        new Date()
      ]);
    } catch (error) {
      console.error('Failed to log AI generation:', error);
    }
  }

  extractDominantColors(stats) {
    // Extract dominant colors from image statistics
    return stats.channels.map((channel, index) => {
      const colorNames = ['red', 'green', 'blue', 'alpha'];
      return {
        channel: colorNames[index] || `channel_${index}`,
        mean: Math.round(channel.mean),
        std: Math.round(channel.std),
        min: channel.min,
        max: channel.max
      };
    });
  }

  calculateImageQuality(metadata, stats) {
    let score = 50; // Base score
    
    // Resolution scoring
    const pixels = metadata.width * metadata.height;
    if (pixels > 2000000) score += 20; // High resolution
    else if (pixels > 500000) score += 10; // Medium resolution
    
    // Aspect ratio scoring
    const aspectRatio = metadata.width / metadata.height;
    if (aspectRatio >= 0.8 && aspectRatio <= 2.0) score += 10; // Good aspect ratio
    
    // Color depth scoring
    if (metadata.channels >= 3) score += 10; // Color image
    if (metadata.depth === 16) score += 5; // High bit depth
    
    return Math.min(score, 100);
  }

  parseImageAnalysisResponse(response) {
    // Simple parsing - in production, use more robust parsing
    const lines = response.split('\n');
    return {
      objects: this.extractListItems(response, 'object'),
      mood: this.extractValue(response, 'mood') || 'neutral',
      context: this.extractValue(response, 'context') || 'educational',
      cultural_elements: this.extractListItems(response, 'cultural'),
      use_cases: this.extractListItems(response, 'use'),
      quality: this.extractValue(response, 'quality') || 'good'
    };
  }

  parseSEOResponse(response) {
    return {
      title: this.extractValue(response, 'title') || '',
      description: this.extractValue(response, 'description') || '',
      keywords: this.extractListItems(response, 'keyword'),
      score: parseInt(this.extractValue(response, 'score')) || 70,
      suggestions: this.extractListItems(response, 'suggestion')
    };
  }

  parseOptimizationResponse(response) {
    return {
      optimized_content: this.extractValue(response, 'optimized') || response,
      readability_score: parseInt(this.extractValue(response, 'readability')) || 70,
      seo_improvements: this.extractListItems(response, 'seo'),
      engagement_tips: this.extractListItems(response, 'engagement'),
      cta_suggestions: this.extractListItems(response, 'call-to-action')
    };
  }

  extractValue(text, key) {
    const regex = new RegExp(`${key}[:\s]*([^\n]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  extractListItems(text, key) {
    const regex = new RegExp(`${key}[s]?[:\s]*([^:]+)(?=\d+\.|\n|$)`, 'i');
    const match = text.match(regex);
    if (!match) return [];
    
    return match[1]
      .split(/[,\n-]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  // SEO Scoring Methods
  scoreTitleLength(title) {
    const length = title.length;
    if (length >= 50 && length <= 60) return 100;
    if (length >= 40 && length < 70) return 80;
    if (length >= 30 && length < 80) return 60;
    return 30;
  }

  scoreDescriptionLength(description) {
    const length = description.length;
    if (length >= 150 && length <= 160) return 100;
    if (length >= 120 && length < 180) return 80;
    if (length >= 100 && length < 200) return 60;
    return 30;
  }

  scoreKeywordDensity(content, keywords) {
    if (keywords.length === 0) return 30;
    
    const wordCount = content.split(/\s+/).length;
    let totalKeywordCount = 0;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex);
      totalKeywordCount += matches ? matches.length : 0;
    });
    
    const density = (totalKeywordCount / wordCount) * 100;
    
    if (density >= 1 && density <= 3) return 100;
    if (density >= 0.5 && density < 5) return 80;
    if (density >= 0.1 && density < 7) return 60;
    return 30;
  }

  async scoreReadability(content) {
    // Simple readability scoring - in production, use libraries like textstat
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;
    
    if (avgWordsPerSentence <= 15) return 100;
    if (avgWordsPerSentence <= 20) return 80;
    if (avgWordsPerSentence <= 25) return 60;
    return 40;
  }

  scoreContentStructure(content) {
    let score = 50;
    
    // Check for headers
    if (content.includes('#') || content.includes('<h')) score += 20;
    
    // Check for lists
    if (content.includes('- ') || content.includes('<li>')) score += 15;
    
    // Check for paragraph breaks
    if (content.includes('\n\n') || content.includes('<p>')) score += 15;
    
    return Math.min(score, 100);
  }

  scoreImageOptimization(images) {
    if (images.length === 0) return 70;
    
    let score = 0;
    images.forEach(image => {
      if (image.alt_text && image.alt_text.length > 10) score += 30;
      if (image.file_size && image.file_size < 500000) score += 20; // Under 500KB
      if (image.width && image.width >= 800) score += 10;
    });
    
    return Math.min(score / images.length, 100);
  }

  getSEORecommendations(factors) {
    const recommendations = [];
    
    if (factors.title_length < 80) {
      recommendations.push('Optimize title length to 50-60 characters for better SEO');
    }
    
    if (factors.description_length < 80) {
      recommendations.push('Improve meta description length to 150-160 characters');
    }
    
    if (factors.keyword_density < 60) {
      recommendations.push('Increase relevant keyword usage in content');
    }
    
    if (factors.readability < 70) {
      recommendations.push('Improve content readability with shorter sentences');
    }
    
    if (factors.structure < 70) {
      recommendations.push('Add headers, lists, and better paragraph structure');
    }
    
    if (factors.images < 70) {
      recommendations.push('Add alt text to images and optimize file sizes');
    }
    
    return recommendations;
  }
}

export default new AIService();