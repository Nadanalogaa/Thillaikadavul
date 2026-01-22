#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');

const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'SecurePassword123!';

console.log('🔧 Smart Database Restoration\n');

async function restore() {
    // Connect to postgres to drop/create
    const adminPool = new Pool({
        host: 'nadanaloga-main-postgres',
        port: 5432,
        database: 'postgres',
        user: 'nadanaloga_user',
        password: DB_PASSWORD
    });

    console.log('[1/4] Dropping and recreating database...');
    try {
        await adminPool.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = 'nadanaloga' AND pid <> pg_backend_pid();
        `);
    } catch (e) {}

    await adminPool.query('DROP DATABASE IF EXISTS nadanaloga;');
    await adminPool.query('CREATE DATABASE nadanaloga;');
    await adminPool.end();
    console.log('✓ Database recreated\n');

    // Connect to nadanaloga
    const pool = new Pool({
        host: 'nadanaloga-main-postgres',
        port: 5432,
        database: 'nadanaloga',
        user: 'nadanaloga_user',
        password: DB_PASSWORD
    });

    const client = await pool.connect();

    console.log('[2/4] Processing backup file...');
    let sql = fs.readFileSync('supabase_backup.sql', 'utf8');

    // Remove all psql meta-commands and problem lines
    const lines = sql.split('\n');
    const cleanLines = [];

    for (const line of lines) {
        // Skip psql commands
        if (line.startsWith('\\')) continue;
        // Skip empty lines
        if (line.trim() === '') continue;
        // Skip comments about supabase
        if (line.includes('supabase_') && line.startsWith('--')) continue;

        cleanLines.push(line);
    }

    const cleanSQL = cleanLines.join('\n');
    console.log(`Original: ${lines.length} lines, Clean: ${cleanLines.length} lines`);

    console.log('[3/4] Executing SQL (this takes 30-60 seconds)...');

    try {
        await client.query(cleanSQL);
        console.log('✓ SQL executed successfully\n');
    } catch (error) {
        console.log('Note: Some errors are expected for Supabase-specific objects');
        console.log('Error:', error.message.substring(0, 200));
    }

    console.log('[4/4] Adding missing columns...');

    const addColumn = async (table, column, type) => {
        try {
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
            console.log(`  ✓ ${table}.${column}`);
        } catch (err) {
            if (!err.message.includes('already exists')) {
                console.log(`  ✗ ${table}.${column}:`, err.message.substring(0, 100));
            }
        }
    };

    await addColumn('users', 'is_deleted', 'BOOLEAN DEFAULT false');
    await addColumn('users', 'class_preference', "VARCHAR(20) DEFAULT 'Hybrid'");
    await addColumn('users', 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');
    await addColumn('events', 'is_active', 'BOOLEAN DEFAULT true');
    await addColumn('events', 'is_public', 'BOOLEAN DEFAULT false');
    await addColumn('events', 'created_at', 'TIMESTAMPTZ DEFAULT NOW()');
    await addColumn('events', 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');
    await addColumn('grade_exams', 'exam_date', 'DATE');
    await addColumn('grade_exams', 'exam_time', 'TIME');
    await addColumn('grade_exams', 'created_at', 'TIMESTAMPTZ DEFAULT NOW()');
    await addColumn('grade_exams', 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');
    await addColumn('locations', 'city', 'VARCHAR(100)');
    await addColumn('locations', 'state', 'VARCHAR(100)');
    await addColumn('locations', 'postal_code', 'VARCHAR(20)');
    await addColumn('locations', 'country', "VARCHAR(100) DEFAULT 'India'");
    await addColumn('locations', 'phone', 'VARCHAR(20)');
    await addColumn('locations', 'email', 'VARCHAR(255)');
    await addColumn('locations', 'is_active', 'BOOLEAN DEFAULT true');
    await addColumn('locations', 'created_at', 'TIMESTAMPTZ DEFAULT NOW()');
    await addColumn('locations', 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');

    for (const table of ['batches', 'courses', 'fee_structures', 'demo_bookings', 'book_materials', 'notices', 'invoices']) {
        await addColumn(table, 'created_at', 'TIMESTAMPTZ DEFAULT NOW()');
        await addColumn(table, 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');
    }

    console.log('\nVerifying...');
    const result = await client.query(`
        SELECT table_name, COUNT(*) as columns
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('users', 'events', 'locations', 'grade_exams')
        GROUP BY table_name
        ORDER BY table_name;
    `);

    result.rows.forEach(r => console.log(`  ${r.table_name}: ${r.columns} columns`));

    client.release();
    await pool.end();

    console.log('\n✅ RESTORATION COMPLETE!\n');
}

restore().catch(err => {
    console.error('\n❌ ERROR:', err.message);
    process.exit(1);
});
