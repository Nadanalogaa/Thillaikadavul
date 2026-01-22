#!/usr/bin/env node
/**
 * CORRECT SCHEMA - Matches actual API endpoints
 * Based on actual INSERT statements in server.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'SecurePassword123!';

console.log('🔧 Creating Correct Schema\n');

async function createCorrectSchema() {
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

    const pool = new Pool({
        host: 'nadanaloga-main-postgres',
        port: 5432,
        database: 'nadanaloga',
        user: 'nadanaloga_user',
        password: DB_PASSWORD
    });

    const client = await pool.connect();

    console.log('[2/3] Creating tables with correct columns...');

    await client.query(`
-- Users table (complete with all fields from API)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student',
    status VARCHAR(50) DEFAULT 'active',
    class_preference VARCHAR(20) DEFAULT 'Hybrid',
    photo_url TEXT,
    dob DATE,
    sex VARCHAR(20),
    contact_number VARCHAR(20),
    address TEXT,
    date_of_joining DATE,
    courses TEXT,
    father_name VARCHAR(255),
    standard VARCHAR(50),
    school_name VARCHAR(255),
    grade VARCHAR(50),
    notes TEXT,
    course_expertise TEXT,
    educational_qualifications TEXT,
    employment_type VARCHAR(50),
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    image TEXT,
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
    batch_name VARCHAR(255) NOT NULL,
    course_id INTEGER REFERENCES courses(id),
    teacher_id INTEGER REFERENCES users(id),
    schedule TEXT,
    start_date DATE,
    end_date DATE,
    max_students INTEGER,
    student_ids INTEGER[],
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
    location VARCHAR(255),
    is_public BOOLEAN DEFAULT false,
    recipient_ids INTEGER[],
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grade exams table
CREATE TABLE grade_exams (
    id SERIAL PRIMARY KEY,
    exam_name VARCHAR(255) NOT NULL,
    course VARCHAR(255),
    exam_date DATE,
    exam_time TIME,
    location VARCHAR(255),
    syllabus TEXT,
    recipient_ids INTEGER[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fee structures table
CREATE TABLE fee_structures (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id),
    mode VARCHAR(50),
    monthly_fee DECIMAL(10,2),
    quarterly_fee DECIMAL(10,2),
    half_yearly_fee DECIMAL(10,2),
    annual_fee DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demo bookings table
CREATE TABLE demo_bookings (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    parent_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    course VARCHAR(255),
    preferred_date DATE,
    preferred_time TIME,
    location VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Book materials table
CREATE TABLE book_materials (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    course VARCHAR(255),
    file_url TEXT,
    file_type VARCHAR(50),
    recipient_ids INTEGER[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notices table
CREATE TABLE notices (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'normal',
    expiry_date DATE,
    recipient_ids INTEGER[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id),
    fee_structure_id INTEGER REFERENCES fee_structures(id),
    course_name VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    issue_date DATE,
    due_date DATE,
    billing_period VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    payment_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event responses table
CREATE TABLE event_responses (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    user_id INTEGER REFERENCES users(id),
    response VARCHAR(50),
    response_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
    `);

    console.log('✓ All tables created\n');

    console.log('[3/3] Inserting sample data...');

    // Insert admin user with properly hashed password (password: admin123)
    const adminPassword = await bcrypt.hash('admin123', 10);
    await client.query(`
        INSERT INTO users (name, email, password, role, status, class_preference)
        VALUES ('Admin', 'admin@nadanaloga.com', $1, 'Admin', 'active', 'Hybrid')
    `, [adminPassword]);

    // Insert sample courses
    await client.query(`
        INSERT INTO courses (name, description, icon) VALUES
        ('Bharatanatyam', 'Classical Indian dance', 'Bharatanatyam'),
        ('Vocal', 'Carnatic vocal music', 'Vocal'),
        ('Veena', 'String instrument', 'Veena'),
        ('Violin', 'String instrument', 'Violin'),
        ('Mridangam', 'Percussion', 'Mridangam')
    `);

    console.log('✓ Sample data inserted\n');

    const result = await client.query(`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name IN ('users', 'grade_exams', 'events', 'locations')
        ORDER BY table_name, ordinal_position
    `);

    console.log('Sample of created columns:');
    let currentTable = '';
    result.rows.forEach(r => {
        if (r.table_name !== currentTable) {
            currentTable = r.table_name;
            console.log(`\n  ${r.table_name}:`);
        }
        console.log(`    - ${r.column_name}`);
    });

    client.release();
    await pool.end();

    console.log('\n✅ CORRECT SCHEMA CREATED!');
    console.log('\nRestart the app and test www.nadanaloga.com\n');
}

createCorrectSchema().catch(err => {
    console.error('\n❌ ERROR:', err.message);
    process.exit(1);
});
