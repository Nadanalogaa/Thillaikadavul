const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'nadanaloga',
  user: 'nadanaloga_user',
  password: process.env.POSTGRES_PASSWORD || 'SecurePassword123!'
});

async function checkSchema() {
  try {
    console.log('Checking users table schema...\n');

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('Users table columns:');
    console.table(result.rows);

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
