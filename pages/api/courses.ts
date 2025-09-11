// API endpoint for fetching courses from PostgreSQL
// This ensures we use existing schema_final_complete queries only

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In a real implementation, this would query the PostgreSQL database
    // using the courses table from schema_final_complete.sql
    
    // For now, return fallback data that matches the existing courses structure
    const courses = [
      {
        id: '1',
        name: 'Bharatanatyam',
        description: 'Explore the divine art of classical Indian dance with graceful movements and expressive storytelling',
        icon: 'Bharatanatyam',
        image: '/static/images/1000x1000_ser-01.webp',
        icon_url: null
      },
      {
        id: '2',
        name: 'Vocal',
        description: 'Develop your voice with traditional Carnatic vocal music techniques and classical compositions',
        icon: 'Vocal',
        image: '/static/images/1000x1000_ser-02.webp',
        icon_url: null
      },
      {
        id: '3',
        name: 'Drawing',
        description: 'Learn to express creativity through various drawing techniques and artistic mediums',
        icon: 'Drawing',
        image: '/static/images/1000x1000_ser-03.webp',
        icon_url: null
      },
      {
        id: '4',
        name: 'Abacus',
        description: 'Master mental arithmetic and boost mathematical skills with traditional abacus methods',
        icon: 'Abacus',
        image: '/static/images/1000x1000_ser-04.webp',
        icon_url: null
      }
    ];

    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
}

/* 
TODO: Replace with actual PostgreSQL query
Example implementation using the courses table:

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
    
    // Query courses table from schema_final_complete.sql
    const result = await client.query(`
      SELECT 
        id,
        name,
        description,
        icon,
        image,
        icon_url,
        created_at,
        updated_at
      FROM courses 
      ORDER BY name ASC
    `);
    
    client.release();
    
    const courses = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      image: row.image,
      icon_url: row.icon_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
}
*/