// Verify PostgreSQL schema has all required columns
// Run this with: node verify-schema.cjs

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.sub' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://nadanaloga_user:SecurePassword123!@nadanaloga-sub-postgres:5432/nadanaloga',
    ssl: false
});

async function verifySchema() {
    try {
        console.log('\n🔍 Verifying PostgreSQL Schema...\n');
        console.log('=====================================\n');

        // Check if users table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'users'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.error('❌ CRITICAL: users table does not exist!');
            console.log('\nYou need to import the database backup first.');
            console.log('See: deploy/START_HERE.md for instructions\n');
            process.exit(1);
        }

        console.log('✅ users table exists');

        // Check for is_deleted column
        const isDeletedCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'users'
                AND column_name = 'is_deleted'
            );
        `);

        if (!isDeletedCheck.rows[0].exists) {
            console.log('⚠️  WARNING: is_deleted column is missing!');
            console.log('\nFixing: Adding is_deleted column...');

            await pool.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);
            `);

            console.log('✅ is_deleted column added successfully');
        } else {
            console.log('✅ is_deleted column exists');
        }

        // Check all important columns
        const columnsCheck = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'users'
            ORDER BY ordinal_position;
        `);

        console.log('\n📊 USERS TABLE STRUCTURE:');
        console.log('=====================================');
        columnsCheck.rows.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
            console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`);
        });

        // Test the check-email query
        console.log('\n🧪 TESTING /api/check-email QUERY:');
        console.log('=====================================');

        const testEmail = 'test@example.com';
        const testQuery = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND is_deleted = false LIMIT 1',
            [testEmail]
        );

        console.log(`✅ Query executed successfully (found ${testQuery.rows.length} rows for ${testEmail})`);

        // Count users
        const userCount = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_deleted = true) as deleted FROM users');
        console.log(`\n📈 USER STATISTICS:`);
        console.log(`Total users: ${userCount.rows[0].total}`);
        console.log(`Deleted users: ${userCount.rows[0].deleted || 0}`);
        console.log(`Active users: ${userCount.rows[0].total - (userCount.rows[0].deleted || 0)}`);

        console.log('\n=====================================');
        console.log('✅ All checks passed!\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\nFull error:', error);

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.log('\n💡 SOLUTION:');
            console.log('This script must run FROM the Portainer container, not your local machine.');
            console.log('\nInstructions:');
            console.log('1. Upload this file to the nadanaloga-sub-app container');
            console.log('2. Run: node verify-schema.cjs');
        }
    } finally {
        await pool.end();
    }
}

verifySchema();
