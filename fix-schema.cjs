const { Pool } = require('pg');

const pool = new Pool({
  host: '192.168.0.105',
  port: 5432,
  database: 'nadanaloga',
  user: 'nadanaloga_user',
  password: process.env.POSTGRES_PASSWORD || 'SecurePassword123!'
});

async function fixSchema() {
  const client = await pool.connect();

  try {
    console.log('Starting schema migration...\n');

    // Fix users table
    console.log('Fixing users table...');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS class_preference VARCHAR(20) DEFAULT \'Hybrid\'');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');
    console.log('✓ Users table fixed');

    // Fix events table
    console.log('Fixing events table...');
    await client.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true');
    await client.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false');
    await client.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
    await client.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');
    console.log('✓ Events table fixed');

    // Fix grade_exams table
    console.log('Fixing grade_exams table...');
    await client.query('ALTER TABLE grade_exams ADD COLUMN IF NOT EXISTS exam_date DATE');
    await client.query('ALTER TABLE grade_exams ADD COLUMN IF NOT EXISTS exam_time TIME');
    await client.query('ALTER TABLE grade_exams ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
    await client.query('ALTER TABLE grade_exams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');
    console.log('✓ Grade exams table fixed');

    // Fix locations table
    console.log('Fixing locations table...');
    await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true');
    await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
    await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');
    console.log('✓ Locations table fixed');

    // Add timestamps to other tables
    console.log('Adding timestamps to remaining tables...');
    await client.query('ALTER TABLE batches ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
    await client.query('ALTER TABLE batches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');

    await client.query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
    await client.query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');

    await client.query('ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
    await client.query('ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');

    await client.query('ALTER TABLE demo_bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
    await client.query('ALTER TABLE demo_bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');

    await client.query('ALTER TABLE book_materials ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
    await client.query('ALTER TABLE book_materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');

    await client.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
    await client.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');

    await client.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
    await client.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');
    console.log('✓ Timestamps added to all tables');

    // Verify critical columns
    console.log('\nVerifying schema...');

    const usersCheck = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('is_deleted', 'class_preference') ORDER BY column_name"
    );
    console.log('Users table columns:', usersCheck.rows.map(r => r.column_name).join(', '));

    const eventsCheck = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('is_active', 'is_public') ORDER BY column_name"
    );
    console.log('Events table columns:', eventsCheck.rows.map(r => r.column_name).join(', '));

    const gradeExamsCheck = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'grade_exams' AND column_name IN ('exam_date', 'exam_time') ORDER BY column_name"
    );
    console.log('Grade exams table columns:', gradeExamsCheck.rows.map(r => r.column_name).join(', '));

    console.log('\n✅ Schema migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Go to Portainer (http://192.168.0.105:9000)');
    console.log('2. Go to Containers → nadanaloga-main-app');
    console.log('3. Click the restart icon');
    console.log('4. Wait for container to restart');
    console.log('5. Test www.nadanaloga.com');

  } catch (error) {
    console.error('Error during migration:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchema();
