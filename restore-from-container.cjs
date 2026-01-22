#!/usr/bin/env node
/**
 * Database Restoration Script
 * Run this from the APP container (nadanaloga-main-app)
 * It will connect to postgres and restore everything
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'SecurePassword123!';

console.log('🔧 Complete Database Restoration (from app container)\n');

async function restore() {
    // Connect to postgres database (not nadanaloga)
    const adminPool = new Pool({
        host: 'nadanaloga-main-postgres',  // Container name on Docker network
        port: 5432,
        database: 'postgres',
        user: 'nadanaloga_user',
        password: DB_PASSWORD
    });

    console.log('[1/5] Terminating existing connections...');
    try {
        await adminPool.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = 'nadanaloga' AND pid <> pg_backend_pid();
        `);
    } catch (err) {
        console.log('Note:', err.message);
    }

    console.log('[2/5] Dropping and recreating database...');
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

    console.log('[3/5] Restoring from backup...');
    const backupPath = path.join(__dirname, 'supabase_backup.sql');
    let sql = fs.readFileSync(backupPath, 'utf8');

    // Remove Supabase-specific commands that PostgreSQL doesn't support
    sql = sql.split('\n')
        .filter(line => !line.startsWith('\\restrict'))
        .filter(line => !line.includes('supabase_realtime'))
        .join('\n');

    console.log(`Backup size: ${(sql.length/1024/1024).toFixed(2)} MB`);

    await client.query(sql);
    console.log('✓ Restored\n');

    console.log('[4/5] Adding missing columns...');

    const addColumn = async (table, column, type) => {
        try {
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
            console.log(`  ✓ ${table}.${column}`);
        } catch (err) {
            if (!err.message.includes('already exists')) {
                console.log(`  ✗ ${table}.${column}:`, err.message);
            }
        }
    };

    // Users
    await addColumn('users', 'is_deleted', 'BOOLEAN DEFAULT false');
    await addColumn('users', 'class_preference', "VARCHAR(20) DEFAULT 'Hybrid'");
    await addColumn('users', 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');

    // Events
    await addColumn('events', 'is_active', 'BOOLEAN DEFAULT true');
    await addColumn('events', 'is_public', 'BOOLEAN DEFAULT false');
    await addColumn('events', 'created_at', 'TIMESTAMPTZ DEFAULT NOW()');
    await addColumn('events', 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');

    // Grade exams
    await addColumn('grade_exams', 'exam_date', 'DATE');
    await addColumn('grade_exams', 'exam_time', 'TIME');
    await addColumn('grade_exams', 'created_at', 'TIMESTAMPTZ DEFAULT NOW()');
    await addColumn('grade_exams', 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');

    // Locations
    await addColumn('locations', 'city', 'VARCHAR(100)');
    await addColumn('locations', 'state', 'VARCHAR(100)');
    await addColumn('locations', 'postal_code', 'VARCHAR(20)');
    await addColumn('locations', 'country', "VARCHAR(100) DEFAULT 'India'");
    await addColumn('locations', 'phone', 'VARCHAR(20)');
    await addColumn('locations', 'email', 'VARCHAR(255)');
    await addColumn('locations', 'is_active', 'BOOLEAN DEFAULT true');
    await addColumn('locations', 'created_at', 'TIMESTAMPTZ DEFAULT NOW()');
    await addColumn('locations', 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');

    // Other tables timestamps
    for (const table of ['batches', 'courses', 'fee_structures', 'demo_bookings', 'book_materials', 'notices', 'invoices']) {
        await addColumn(table, 'created_at', 'TIMESTAMPTZ DEFAULT NOW()');
        await addColumn(table, 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');
    }

    console.log('\n[5/5] Verifying...');
    const result = await client.query(`
        SELECT table_name, COUNT(*) as columns
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('users', 'events', 'locations', 'grade_exams')
        GROUP BY table_name
        ORDER BY table_name;
    `);

    result.rows.forEach(r => {
        console.log(`  ${r.table_name}: ${r.columns} columns`);
    });

    client.release();
    await pool.end();

    console.log('\n✅ RESTORATION COMPLETE!');
    console.log('\nRestart the app container and test www.nadanaloga.com\n');
}

restore().catch(err => {
    console.error('\n❌ ERROR:', err.message);
    process.exit(1);
});
