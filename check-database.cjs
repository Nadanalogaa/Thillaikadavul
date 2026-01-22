// Quick script to check where your data is stored
// Run this with: node check-database.js

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.sub' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://nadanaloga_user:SecurePassword123!@nadanaloga-sub-postgres:5432/nadanaloga',
    ssl: false
});

async function checkData() {
    try {
        console.log('\n🔍 Checking PostgreSQL Database...\n');
        console.log('=====================================\n');

        // Check users
        const usersResult = await pool.query(`
            SELECT id, name, email, role, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 5
        `);
        console.log('📊 LATEST USERS:');
        console.log('Total users:', (await pool.query('SELECT COUNT(*) FROM users')).rows[0].count);
        console.table(usersResult.rows.map(u => ({
            Name: u.name,
            Email: u.email,
            Role: u.role,
            'Created At': new Date(u.created_at).toLocaleString()
        })));

        // Check courses
        const coursesResult = await pool.query('SELECT name, description FROM courses');
        console.log('\n📚 COURSES:');
        console.table(coursesResult.rows);

        // Check batches
        const batchesResult = await pool.query(`
            SELECT b.name, c.name as course_name, b.mode, b.created_at
            FROM batches b
            LEFT JOIN courses c ON b.course_id = c.id
            ORDER BY b.created_at DESC
            LIMIT 5
        `);
        console.log('\n👥 LATEST BATCHES:');
        console.table(batchesResult.rows.map(b => ({
            'Batch Name': b.name,
            'Course': b.course_name,
            'Mode': b.mode,
            'Created At': new Date(b.created_at).toLocaleString()
        })));

        console.log('\n=====================================');
        console.log('✅ All data shown above is in PostgreSQL!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkData();
