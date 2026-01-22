const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// COMPLETE DATABASE RESTORATION SCRIPT
// This script will:
// 1. Drop the existing database
// 2. Create a fresh database
// 3. Restore from supabase_backup.sql
// 4. Add all missing columns

const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'SecurePassword123!';

console.log('🔧 Starting complete database restoration...\n');

async function restoreDatabase() {
    // Step 1: Connect to postgres database to drop/create nadanaloga
    console.log('[1/5] Connecting to postgres database...');
    const adminPool = new Pool({
        host: '192.168.0.105',
        port: 5432,
        database: 'postgres',
        user: 'nadanaloga_user',
        password: POSTGRES_PASSWORD
    });

    try {
        // Terminate all connections to nadanaloga database
        console.log('[2/5] Terminating existing connections...');
        await adminPool.query(`
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = 'nadanaloga'
              AND pid <> pg_backend_pid();
        `);

        // Drop and recreate database
        console.log('[3/5] Dropping and recreating database...');
        await adminPool.query('DROP DATABASE IF EXISTS nadanaloga;');
        await adminPool.query('CREATE DATABASE nadanaloga;');
        console.log('✓ Database recreated\n');

    } catch (error) {
        console.error('Error in database recreation:', error.message);
        throw error;
    } finally {
        await adminPool.end();
    }

    // Step 2: Connect to nadanaloga and restore backup
    console.log('[4/5] Restoring from backup...');
    const pool = new Pool({
        host: '192.168.0.105',
        port: 5432,
        database: 'nadanaloga',
        user: 'nadanaloga_user',
        password: POSTGRES_PASSWORD
    });

    const client = await pool.connect();

    try {
        // Read backup file
        const backupPath = path.join(__dirname, 'supabase_backup.sql');
        console.log('Reading backup file:', backupPath);
        const backupSQL = fs.readFileSync(backupPath, 'utf8');

        console.log(`Backup file size: ${(backupSQL.length / 1024 / 1024).toFixed(2)} MB`);
        console.log('Executing restore... (this may take a minute)');

        // Execute the backup SQL
        await client.query(backupSQL);
        console.log('✓ Backup restored successfully\n');

        // Step 3: Add missing columns
        console.log('[5/5] Adding missing columns...');

        const addMissingColumns = async () => {
            const columns = [
                // Users table
                { table: 'users', column: 'is_deleted', type: 'BOOLEAN DEFAULT false' },
                { table: 'users', column: 'class_preference', type: "VARCHAR(20) DEFAULT 'Hybrid'" },
                { table: 'users', column: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },

                // Events table
                { table: 'events', column: 'is_active', type: 'BOOLEAN DEFAULT true' },
                { table: 'events', column: 'is_public', type: 'BOOLEAN DEFAULT false' },
                { table: 'events', column: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'events', column: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },

                // Grade exams table
                { table: 'grade_exams', column: 'exam_date', type: 'DATE' },
                { table: 'grade_exams', column: 'exam_time', type: 'TIME' },
                { table: 'grade_exams', column: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'grade_exams', column: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },

                // Locations table - add missing columns
                { table: 'locations', column: 'city', type: 'VARCHAR(100)' },
                { table: 'locations', column: 'state', type: 'VARCHAR(100)' },
                { table: 'locations', column: 'postal_code', type: 'VARCHAR(20)' },
                { table: 'locations', column: 'country', type: "VARCHAR(100) DEFAULT 'India'" },
                { table: 'locations', column: 'phone', type: 'VARCHAR(20)' },
                { table: 'locations', column: 'email', type: 'VARCHAR(255)' },
                { table: 'locations', column: 'is_active', type: 'BOOLEAN DEFAULT true' },
                { table: 'locations', column: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'locations', column: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },

                // Timestamps for other tables
                { table: 'batches', column: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'batches', column: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'courses', column: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'courses', column: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'fee_structures', column: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'fee_structures', column: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'demo_bookings', column: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'demo_bookings', column: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'book_materials', column: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'book_materials', column: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'notices', column: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'notices', column: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'invoices', column: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
                { table: 'invoices', column: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
            ];

            let added = 0;
            let skipped = 0;

            for (const { table, column, type } of columns) {
                try {
                    // Check if table exists
                    const tableCheck = await client.query(`
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables
                            WHERE table_schema = 'public'
                            AND table_name = $1
                        );
                    `, [table]);

                    if (!tableCheck.rows[0].exists) {
                        console.log(`  ⚠️  Table ${table} does not exist, skipping ${column}`);
                        skipped++;
                        continue;
                    }

                    // Add column with IF NOT EXISTS (but don't trust it due to catalog corruption)
                    // Instead, check first then add without IF NOT EXISTS
                    const checkColumn = await client.query(`
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = $1
                          AND column_name = $2;
                    `, [table, column]);

                    if (checkColumn.rows.length > 0) {
                        console.log(`  ○ ${table}.${column} already exists`);
                        skipped++;
                    } else {
                        await client.query(`ALTER TABLE public.${table} ADD COLUMN ${column} ${type};`);
                        console.log(`  ✓ Added ${table}.${column}`);
                        added++;
                    }
                } catch (error) {
                    if (error.code === '42701') {
                        console.log(`  ○ ${table}.${column} already exists`);
                        skipped++;
                    } else {
                        console.error(`  ✗ Failed to add ${table}.${column}:`, error.message);
                    }
                }
            }

            console.log(`\n✅ Column addition complete: ${added} added, ${skipped} skipped\n`);
        };

        await addMissingColumns();

        // Verify critical tables
        console.log('Verifying database structure...');
        const verifyTables = ['users', 'events', 'locations', 'grade_exams', 'batches', 'courses'];

        for (const table of verifyTables) {
            const result = await client.query(`
                SELECT COUNT(*) as count
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = $1;
            `, [table]);
            console.log(`  ${table}: ${result.rows[0].count} columns`);
        }

        console.log('\n✅ DATABASE RESTORATION COMPLETE!\n');
        console.log('Next steps:');
        console.log('1. Restart the app container in Portainer');
        console.log('2. Test www.nadanaloga.com');
        console.log('3. Try adding a location, student, etc.\n');

    } catch (error) {
        console.error('\n❌ RESTORATION FAILED:', error.message);
        console.error('Error details:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run restoration
restoreDatabase().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
