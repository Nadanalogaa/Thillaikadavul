#!/usr/bin/env node
/**
 * FIX ADMIN USER - Create or update admin with valid password
 * Password: admin123
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'SecurePassword123!';
const ADMIN_PASSWORD = 'admin123'; // Default admin password

console.log('🔧 Fixing Admin User\n');

async function fixAdminUser() {
    const pool = new Pool({
        host: 'nadanaloga-main-postgres',
        port: 5432,
        database: 'nadanaloga',
        user: 'nadanaloga_user',
        password: DB_PASSWORD
    });

    const client = await pool.connect();

    try {
        console.log('[1/3] Generating password hash...');
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        console.log('✓ Password hashed\n');

        console.log('[2/3] Checking if admin user exists...');
        const result = await client.query('SELECT id FROM users WHERE email = $1', ['admin@nadanaloga.com']);

        if (result.rows.length > 0) {
            // Update existing admin
            console.log('Admin user exists, updating password...');
            await client.query(
                `UPDATE users SET password = $1, role = 'Admin', status = 'active' WHERE email = 'admin@nadanaloga.com'`,
                [hashedPassword]
            );
            console.log('✓ Admin password updated\n');
        } else {
            // Create new admin
            console.log('Admin user does not exist, creating...');
            await client.query(
                `INSERT INTO users (name, email, password, role, status, class_preference, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                ['Admin', 'admin@nadanaloga.com', hashedPassword, 'Admin', 'active', 'Hybrid']
            );
            console.log('✓ Admin user created\n');
        }

        console.log('[3/3] Verifying admin user...');
        const verify = await client.query('SELECT id, name, email, role FROM users WHERE email = $1', ['admin@nadanaloga.com']);
        console.log('Admin user details:', verify.rows[0]);

        console.log('\n✅ ADMIN USER FIXED!');
        console.log('\nYou can now login with:');
        console.log('  Email: admin@nadanaloga.com');
        console.log('  Password: admin123\n');
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

fixAdminUser().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
});
