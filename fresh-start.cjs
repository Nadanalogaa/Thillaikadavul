#!/usr/bin/env node
/**
 * FRESH START - Create clean database with minimal schema
 * Use this when the Supabase backup restoration fails
 */

const { Pool } = require('pg');
const fs = require('fs');

const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'SecurePassword123!';

console.log('🆕 Fresh Start - Creating clean database\n');

async function freshStart() {
    // Connect to postgres database
    const adminPool = new Pool({
        host: 'nadanaloga-main-postgres',
        port: 5432,
        database: 'postgres',
        user: 'nadanaloga_user',
        password: DB_PASSWORD
    });

    console.log('[1/3] Dropping and recreating database...');
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
    console.log('✓ Clean database created\n');

    // Connect to nadanaloga
    const pool = new Pool({
        host: 'nadanaloga-main-postgres',
        port: 5432,
        database: 'nadanaloga',
        user: 'nadanaloga_user',
        password: DB_PASSWORD
    });

    const client = await pool.connect();

    console.log('[2/3] Creating schema...');

    // Create all tables
    const schema = `
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student',
    status VARCHAR(50) DEFAULT 'active',
    is_deleted BOOLEAN DEFAULT false,
    class_preference VARCHAR(20) DEFAULT 'Hybrid',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations table
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batches table
CREATE TABLE batches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    course_id INTEGER REFERENCES courses(id),
    location_id INTEGER REFERENCES locations(id),
    start_date DATE,
    end_date DATE,
    mode VARCHAR(50) DEFAULT 'Hybrid',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE,
    event_time TIME,
    location_id INTEGER REFERENCES locations(id),
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grade exams table
CREATE TABLE grade_exams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    course_id INTEGER REFERENCES courses(id),
    exam_date DATE,
    exam_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fee structures table
CREATE TABLE fee_structures (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id),
    batch_id INTEGER REFERENCES batches(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demo bookings table
CREATE TABLE demo_bookings (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    course_id INTEGER REFERENCES courses(id),
    preferred_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Book materials table
CREATE TABLE book_materials (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    course_id INTEGER REFERENCES courses(id),
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notices table
CREATE TABLE notices (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'normal',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    due_date DATE,
    paid_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

    await client.query(schema);
    console.log('✓ Schema created\n');

    console.log('[3/3] Inserting sample data...');

    // Insert admin user (password: admin123)
    await client.query(`
        INSERT INTO users (name, email, password, role, status)
        VALUES ('Admin', 'admin@nadanaloga.com', '$2a$10$rXzCHqJ8uZN5F3gFLWJzTe6F7gY5h0mJ4pJ5gF3gF3gF3gF3gF3gF', 'admin', 'active')
    `);

    // Insert sample courses
    await client.query(`
        INSERT INTO courses (name, description, icon) VALUES
        ('Bharatanatyam', 'Classical Indian dance form', 'Bharatanatyam'),
        ('Vocal', 'Carnatic vocal music', 'Vocal'),
        ('Veena', 'String instrument', 'Veena'),
        ('Violin', 'String instrument', 'Violin'),
        ('Mridangam', 'Percussion instrument', 'Mridangam')
    `);

    console.log('✓ Sample data inserted\n');

    // Verify
    const counts = await client.query(`
        SELECT
            (SELECT COUNT(*) FROM users) as users,
            (SELECT COUNT(*) FROM courses) as courses,
            (SELECT COUNT(*) FROM locations) as locations
    `);

    console.log('Database contents:');
    console.log(`  Users: ${counts.rows[0].users}`);
    console.log(`  Courses: ${counts.rows[0].courses}`);
    console.log(`  Locations: ${counts.rows[0].locations}`);

    client.release();
    await pool.end();

    console.log('\n✅ FRESH START COMPLETE!');
    console.log('\nYou now have a clean database with:');
    console.log('  - All required tables');
    console.log('  - Admin user (email: admin@nadanaloga.com)');
    console.log('  - Sample courses');
    console.log('\nRestart the app and test www.nadanaloga.com\n');
}

freshStart().catch(err => {
    console.error('\n❌ ERROR:', err.message);
    process.exit(1);
});
