// API endpoint for fetching media items from PostgreSQL
// This ensures we use existing schema_final_complete queries only

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In a real implementation, this would query the PostgreSQL database
    // using the media_items table from schema_final_complete.sql
    
    // For now, return fallback data that matches the static template structure
    const mediaItems = [
      {
        type: 'image',
        url: '/static/images/01_hero-img.webp',
        title: 'Bharatanatyam Performance',
        description: 'Traditional dance performance'
      },
      {
        type: 'image',
        url: '/static/images/02_hero-img.webp', 
        title: 'Vocal Music Class',
        description: 'Students learning Carnatic music'
      },
      {
        type: 'image',
        url: '/static/images/03_hero-img.webp',
        title: 'Drawing Session',
        description: 'Art class in progress'
      },
      {
        type: 'video',
        url: '/static/media/540x310_video-01.mp4',
        title: 'Academy Overview',
        description: 'Welcome to our academy'
      },
      // Gallery images for marquee
      {
        type: 'image',
        url: '/static/images/1200x1000_marquee-01.webp',
        title: 'Student Performance 1',
        description: 'Annual day celebration'
      },
      {
        type: 'image', 
        url: '/static/images/1200x1000_marquee-02.webp',
        title: 'Student Performance 2',
        description: 'Dance recital'
      },
      {
        type: 'image',
        url: '/static/images/1200x1000_marquee-03.webp',
        title: 'Student Performance 3', 
        description: 'Music concert'
      },
      {
        type: 'image',
        url: '/static/images/1200x1000_marquee-04.webp',
        title: 'Student Performance 4',
        description: 'Art exhibition'
      },
      {
        type: 'image',
        url: '/static/images/1200x1000_marquee-05.webp',
        title: 'Student Performance 5',
        description: 'Cultural program'
      },
      {
        type: 'image',
        url: '/static/images/1200x1000_marquee-06.webp',
        title: 'Student Performance 6',
        description: 'Traditional ceremony'
      },
      {
        type: 'image',
        url: '/static/images/1200x1000_marquee-07.webp',
        title: 'Student Performance 7',
        description: 'Workshop session'
      },
      {
        type: 'image',
        url: '/static/images/1200x1000_marquee-08.webp',
        title: 'Student Performance 8',
        description: 'Special event'
      }
    ];

    res.status(200).json(mediaItems);
  } catch (error) {
    console.error('Error fetching media items:', error);
    res.status(500).json({ error: 'Failed to fetch media items' });
  }
}

/* 
TODO: Replace with actual PostgreSQL query
Example implementation using the media_items table:

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    
    // Query media_items table from schema_final_complete.sql
    const result = await client.query(`
      SELECT 
        type,
        url,
        title,
        description,
        upload_date,
        created_at
      FROM media_items 
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    client.release();
    
    const mediaItems = result.rows.map(row => ({
      type: row.type,
      url: row.url,
      title: row.title,
      description: row.description,
      uploadDate: row.upload_date,
      createdAt: row.created_at
    }));

    res.status(200).json(mediaItems);
  } catch (error) {
    console.error('Error fetching media items:', error);
    res.status(500).json({ error: 'Failed to fetch media items' });
  }
}
*/