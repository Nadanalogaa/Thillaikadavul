const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const path = require('path');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// --- Main application startup ---
async function startServer() {
    console.log(`[Server] Node environment (NODE_ENV): ${process.env.NODE_ENV || 'not set (defaults to development)'}`);

    // --- PostgreSQL Connection ---
    let dbConfig;
    if (process.env.DATABASE_URL) {
        dbConfig = {
            connectionString: process.env.DATABASE_URL,
            ssl: false  // No SSL for local PostgreSQL
        };
    } else {
        console.error('[DB] DATABASE_URL environment variable is not set!');
        process.exit(1);
    }
    
    const pool = new Pool(dbConfig);
    
    try {
        await pool.query('SELECT NOW()');
        console.log('[DB] PostgreSQL connected successfully.');
    } catch (err) {
        console.error('[DB] PostgreSQL connection error:', err);
        process.exit(1);
    }

    // --- Auto Schema Migration ---
    const autoMigrateSchema = async () => {
        // Use a SINGLE client for entire migration to ensure consistency
        const client = await pool.connect();

        try {
            console.log('[DB] Running auto schema migration...');

            // Check current schema and show actual users table columns
            const schemaCheck = await client.query('SELECT current_schema()');
            console.log('[DB] Current schema:', schemaCheck.rows[0].current_schema);

            // Check if users is a table or view
            const tableType = await client.query(`
                SELECT table_type FROM information_schema.tables
                WHERE table_name = 'users' AND table_schema = current_schema()
            `);
            console.log('[DB] users is a:', tableType.rows[0]?.table_type || 'NOT FOUND');

            // Get columns using pg_catalog (more reliable than information_schema)
            const directColumns = await client.query(`
                SELECT a.attname as column_name
                FROM pg_catalog.pg_attribute a
                JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
                JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
                WHERE c.relname = 'users' AND n.nspname = current_schema()
                AND a.attnum > 0 AND NOT a.attisdropped
                ORDER BY a.attnum
            `);
            console.log('[DB] Direct pg_catalog columns:', directColumns.rows.map(r => r.column_name).join(', '));

            const addColumn = async (table, column, definition) => {
                try {
                    // Use IF NOT EXISTS - PostgreSQL's native solution (9.6+)
                    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
                    console.log(`[DB] ✓ Ensured ${table}.${column} exists`);
                    return true;
                } catch (error) {
                    console.error(`[DB] ✗ Failed to add ${table}.${column}:`, error.message);
                    return false;
                }
            };

        let successCount = 0;
        let failCount = 0;

        // Fix users table
        if (await addColumn('users', 'is_deleted', 'BOOLEAN DEFAULT false')) successCount++; else failCount++;
        if (await addColumn('users', 'class_preference', "VARCHAR(20) DEFAULT 'Hybrid'")) successCount++; else failCount++;
        if (await addColumn('users', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('users', 'user_id', 'VARCHAR(20) UNIQUE')) successCount++; else failCount++;
        if (await addColumn('users', 'is_super_admin', 'BOOLEAN DEFAULT false')) successCount++; else failCount++;
        if (await addColumn('users', 'preferred_location_id', 'INTEGER REFERENCES locations(id)')) successCount++; else failCount++;

        // Ensure primary admin is super admin
        await client.query(`UPDATE users SET is_super_admin = true WHERE email = 'admin@nadanaloga.com'`);
        console.log('[DB] ✓ Ensured admin@nadanaloga.com is super admin');

        // IMMEDIATE CHECK: Verify updated_at was actually added
        console.log('[DB] IMMEDIATE CHECK after adding users.updated_at:');
        const immediateCheck = await client.query(`
            SELECT a.attname as column_name
            FROM pg_catalog.pg_attribute a
            JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
            JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relname = 'users' AND n.nspname = current_schema()
            AND a.attname = 'updated_at'
            AND a.attnum > 0 AND NOT a.attisdropped
        `);
        console.log('[DB] Found updated_at:', immediateCheck.rows.length > 0 ? 'YES' : 'NO');
        if (immediateCheck.rows.length === 0) {
            console.log('[DB] ⚠️ WARNING: ALTER TABLE succeeded but column not in catalog!');
            console.log('[DB] Attempting manual check with \\d users equivalent:');
            const describeTable = await client.query(`
                SELECT column_name, data_type, column_default
                FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'updated_at'
            `);
            console.log('[DB] information_schema result:', describeTable.rows);
        }

        // Fix events table
        if (await addColumn('events', 'is_active', 'BOOLEAN DEFAULT true')) successCount++; else failCount++;
        if (await addColumn('events', 'is_public', 'BOOLEAN DEFAULT false')) successCount++; else failCount++;
        if (await addColumn('events', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('events', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;

        // Fix grade_exams table
        if (await addColumn('grade_exams', 'exam_date', 'DATE')) successCount++; else failCount++;
        if (await addColumn('grade_exams', 'exam_time', 'TIME')) successCount++; else failCount++;
        if (await addColumn('grade_exams', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('grade_exams', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;

        // Fix locations table
        if (await addColumn('locations', 'is_active', 'BOOLEAN DEFAULT true')) successCount++; else failCount++;
        if (await addColumn('locations', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('locations', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;

        // Add location_id to batches (link batches to branches)
        if (await addColumn('batches', 'location_id', 'INTEGER REFERENCES locations(id)')) successCount++; else failCount++;

        // Add timestamps to other tables
        if (await addColumn('batches', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('batches', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('courses', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('courses', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('fee_structures', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('fee_structures', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('demo_bookings', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('demo_bookings', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('book_materials', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('book_materials', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('notices', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('notices', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('invoices', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('invoices', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;

            // Create user_fcm_tokens table if not exists
            try {
                await client.query(`
                    CREATE TABLE IF NOT EXISTS user_fcm_tokens (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        fcm_token TEXT NOT NULL,
                        device_type VARCHAR(20),
                        is_active BOOLEAN DEFAULT true,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        UNIQUE(user_id, fcm_token)
                    )
                `);
                console.log('[DB] ✓ Ensured user_fcm_tokens table exists');
            } catch (error) {
                console.error('[DB] ✗ Failed to create user_fcm_tokens table:', error.message);
            }

            // Create salaries table if not exists
            try {
                await client.query(`
                    CREATE TABLE IF NOT EXISTS salaries (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        role VARCHAR(50),
                        base_salary DECIMAL(10,2),
                        payment_frequency VARCHAR(50) DEFAULT 'Monthly',
                        bank_account_name VARCHAR(255),
                        bank_account_number VARCHAR(50),
                        bank_ifsc VARCHAR(20),
                        upi_id VARCHAR(255),
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    )
                `);
                console.log('[DB] ✓ Ensured salaries table exists');
            } catch (error) {
                console.error('[DB] ✗ Failed to create salaries table:', error.message);
            }

            // Create salary_payments table if not exists
            try {
                await client.query(`
                    CREATE TABLE IF NOT EXISTS salary_payments (
                        id SERIAL PRIMARY KEY,
                        salary_id INTEGER REFERENCES salaries(id) ON DELETE CASCADE,
                        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        amount DECIMAL(10,2),
                        payment_date DATE,
                        payment_method VARCHAR(50),
                        transaction_id VARCHAR(255),
                        payment_period VARCHAR(100),
                        notes TEXT,
                        status VARCHAR(50) DEFAULT 'paid',
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    )
                `);
                console.log('[DB] ✓ Ensured salary_payments table exists');
            } catch (error) {
                console.error('[DB] ✗ Failed to create salary_payments table:', error.message);
            }

            // Create notifications table if not exists
            try {
                await client.query(`
                    CREATE TABLE IF NOT EXISTS notifications (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        title VARCHAR(255) NOT NULL,
                        message TEXT,
                        type VARCHAR(50) DEFAULT 'info',
                        is_read BOOLEAN DEFAULT false,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    )
                `);
                console.log('[DB] ✓ Ensured notifications table exists');
            } catch (error) {
                console.error('[DB] ✗ Failed to create notifications table:', error.message);
            }

            // Create event_notifications table if not exists
            try {
                await client.query(`
                    CREATE TABLE IF NOT EXISTS event_notifications (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
                        is_read BOOLEAN DEFAULT false,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )
                `);
                console.log('[DB] ✓ Ensured event_notifications table exists');
            } catch (error) {
                console.error('[DB] ✗ Failed to create event_notifications table:', error.message);
            }

            // Fix events FK constraints that might block user deletion
            try {
                // Drop the constraint if it exists (safe even if it doesn't)
                await client.query(`
                    ALTER TABLE IF EXISTS events
                    DROP CONSTRAINT IF EXISTS events_created_by_fkey
                `);
                // Only re-add if the created_by column actually exists
                const colCheck = await client.query(`
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'events' AND column_name = 'created_by'
                `);
                if (colCheck.rows.length > 0) {
                    await client.query(`
                        ALTER TABLE IF EXISTS events
                        ADD CONSTRAINT events_created_by_fkey
                        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                    `);
                    console.log('[DB] ✓ Fixed events_created_by_fkey to ON DELETE SET NULL');
                } else {
                    console.log('[DB] ✓ events.created_by column not present, no FK fix needed');
                }
            } catch (error) {
                console.error('[DB] ✗ Failed to fix events FK:', error.message);
            }

            // Create user_id sequence and backfill existing users
            try {
                await client.query(`CREATE SEQUENCE IF NOT EXISTS user_id_seq START WITH 1`);
                console.log('[DB] ✓ Ensured user_id_seq sequence exists');

                // Backfill user_id for any users that don't have one
                const usersWithoutId = await client.query(
                    `SELECT id FROM users WHERE user_id IS NULL ORDER BY id`
                );
                if (usersWithoutId.rows.length > 0) {
                    console.log(`[DB] Backfilling user_id for ${usersWithoutId.rows.length} users...`);
                    const year = new Date().getFullYear();
                    for (const row of usersWithoutId.rows) {
                        const seqVal = await client.query(`SELECT nextval('user_id_seq') as seq`);
                        const userId = `NDA-${year}-${String(seqVal.rows[0].seq).padStart(4, '0')}`;
                        await client.query(
                            `UPDATE users SET user_id = $1 WHERE id = $2`,
                            [userId, row.id]
                        );
                    }
                    console.log(`[DB] ✓ Backfilled user_id for ${usersWithoutId.rows.length} users`);
                }
            } catch (error) {
                console.error('[DB] ✗ Failed to setup user_id sequence:', error.message);
            }

            console.log(`[DB] ✅ Schema migration completed! Success: ${successCount}, Failed: ${failCount}`);

            // Verify final state - show users table columns after migration
            console.log('[DB] FINAL VERIFICATION - Querying users columns after migration:');
            const finalColumns = await client.query(`
                SELECT a.attname as column_name
                FROM pg_catalog.pg_attribute a
                JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
                JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
                WHERE c.relname = 'users' AND n.nspname = current_schema()
                AND a.attnum > 0 AND NOT a.attisdropped
                ORDER BY a.attnum
            `);
            console.log('[DB] Final users columns:', finalColumns.rows.map(r => r.column_name).join(', '));

            // Check specifically for updated_at
            const hasUpdatedAt = finalColumns.rows.some(r => r.column_name === 'updated_at');
            console.log(`[DB] users.updated_at exists: ${hasUpdatedAt ? '✓ YES' : '✗ NO'}`);

        } catch (error) {
            console.error('[DB] Migration error:', error);
            throw error;
        } finally {
            client.release();
        }
    };

    // Run auto-migration
    await autoMigrateSchema();

    // --- Database Seeding Function ---
    const seedCourses = async () => {
        try {
            const courseCountResult = await pool.query('SELECT COUNT(*) FROM courses');
            const courseCount = parseInt(courseCountResult.rows[0].count);
            
            if (courseCount === 0) {
                console.log('[DB] No courses found. Seeding initial courses...');
                const initialCourses = [
                    { name: 'Bharatanatyam', description: 'Explore the grace and storytelling of classical Indian dance.', icon: 'Bharatanatyam' },
                    { name: 'Vocal', description: 'Develop your singing voice with professional training techniques.', icon: 'Vocal' },
                    { name: 'Drawing', description: 'Learn to express your creativity through sketching and painting.', icon: 'Drawing' },
                    { name: 'Abacus', description: 'Enhance mental math skills and concentration with our abacus program.', icon: 'Abacus' }
                ];
                
                for (const course of initialCourses) {
                    await pool.query(
                        'INSERT INTO courses (name, description, icon) VALUES ($1, $2, $3)',
                        [course.name, course.description, course.icon]
                    );
                }
                console.log('[DB] Courses seeded successfully.');
            }
        } catch (error) {
            console.error('[DB] Error seeding courses:', error);
        }
    };

    // Skip database seeding if tables don't exist (empty database)
    // This allows the app to start without requiring database import
    // Database seeding will be handled after manual import
    console.log('[DB] Skipping course seeding - will be handled after database import');

    // --- Email Template ---
    const createEmailTemplate = (name, subject, message) => {
        const year = new Date().getFullYear();
        const logoUrl = 'https://nadanaloga.com/static/media/nadanaloga.7f9472b3c071a833076a.png';
        const brandColorDark = '#333333';
        const backgroundColor = '#f4f5f7';
        const contentBackgroundColor = '#ffffff';
        const primaryTextColor = '#333333';
        const secondaryTextColor = '#555555';

        return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
            body { margin: 0; padding: 0; word-spacing: normal; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table, td, div, h1, p { font-family: 'Poppins', Arial, sans-serif; }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${backgroundColor};">
        <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
            <tr>
                <td align="center" style="padding:20px;">
                    <table role="presentation" style="max-width:602px;width:100%;border-collapse:collapse;border:1px solid #cccccc;border-spacing:0;text-align:left;background:${contentBackgroundColor};border-radius:8px;overflow:hidden;">
                        <tr>
                            <td align="center" style="padding:25px 0;border-bottom: 1px solid #eeeeee;">
                                <img src="${logoUrl}" alt="Nadanaloga Logo" width="250" style="height:auto;display:block;" />
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:36px 30px 42px 30px;">
                                <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
                                    <tr>
                                        <td style="padding:0 0 20px 0;">
                                            <h1 style="font-size:24px;margin:0;font-weight:700;color:${primaryTextColor};">${subject}</h1>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:0;">
                                            <p style="margin:0 0 12px 0;font-size:16px;line-height:24px;color:${secondaryTextColor};">Dear ${name},</p>
                                            <div style="font-size:16px;line-height:24px;color:${secondaryTextColor};">${message.replace(/\n/g, '<br>')}</div>
                                        </td>
                                    </tr>
                                    <tr>
                                       <td style="padding:30px 0 0 0;">
                                           <p style="margin:0;font-size:16px;line-height:24px;color:${secondaryTextColor};">Sincerely,</p>
                                           <p style="margin:0;font-size:16px;line-height:24px;color:${secondaryTextColor};">The Nadanaloga Team</p>
                                       </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:30px;background:${brandColorDark};">
                                <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;font-size:14px;color:#ffffff;">
                                    <tr>
                                        <td style="padding:0;width:50%;" align="left">
                                            <p style="margin:0;font-family:'Poppins', Arial, sans-serif;">&copy; ${year} Nadanaloga.com</p>
                                        </td>
                                        <td style="padding:0;width:50%;" align="right">
                                            <p style="margin:0;font-family:'Poppins', Arial, sans-serif;">contact@nadanaloga.com</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
        `;
    };

    // --- Nodemailer Transport ---
    let mailTransporter;
    let isEtherealMode = false;
    let smtpConfigInfo = {};
    try {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            isEtherealMode = true;
            smtpConfigInfo = { mode: 'ethereal', host: 'ethereal', user: 'test', passSet: false };
            console.log('\\n--- EMAIL IS IN TEST MODE ---');
            console.log('[Email] WARNING: SMTP environment variables are missing');
            console.log('[Email] Missing:', [
                !process.env.SMTP_HOST && 'SMTP_HOST',
                !process.env.SMTP_USER && 'SMTP_USER',
                !process.env.SMTP_PASS && 'SMTP_PASS'
            ].filter(Boolean).join(', '));
            console.log('[Email] Using Ethereal for testing - NO REAL EMAILS WILL BE SENT');
            console.log('-------------------------------------\\n');

            const testAccount = await nodemailer.createTestAccount();
            mailTransporter = nodemailer.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: { user: testAccount.user, pass: testAccount.pass },
            });
        } else {
            const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
            const smtpUser = process.env.SMTP_USER;
            const smtpPass = process.env.SMTP_PASS;
            const maskedUser = smtpUser.length > 4 ? smtpUser.substring(0, 4) + '***' : '***';
            const maskedPass = smtpPass.length > 8 ? smtpPass.substring(0, 8) + '***' : '***';

            smtpConfigInfo = {
                mode: 'live',
                host: process.env.SMTP_HOST,
                port: smtpPort,
                user: maskedUser,
                passSet: true,
                passLength: smtpPass.length,
                fromEmail: process.env.SMTP_FROM_EMAIL || smtpUser
            };

            console.log('\\n--- EMAIL CONFIGURATION ---');
            console.log(`[Email] Host: ${process.env.SMTP_HOST}`);
            console.log(`[Email] Port: ${smtpPort}`);
            console.log(`[Email] User: ${maskedUser}`);
            console.log(`[Email] Pass: ${maskedPass} (length: ${smtpPass.length})`);
            console.log(`[Email] From: ${process.env.SMTP_FROM_EMAIL || smtpUser}`);

            mailTransporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: { user: smtpUser, pass: smtpPass },
                requireTLS: smtpPort === 587,
            });

            await mailTransporter.verify();
            smtpConfigInfo.verified = true;
            console.log('[Email] SMTP connection verified successfully.');
            console.log('-----------------------------\\n');
        }
    } catch (error) {
        smtpConfigInfo.verified = false;
        smtpConfigInfo.error = error.message;
        // Reset transporter so emails don't silently fail
        mailTransporter = null;
        isEtherealMode = true;
        console.error('\\n--- EMAIL CONFIGURATION FAILED ---');
        console.error('[Email] Could not connect to SMTP server.');
        console.error(`[Email] Host: ${process.env.SMTP_HOST}`);
        console.error(`[Email] User: ${process.env.SMTP_USER}`);
        console.error(`[Email] Error: ${error.message}`);
        console.error('[Email] Emails will be disabled until SMTP is fixed.');
        console.error('--------------------------------------\\n');
    }

    const app = express();
    
    // --- Middleware ---
    // Trust first proxy (nginx) so secure cookies work behind reverse proxy
    app.set('trust proxy', 1);
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    const whitelist = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
    ];
    if (process.env.CLIENT_URL) {
        whitelist.push(process.env.CLIENT_URL);
    }
    const corsOptions = { origin: whitelist, credentials: true };
    app.use(cors(corsOptions));
    
    // --- Session Management ---
    app.use(session({
        secret: process.env.SESSION_SECRET || 'a-secure-secret-key',
        resave: false,
        saveUninitialized: false,
        store: new pgSession({
            pool: pool,
            tableName: 'session',
            createTableIfMissing: true,
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 1 day
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        }
    }));

    const ensureAuthenticated = (req, res, next) => {
        if (req.session.user) return next();
        res.status(401).json({ message: 'Unauthorized' });
    };

    const ensureAdmin = (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).json({ message: 'Unauthorized: You must be logged in to perform this action.' });
        }
        if (req.session.user.role && req.session.user.role.toLowerCase() === 'admin') {
            return next();
        }
        res.status(403).json({ message: 'Forbidden: Administrative privileges required.' });
    };

    const ensureSuperAdmin = (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).json({ message: 'Unauthorized: You must be logged in to perform this action.' });
        }
        if (req.session.user.is_super_admin === true) {
            return next();
        }
        res.status(403).json({ message: 'Forbidden: Super Admin privileges required.' });
    };

    // Health check endpoint
    app.get('/api/health', (req, res) => {
        res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // Check if email exists (for registration validation)
    app.post('/api/check-email', async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ message: 'Email is required.' });
            }

            const normalizedEmail = email.toLowerCase().trim();
            const result = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND is_deleted = false LIMIT 1',
                [normalizedEmail]
            );

            res.json({ exists: result.rows.length > 0 });
        } catch (error) {
            console.error('Error checking email:', error);
            res.status(500).json({ message: 'Server error checking email.' });
        }
    });

    // --- API Routes ---
    app.post('/api/register', async (req, res) => {
        try {
            const { password, ...userData } = req.body;
            if (!userData.email) return res.status(400).json({ message: 'Email is required.' });
            
            const normalizedEmail = userData.email.toLowerCase();
            
            const existingUserResult = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
            if (existingUserResult.rows.length > 0) {
                return res.status(409).json({ message: 'This email is already registered. Please try logging in.' });
            }
            
            if (normalizedEmail === 'admin@nadanaloga.com') {
                userData.role = 'Admin';
            }
            if (!password) return res.status(400).json({ message: 'Password is required.' });
            
            const hashedPassword = await bcrypt.hash(password, 10);

            // Generate user_id (NDA-YYYY-XXXX)
            const year = new Date().getFullYear();
            const seqResult = await pool.query(`SELECT nextval('user_id_seq') as seq`);
            const generatedUserId = `NDA-${year}-${String(seqResult.rows[0].seq).padStart(4, '0')}`;

            const result = await pool.query(
                'INSERT INTO users (name, email, password, role, class_preference, photo_url, dob, sex, contact_number, address, date_of_joining, courses, father_name, standard, school_name, grade, notes, course_expertise, educational_qualifications, employment_type, user_id, preferred_location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) RETURNING *',
                [
                    userData.name, normalizedEmail, hashedPassword, userData.role || 'Student',
                    userData.class_preference || userData.classPreference,
                    userData.photo_url || userData.photoUrl,
                    userData.dob, userData.sex,
                    userData.contact_number || userData.contactNumber,
                    userData.address,
                    userData.date_of_joining || userData.dateOfJoining,
                    JSON.stringify(userData.courses || []),
                    userData.father_name || userData.fatherName,
                    userData.standard,
                    userData.school_name || userData.schoolName,
                    userData.grade, userData.notes,
                    JSON.stringify(userData.course_expertise || userData.courseExpertise || []),
                    userData.educational_qualifications || userData.educationalQualifications,
                    userData.employment_type || userData.employmentType,
                    generatedUserId,
                    userData.preferred_location_id || userData.preferredLocationId || null
                ]
            );

            // Parse JSON fields before returning
            const newUser = result.rows[0];

            // Set super admin for primary admin email
            if (normalizedEmail === 'admin@nadanaloga.com') {
                await pool.query('UPDATE users SET is_super_admin = true WHERE id = $1', [newUser.id]);
                newUser.is_super_admin = true;
            }

            const parsedUser = {
                ...newUser,
                courses: typeof newUser.courses === 'string' ? JSON.parse(newUser.courses || '[]') : (newUser.courses || []),
                course_expertise: typeof newUser.course_expertise === 'string' ? JSON.parse(newUser.course_expertise || '[]') : (newUser.course_expertise || [])
            };
            delete parsedUser.password;

            // Create in-app notifications server-side
            try {
                // Notification for the new user
                await pool.query(
                    `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
                    [newUser.id, 'Welcome to Nadanaloga Academy!', `Registration successful for ${userData.name}. Your application is being reviewed by our admin team.`, 'registration']
                );

                // Notification for admin(s)
                const admins = await pool.query(`SELECT id FROM users WHERE role = 'Admin' AND is_deleted = false`);
                for (const admin of admins.rows) {
                    await pool.query(
                        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
                        [admin.id, 'New Student Registration', `New student ${userData.name} (${normalizedEmail}) has registered. Please review their application.`, 'registration']
                    );
                }
            } catch (notifError) {
                console.error('Error creating registration notifications:', notifError.message);
            }

            res.status(201).json(parsedUser);
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Server error during registration.' });
        }
    });

    app.post('/api/login', async (req, res) => {
        try {
            const { email, password, identifier } = req.body;
            // Support login by email or userId (identifier field)
            // identifier takes priority; falls back to email for backward compatibility
            const loginId = identifier || email;
            if (!loginId || !password) {
                return res.status(400).json({ message: 'Email/User ID and password are required.' });
            }

            let result;
            if (loginId.toUpperCase().startsWith('NDA-')) {
                // Login by user_id
                result = await pool.query('SELECT * FROM users WHERE user_id = $1 AND is_deleted = false', [loginId.toUpperCase()]);
            } else {
                // Login by email
                result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_deleted = false', [loginId.toLowerCase()]);
            }

            if (result.rows.length === 0) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }

            const user = result.rows[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

            delete user.password;

            // Normalize role to title case (e.g., 'admin' → 'Admin')
            if (user.role) {
                user.role = user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase();
            }

            // Parse JSON fields before returning
            const parsedUser = {
                ...user,
                courses: typeof user.courses === 'string' ? JSON.parse(user.courses || '[]') : (user.courses || []),
                course_expertise: typeof user.course_expertise === 'string' ? JSON.parse(user.course_expertise || '[]') : (user.course_expertise || [])
            };

            req.session.user = parsedUser;
            res.json(parsedUser);
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Server error during login.' });
        }
    });

    app.get('/api/session', (req, res) => {
        if (req.session.user) res.json(req.session.user);
        else res.status(401).json(null);
    });

    app.post('/api/logout', (req, res) => {
        if (!req.session) {
            res.clearCookie('connect.sid');
            return res.status(200).json({ message: 'Logout successful' });
        }
        req.session.destroy(err => {
            if (err) {
                // Still clear the cookie even if session destroy fails
                res.clearCookie('connect.sid');
                return res.status(200).json({ message: 'Logout successful' });
            }
            res.clearCookie('connect.sid');
            res.status(200).json({ message: 'Logout successful' });
        });
    });

    app.post('/api/contact', async (req, res) => {
        try {
            const { name, email, message } = req.body;
            await pool.query(
                'INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3)',
                [name, email, message]
            );
            res.status(200).json({ success: true });
        } catch (error) {
            res.status(500).json({ message: 'Failed to submit message.' });
        }
    });

    app.get('/api/courses', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM courses');
            res.json(result.rows);
        } catch (error) {
            res.status(500).json({ message: 'Server error fetching courses.' });
        }
    });

    app.get('/api/locations', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM locations WHERE is_active = true ORDER BY created_at');
            res.json(result.rows);
        } catch (error) {
            res.status(500).json({ message: 'Server error fetching locations.' });
        }
    });

    // --- Email API Endpoints ---
    // Registration notification endpoint (doesn't require users table)
    app.post('/api/send-registration-emails', async (req, res) => {
        try {
            const { userName, userEmail, courses, contactNumber, fatherName, standard, schoolName, address, dateOfJoining, notes } = req.body;

            if (!userEmail || !userName) {
                return res.status(400).json({ message: 'User email and name are required.' });
            }

            console.log('[DEBUG] Sending registration emails for:', userEmail);

            if (!mailTransporter) {
                console.log('[Email] SMTP not configured - emails disabled. Would send to:', userEmail);
                return res.status(200).json({
                    success: false,
                    message: 'SMTP not configured - emails are disabled. Check SMTP_HOST, SMTP_USER, SMTP_PASS environment variables.',
                    testMode: true
                });
            }

            let emailsSent = 0;
            const emailErrors = [];

            // Send welcome email to user
            try {
                const coursesList = courses && courses.length > 0
                    ? courses.join(', ')
                    : 'No specific courses selected';

                const welcomeMessage = `Thank you for registering with Nadanaloga Academy!

Your registration has been successfully submitted with the following details:

👤 Name: ${userName}
📧 Email: ${userEmail}
📚 Courses of Interest: ${coursesList}
📞 Contact: ${contactNumber || 'Not provided'}

What happens next?
✅ Our admin team will review your application
✅ You'll receive a confirmation email once approved
✅ We'll contact you to discuss class schedules and batch allocation

If you have any questions, feel free to contact us at nadanalogaa@gmail.com.

Welcome to the Nadanaloga family!`;

                const userMailOptions = {
                    from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
                    to: userEmail,
                    subject: 'Welcome to Nadanaloga Academy!',
                    html: createEmailTemplate(userName, 'Welcome to Nadanaloga Academy!', welcomeMessage)
                };

                await mailTransporter.sendMail(userMailOptions);
                console.log(`📧 Welcome email sent to: ${userEmail}`);
                emailsSent++;
            } catch (emailError) {
                console.error('Error sending welcome email:', emailError.message);
                emailErrors.push(`Welcome email: ${emailError.message}`);
            }

            // Send notification email to admin
            try {
                const adminMessage = `A new student has registered on Nadanaloga Academy:

👤 Name: ${userName}
📧 Email: ${userEmail}
📞 Contact: ${contactNumber || 'Not provided'}
📚 Courses of Interest: ${courses && courses.length > 0 ? courses.join(', ') : 'No specific courses selected'}
👨‍👩‍👧‍👦 Father's Name: ${fatherName || 'Not provided'}
🎓 Standard/Class: ${standard || 'Not provided'}
🏫 School: ${schoolName || 'Not provided'}
📍 Address: ${address || 'Not provided'}
📅 Date of Joining: ${dateOfJoining || 'Not provided'}
📝 Notes: ${notes || 'None'}

Please review and approve this registration in the admin panel.`;

                const adminMailOptions = {
                    from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
                    to: 'nadanalogaa@gmail.com',
                    subject: 'New Student Registration - Nadanaloga Academy',
                    html: createEmailTemplate('Admin', 'New Student Registration', adminMessage)
                };

                await mailTransporter.sendMail(adminMailOptions);
                console.log('📧 Admin notification email sent');
                emailsSent++;
            } catch (emailError) {
                console.error('Error sending admin notification email:', emailError.message);
                emailErrors.push(`Admin email: ${emailError.message}`);
            }

            res.status(200).json({
                success: emailsSent > 0,
                message: emailsSent > 0
                    ? `${emailsSent} registration email(s) sent successfully`
                    : 'Failed to send registration emails',
                emailsSent,
                errors: emailErrors.length > 0 ? emailErrors : undefined
            });
        } catch (error) {
            console.error('Registration email error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send registration emails',
                error: error.message
            });
        }
    });

    // Batch Allocation Email Notification
    app.post('/api/send-batch-allocation-email', async (req, res) => {
        try {
            const { studentName, studentEmail, batchName, courseName, teacherName, schedule, location, startDate } = req.body;

            if (!studentEmail || !studentName || !batchName) {
                return res.status(400).json({ message: 'Student email, name, and batch name are required.' });
            }

            console.log('[DEBUG] Sending batch allocation email to:', studentEmail);

            if (!mailTransporter) {
                return res.status(200).json({ success: true, message: 'Email sent (test mode)' });
            }

            const batchMessage = `Congratulations! You have been allocated to a new batch.

📚 Course: ${courseName || 'Not specified'}
👥 Batch Name: ${batchName}
👨‍🏫 Teacher: ${teacherName || 'To be assigned'}
📅 Schedule: ${schedule || 'To be confirmed'}
📍 Location: ${location || 'Online/To be confirmed'}
🚀 Start Date: ${startDate || 'To be announced'}

Please log in to your student portal for more details and to access your learning materials.

Best regards,
Nadanaloga Academy Team`;

            const mailOptions = {
                from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
                to: studentEmail,
                subject: `Batch Allocation Confirmed - ${courseName || 'Course'}`,
                html: createEmailTemplate(studentName, 'Batch Allocation Confirmed', batchMessage)
            };

            await mailTransporter.sendMail(mailOptions);
            console.log(`📧 Batch allocation email sent to: ${studentEmail}`);

            res.status(200).json({ success: true, message: 'Batch allocation email sent successfully' });
        } catch (error) {
            console.error('Batch allocation email error:', error);
            res.status(500).json({ success: false, message: 'Failed to send batch allocation email', error: error.message });
        }
    });

    // Grade Exam Result Email Notification
    app.post('/api/send-grade-exam-email', async (req, res) => {
        try {
            const { studentName, studentEmail, examName, courseName, grade, score, feedback, date } = req.body;

            if (!studentEmail || !studentName || !examName) {
                return res.status(400).json({ message: 'Student email, name, and exam name are required.' });
            }

            console.log('[DEBUG] Sending grade exam email to:', studentEmail);

            if (!mailTransporter) {
                return res.status(200).json({ success: true, message: 'Email sent (test mode)' });
            }

            const gradeMessage = `Your exam results are now available!

📋 Exam: ${examName}
📚 Course: ${courseName || 'Not specified'}
📅 Date: ${date || 'Not specified'}
⭐ Grade: ${grade || 'Not specified'}
📊 Score: ${score || 'Not specified'}

${feedback ? `📝 Teacher Feedback:\n${feedback}` : ''}

Keep up the great work! Log in to your student portal to view detailed results.

Best regards,
Nadanaloga Academy Team`;

            const mailOptions = {
                from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
                to: studentEmail,
                subject: `Exam Results Available - ${examName}`,
                html: createEmailTemplate(studentName, 'Exam Results Available', gradeMessage)
            };

            await mailTransporter.sendMail(mailOptions);
            console.log(`📧 Grade exam email sent to: ${studentEmail}`);

            res.status(200).json({ success: true, message: 'Grade exam email sent successfully' });
        } catch (error) {
            console.error('Grade exam email error:', error);
            res.status(500).json({ success: false, message: 'Failed to send grade exam email', error: error.message });
        }
    });

    // Book Materials Email Notification
    app.post('/api/send-book-materials-email', async (req, res) => {
        try {
            const { studentName, studentEmail, materialTitle, courseName, description, downloadLink, sharedBy } = req.body;

            if (!studentEmail || !studentName || !materialTitle) {
                return res.status(400).json({ message: 'Student email, name, and material title are required.' });
            }

            console.log('[DEBUG] Sending book materials email to:', studentEmail);

            if (!mailTransporter) {
                return res.status(200).json({ success: true, message: 'Email sent (test mode)' });
            }

            const materialsMessage = `New study material has been shared with you!

📖 Material: ${materialTitle}
📚 Course: ${courseName || 'General'}
👨‍🏫 Shared by: ${sharedBy || 'Your teacher'}

${description ? `📝 Description:\n${description}` : ''}

${downloadLink ? `🔗 Download Link: ${downloadLink}` : 'Please log in to your student portal to access the material.'}

Happy learning!

Best regards,
Nadanaloga Academy Team`;

            const mailOptions = {
                from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
                to: studentEmail,
                subject: `New Study Material - ${materialTitle}`,
                html: createEmailTemplate(studentName, 'New Study Material Available', materialsMessage)
            };

            await mailTransporter.sendMail(mailOptions);
            console.log(`📧 Book materials email sent to: ${studentEmail}`);

            res.status(200).json({ success: true, message: 'Book materials email sent successfully' });
        } catch (error) {
            console.error('Book materials email error:', error);
            res.status(500).json({ success: false, message: 'Failed to send book materials email', error: error.message });
        }
    });

    // Events Email Notification
    app.post('/api/send-event-email', async (req, res) => {
        try {
            const { studentName, studentEmail, eventTitle, eventDescription, eventDate, eventTime, location, registrationRequired } = req.body;

            if (!studentEmail || !studentName || !eventTitle) {
                return res.status(400).json({ message: 'Student email, name, and event title are required.' });
            }

            console.log('[DEBUG] Sending event email to:', studentEmail);

            if (!mailTransporter) {
                return res.status(200).json({ success: true, message: 'Email sent (test mode)' });
            }

            const eventMessage = `You're invited to an upcoming event!

🎉 Event: ${eventTitle}
📅 Date: ${eventDate || 'To be announced'}
🕐 Time: ${eventTime || 'To be announced'}
📍 Location: ${location || 'To be announced'}

${eventDescription ? `📝 Description:\n${eventDescription}` : ''}

${registrationRequired ? '⚠️ Registration required. Please log in to your portal to register.' : 'No registration required. Just show up!'}

We look forward to seeing you there!

Best regards,
Nadanaloga Academy Team`;

            const mailOptions = {
                from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
                to: studentEmail,
                subject: `Event Invitation - ${eventTitle}`,
                html: createEmailTemplate(studentName, 'Event Invitation', eventMessage)
            };

            await mailTransporter.sendMail(mailOptions);
            console.log(`📧 Event email sent to: ${studentEmail}`);

            res.status(200).json({ success: true, message: 'Event email sent successfully' });
        } catch (error) {
            console.error('Event email error:', error);
            res.status(500).json({ success: false, message: 'Failed to send event email', error: error.message });
        }
    });

    // Notice Email Notification
    app.post('/api/send-notice-email', async (req, res) => {
        try {
            const { studentName, studentEmail, noticeTitle, noticeContent, priority, expiryDate, issuedBy } = req.body;

            if (!studentEmail || !studentName || !noticeTitle) {
                return res.status(400).json({ message: 'Student email, name, and notice title are required.' });
            }

            console.log('[DEBUG] Sending notice email to:', studentEmail);

            if (!mailTransporter) {
                return res.status(200).json({ success: true, message: 'Email sent (test mode)' });
            }

            const priorityEmoji = priority === 'high' ? '🚨' : priority === 'medium' ? '⚠️' : 'ℹ️';

            const noticeMessage = `${priorityEmoji} Important Notice

📢 ${noticeTitle}

${noticeContent}

${issuedBy ? `📝 Issued by: ${issuedBy}` : ''}
${expiryDate ? `⏰ Valid until: ${expiryDate}` : ''}

Please take note of this information and log in to your portal for any required actions.

Best regards,
Nadanaloga Academy Team`;

            const mailOptions = {
                from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
                to: studentEmail,
                subject: `Notice - ${noticeTitle}`,
                html: createEmailTemplate(studentName, 'Important Notice', noticeMessage)
            };

            await mailTransporter.sendMail(mailOptions);
            console.log(`📧 Notice email sent to: ${studentEmail}`);

            res.status(200).json({ success: true, message: 'Notice email sent successfully' });
        } catch (error) {
            console.error('Notice email error:', error);
            res.status(500).json({ success: false, message: 'Failed to send notice email', error: error.message });
        }
    });

    // Payment History Email Notification
    app.post('/api/send-payment-email', async (req, res) => {
        try {
            const { studentName, studentEmail, transactionId, amount, paymentDate, description, status, invoiceLink } = req.body;

            if (!studentEmail || !studentName || !transactionId) {
                return res.status(400).json({ message: 'Student email, name, and transaction ID are required.' });
            }

            console.log('[DEBUG] Sending payment email to:', studentEmail);

            if (!mailTransporter) {
                return res.status(200).json({ success: true, message: 'Email sent (test mode)' });
            }

            const statusEmoji = status === 'completed' ? '✅' : status === 'pending' ? '⏳' : '❌';

            const paymentMessage = `Payment Receipt ${statusEmoji}

💳 Transaction ID: ${transactionId}
💰 Amount: ${amount || 'N/A'}
📅 Date: ${paymentDate || 'N/A'}
📋 Description: ${description || 'Payment'}
📊 Status: ${status || 'Completed'}

${invoiceLink ? `📄 Download Invoice: ${invoiceLink}` : 'Your receipt is attached or available in your student portal.'}

Thank you for your payment!

Best regards,
Nadanaloga Academy Team`;

            const mailOptions = {
                from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
                to: studentEmail,
                subject: `Payment Receipt - ${transactionId}`,
                html: createEmailTemplate(studentName, 'Payment Receipt', paymentMessage)
            };

            await mailTransporter.sendMail(mailOptions);
            console.log(`📧 Payment email sent to: ${studentEmail}`);

            res.status(200).json({ success: true, message: 'Payment email sent successfully' });
        } catch (error) {
            console.error('Payment email error:', error);
            res.status(500).json({ success: false, message: 'Failed to send payment email', error: error.message });
        }
    });

    // Profile Update Email Notification
    app.post('/api/send-profile-update-email', async (req, res) => {
        try {
            const { studentName, studentEmail, updatedFields, updatedBy } = req.body;

            if (!studentEmail || !studentName) {
                return res.status(400).json({ message: 'Student email and name are required.' });
            }

            console.log('[DEBUG] Sending profile update email to:', studentEmail);

            if (!mailTransporter) {
                return res.status(200).json({ success: true, message: 'Email sent (test mode)' });
            }

            const fieldsText = updatedFields && updatedFields.length > 0
                ? updatedFields.join(', ')
                : 'various fields';

            const profileMessage = `Your profile has been updated successfully!

🔄 Updated Information: ${fieldsText}
👤 Updated by: ${updatedBy || 'System'}
📅 Date: ${new Date().toLocaleDateString()}

Please log in to your student portal to review the changes.

If you didn't request these changes, please contact us immediately.

Best regards,
Nadanaloga Academy Team`;

            const mailOptions = {
                from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
                to: studentEmail,
                subject: 'Profile Updated - Nadanaloga Academy',
                html: createEmailTemplate(studentName, 'Profile Updated', profileMessage)
            };

            await mailTransporter.sendMail(mailOptions);
            console.log(`📧 Profile update email sent to: ${studentEmail}`);

            res.status(200).json({ success: true, message: 'Profile update email sent successfully' });
        } catch (error) {
            console.error('Profile update email error:', error);
            res.status(500).json({ success: false, message: 'Failed to send profile update email', error: error.message });
        }
    });

    // --- SMTP Diagnostic Endpoint (Admin only) ---
    app.get('/api/test-smtp', ensureAdmin, async (req, res) => {
        try {
            const config = {
                ...smtpConfigInfo,
                transporterExists: !!mailTransporter,
                isEtherealMode,
                envVars: {
                    SMTP_HOST: process.env.SMTP_HOST ? 'SET' : 'MISSING',
                    SMTP_PORT: process.env.SMTP_PORT || '(default 587)',
                    SMTP_USER: process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 4) + '***' : 'MISSING',
                    SMTP_PASS: process.env.SMTP_PASS ? `SET (length: ${process.env.SMTP_PASS.length})` : 'MISSING',
                    SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || '(not set, using SMTP_USER)',
                }
            };

            // Try to verify connection now
            if (mailTransporter && !isEtherealMode) {
                try {
                    await mailTransporter.verify();
                    config.liveVerification = 'SUCCESS';
                } catch (verifyErr) {
                    config.liveVerification = 'FAILED: ' + verifyErr.message;
                }
            }

            res.json(config);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // --- Send Test Email (Admin only) ---
    app.post('/api/test-smtp', ensureAdmin, async (req, res) => {
        try {
            if (!mailTransporter || isEtherealMode) {
                return res.status(400).json({ success: false, message: 'SMTP not configured. Check env vars.' });
            }

            const testTo = req.body.to || req.session.user.email;
            const emailHtml = createEmailTemplate('Admin', 'SMTP Test', 'This is a test email from Nadanaloga. If you received this, SMTP is working correctly.');

            await mailTransporter.sendMail({
                from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
                to: testTo,
                subject: 'Nadanaloga - SMTP Test Email',
                html: emailHtml,
            });

            res.json({ success: true, message: `Test email sent to ${testTo}` });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Send failed', error: error.message });
        }
    });

    app.post('/api/send-email', async (req, res) => {
        try {
            const { to, subject, body, recipientName } = req.body;

            if (!to || !subject || !body) {
                return res.status(400).json({ message: 'Missing required fields: to, subject, body' });
            }

            if (!mailTransporter) {
                console.log('📧 Email in test mode - would send to:', to);
                return res.status(200).json({
                    success: true,
                    message: 'Email sent successfully (test mode)',
                    preview: `Subject: ${subject}\nTo: ${to}\nBody: ${body}`
                });
            }

            const emailHtml = createEmailTemplate(recipientName || 'User', subject, body);

            const mailOptions = {
                from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
                to: to,
                subject: subject,
                html: emailHtml
            };

            await mailTransporter.sendMail(mailOptions);
            console.log(`📧 Email sent successfully to: ${to}`);

            res.status(200).json({
                success: true,
                message: 'Email sent successfully'
            });
        } catch (error) {
            console.error('Email sending error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send email',
                error: error.message
            });
        }
    });

    // Enhanced registration endpoint with email notifications
    app.post('/api/register-with-email', async (req, res) => {
        try {
            console.log('[DEBUG] Registration request received:', req.body);
            const { password, ...userData } = req.body;

            if (!userData.email) {
                console.log('[ERROR] Email is missing');
                return res.status(400).json({ message: 'Email is required.' });
            }

            const normalizedEmail = userData.email.toLowerCase();
            console.log('[DEBUG] Processing registration for:', normalizedEmail);

            const existingUserResult = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
            if (existingUserResult.rows.length > 0) {
                return res.status(409).json({ message: 'This email is already registered. Please try logging in.' });
            }

            if (normalizedEmail === 'admin@nadanaloga.com') userData.role = 'Admin';
            if (!password) {
                console.log('[ERROR] Password is missing');
                return res.status(400).json({ message: 'Password is required.' });
            }

            console.log('[DEBUG] Hashing password...');
            const hashedPassword = await bcrypt.hash(password, 10);

            console.log('[DEBUG] Preparing database insert with data:', {
                name: userData.name,
                email: normalizedEmail,
                role: userData.role || 'Student',
                class_preference: userData.class_preference || userData.classPreference,
                courses: userData.courses
            });

            // Insert user into database
            const result = await pool.query(
                'INSERT INTO users (name, email, password, role, class_preference, photo_url, dob, sex, contact_number, address, date_of_joining, courses, father_name, standard, school_name, grade, notes, course_expertise, educational_qualifications, employment_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING id',
                [
                    userData.name, normalizedEmail, hashedPassword, userData.role || 'Student',
                    userData.class_preference || userData.classPreference, userData.photo_url || userData.photoUrl, userData.dob, userData.sex,
                    userData.contact_number || userData.contactNumber, userData.address, userData.date_of_joining || userData.dateOfJoining,
                    JSON.stringify(userData.courses || []), userData.father_name || userData.fatherName, userData.standard,
                    userData.school_name || userData.schoolName, userData.grade, userData.notes,
                    JSON.stringify(userData.course_expertise || userData.courseExpertise || []), userData.educational_qualifications || userData.educationalQualifications,
                    userData.employment_type || userData.employmentType
                ]
            );

            const newUserId = result.rows[0].id;
            console.log('[DEBUG] User registered with ID:', newUserId);

            // Send welcome email to user
            if (mailTransporter) {
                try {
                    const coursesList = userData.courses && userData.courses.length > 0
                        ? userData.courses.join(', ')
                        : 'No specific courses selected';

                    const welcomeMessage = `Thank you for registering with Nadanaloga Academy!

Your registration has been successfully submitted with the following details:

👤 Name: ${userData.name}
📧 Email: ${normalizedEmail}
📚 Courses of Interest: ${coursesList}
📞 Contact: ${userData.contact_number || userData.contactNumber || 'Not provided'}

What happens next?
✅ Our admin team will review your application
✅ You'll receive a confirmation email once approved
✅ We'll contact you to discuss class schedules and batch allocation

If you have any questions, feel free to contact us at nadanalogaa@gmail.com.

Welcome to the Nadanaloga family!`;

                    const userMailOptions = {
                        from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
                        to: normalizedEmail,
                        subject: 'Welcome to Nadanaloga Academy!',
                        html: createEmailTemplate(userData.name, 'Welcome to Nadanaloga Academy!', welcomeMessage)
                    };

                    await mailTransporter.sendMail(userMailOptions);
                    console.log(`📧 Welcome email sent to: ${normalizedEmail}`);
                } catch (emailError) {
                    console.error('Error sending welcome email:', emailError);
                }
            }

            // Send notification email to admin
            if (mailTransporter) {
                try {
                    const adminMessage = `A new student has registered on Nadanaloga Academy:

👤 Name: ${userData.name}
📧 Email: ${normalizedEmail}
📞 Contact: ${userData.contact_number || userData.contactNumber || 'Not provided'}
📚 Courses of Interest: ${userData.courses && userData.courses.length > 0 ? userData.courses.join(', ') : 'No specific courses selected'}
👨‍👩‍👧‍👦 Father's Name: ${userData.father_name || userData.fatherName || 'Not provided'}
🎓 Standard/Class: ${userData.standard || 'Not provided'}
🏫 School: ${userData.school_name || userData.schoolName || 'Not provided'}
📍 Address: ${userData.address || 'Not provided'}
📅 Date of Joining: ${userData.date_of_joining || userData.dateOfJoining || 'Not provided'}
📝 Notes: ${userData.notes || 'None'}

Please review and approve this registration in the admin panel.`;

                    const adminMailOptions = {
                        from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
                        to: 'nadanalogaa@gmail.com',
                        subject: 'New Student Registration - Nadanaloga Academy',
                        html: createEmailTemplate('Admin', 'New Student Registration', adminMessage)
                    };

                    await mailTransporter.sendMail(adminMailOptions);
                    console.log('📧 Admin notification email sent');
                } catch (emailError) {
                    console.error('Error sending admin notification email:', emailError);
                }
            }

            res.status(201).json({
                message: 'Registration successful',
                userId: newUserId,
                emailSent: !!mailTransporter
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Server error during registration.' });
        }
    });

    // --- User Management API Endpoints ---
    // Helper function to parse JSON fields in user data
    const parseUserData = (user) => ({
        ...user,
        courses: typeof user.courses === 'string' ? JSON.parse(user.courses || '[]') : (user.courses || []),
        course_expertise: typeof user.course_expertise === 'string' ? JSON.parse(user.course_expertise || '[]') : (user.course_expertise || [])
    });

    // Get all non-deleted users
    app.get('/api/users', ensureAdmin, async (req, res) => {
        try {
            const { role, course_expertise, search } = req.query;
            let query = 'SELECT * FROM users WHERE is_deleted = false';
            const params = [];

            if (role) {
                params.push(role);
                query += ` AND role = $${params.length}`;
            }
            if (course_expertise) {
                params.push(`%${course_expertise}%`);
                query += ` AND course_expertise::text ILIKE $${params.length}`;
            }
            if (search) {
                params.push(`%${search}%`);
                query += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length} OR user_id ILIKE $${params.length})`;
            }

            query += ' ORDER BY created_at DESC';
            const result = await pool.query(query, params);
            const users = result.rows.map(parseUserData);
            res.json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ message: 'Server error fetching users.' });
        }
    });

    // Get user by ID
    app.get('/api/users/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(parseUserData(result.rows[0]));
        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({ message: 'Server error fetching user.' });
        }
    });

    // Get user by email
    app.post('/api/users/by-email', ensureAdmin, async (req, res) => {
        try {
            const { email } = req.body;
            const result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_deleted = false', [email]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error fetching user by email:', error);
            res.status(500).json({ message: 'Server error fetching user.' });
        }
    });

    // Update user
    app.put('/api/users/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const userData = req.body;

            const updateFields = [];
            const values = [];
            let paramCount = 1;

            Object.keys(userData).forEach(key => {
                if (key !== 'id' && key !== 'created_at') {
                    updateFields.push(`${key} = $${paramCount}`);
                    values.push(userData[key]);
                    paramCount++;
                }
            });

            values.push(id);
            const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;

            const result = await pool.query(query, values);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ message: 'Server error updating user.' });
        }
    });

    // Soft delete user
    app.delete('/api/users/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query(
                'UPDATE users SET is_deleted = true, updated_at = NOW() WHERE id = $1 RETURNING *',
                [id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ message: 'Server error deleting user.' });
        }
    });

    // Get trashed users
    app.get('/api/users/trashed/all', ensureAdmin, async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM users WHERE is_deleted = true ORDER BY updated_at DESC');
            const users = result.rows.map(parseUserData);
            res.json(users);
        } catch (error) {
            console.error('Error fetching trashed users:', error);
            res.status(500).json({ message: 'Server error fetching trashed users.' });
        }
    });

    // Restore user
    app.post('/api/users/:id/restore', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query(
                'UPDATE users SET is_deleted = false, updated_at = NOW() WHERE id = $1 RETURNING *',
                [id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error restoring user:', error);
            res.status(500).json({ message: 'Server error restoring user.' });
        }
    });

    // Permanently delete user
    app.delete('/api/users/:id/permanent', ensureAdmin, async (req, res) => {
        const client = await pool.connect();
        try {
            const { id } = req.params;
            await client.query('BEGIN');

            // Helper: use SAVEPOINT so a failed query doesn't abort the transaction
            let spCounter = 0;
            const safeQuery = async (sql, params) => {
                const sp = `sp_${++spCounter}`;
                try {
                    await client.query(`SAVEPOINT ${sp}`);
                    await client.query(sql, params);
                    await client.query(`RELEASE SAVEPOINT ${sp}`);
                } catch (e) {
                    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
                    console.log(`[Delete] Skipped (${sp}): ${e.message}`);
                }
            };

            // Remove user from batch student_ids arrays
            await safeQuery(
                `UPDATE batches SET student_ids = array_remove(student_ids, $1) WHERE $1 = ANY(student_ids)`,
                [parseInt(id)]
            );

            // Nullify references in batches and events
            await safeQuery('UPDATE batches SET teacher_id = NULL WHERE teacher_id = $1', [id]);
            await safeQuery('UPDATE events SET created_by = NULL WHERE created_by = $1', [id]);

            // Explicitly delete from ALL tables that reference users
            await safeQuery('DELETE FROM notifications WHERE user_id = $1', [id]);
            await safeQuery('DELETE FROM notifications WHERE recipient_id = $1', [id]);
            await safeQuery('DELETE FROM event_notifications WHERE user_id = $1', [id]);
            await safeQuery('DELETE FROM user_fcm_tokens WHERE user_id = $1', [id]);
            await safeQuery('DELETE FROM invoices WHERE student_id = $1', [id]);
            await safeQuery('DELETE FROM salaries WHERE user_id = $1', [id]);
            await safeQuery('DELETE FROM salary_payments WHERE user_id = $1', [id]);
            await safeQuery('DELETE FROM event_responses WHERE user_id = $1', [id]);

            // Now delete the user
            const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'User not found' });
            }

            await client.query('COMMIT');
            res.json({ message: 'User permanently deleted' });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error permanently deleting user:', error);
            res.status(500).json({ message: 'Server error permanently deleting user.', error: error.message });
        } finally {
            client.release();
        }
    });

    // Change password
    app.put('/api/users/:id/change-password', async (req, res) => {
        try {
            const { id } = req.params;
            const { current_password, new_password } = req.body;

            if (!current_password || !new_password) {
                return res.status(400).json({ message: 'Current password and new password are required.' });
            }
            if (new_password.length < 6) {
                return res.status(400).json({ message: 'New password must be at least 6 characters.' });
            }

            const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [id]);
            if (userResult.rows.length === 0) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const isMatch = await bcrypt.compare(current_password, userResult.rows[0].password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Current password is incorrect.' });
            }

            const hashedPassword = await bcrypt.hash(new_password, 10);
            await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, id]);

            res.json({ message: 'Password changed successfully.' });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ message: 'Server error changing password.' });
        }
    });

    // Promote user to Admin (Super Admin only)
    app.put('/api/users/:id/make-admin', ensureSuperAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query(
                'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND is_deleted = false RETURNING *',
                ['Admin', id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(parseUserData(result.rows[0]));
        } catch (error) {
            console.error('Error promoting user to admin:', error);
            res.status(500).json({ message: 'Server error promoting user.' });
        }
    });

    // Demote Admin back to Student (Super Admin only, blocks self-demotion)
    app.put('/api/users/:id/remove-admin', ensureSuperAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            if (parseInt(id) === req.session.user.id) {
                return res.status(400).json({ message: 'You cannot demote yourself.' });
            }
            const result = await pool.query(
                'UPDATE users SET role = $1, is_super_admin = false, updated_at = NOW() WHERE id = $2 AND is_deleted = false RETURNING *',
                ['Student', id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(parseUserData(result.rows[0]));
        } catch (error) {
            console.error('Error demoting admin:', error);
            res.status(500).json({ message: 'Server error demoting admin.' });
        }
    });

    // Get admin stats (aggregated counts)
    app.get('/api/stats/admin', ensureAdmin, async (req, res) => {
        try {
            const [usersResult, batchesResult, coursesResult, locationsResult, invoicesResult, demosResult] = await Promise.all([
                pool.query(`SELECT role, COUNT(*) as count FROM users WHERE is_deleted = false GROUP BY role`),
                pool.query(`SELECT COUNT(*) as count FROM batches`),
                pool.query(`SELECT COUNT(*) as count FROM courses`),
                pool.query(`SELECT COUNT(*) as count FROM locations WHERE is_active = true`),
                pool.query(`SELECT COUNT(*) as count FROM invoices WHERE status = 'pending'`),
                pool.query(`SELECT COUNT(*) as count FROM demo_bookings WHERE status = 'pending'`),
            ]);

            const roleCounts = {};
            usersResult.rows.forEach(r => { roleCounts[r.role] = parseInt(r.count); });

            res.json({
                students: roleCounts['Student'] || 0,
                teachers: roleCounts['Teacher'] || 0,
                admins: roleCounts['Admin'] || 0,
                batches: parseInt(batchesResult.rows[0]?.count || 0),
                courses: parseInt(coursesResult.rows[0]?.count || 0),
                locations: parseInt(locationsResult.rows[0]?.count || 0),
                pendingInvoices: parseInt(invoicesResult.rows[0]?.count || 0),
                pendingDemos: parseInt(demosResult.rows[0]?.count || 0),
            });
        } catch (error) {
            console.error('Error fetching admin stats:', error);
            res.status(500).json({ message: 'Server error fetching stats.' });
        }
    });

    // Get users by IDs
    app.post('/api/users/by-ids', ensureAdmin, async (req, res) => {
        try {
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.json([]);
            }
            const result = await pool.query(
                'SELECT * FROM users WHERE id = ANY($1) AND is_deleted = false',
                [ids]
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching users by IDs:', error);
            res.status(500).json({ message: 'Server error fetching users.' });
        }
    });

    // --- Batch Management API Endpoints ---
    // Helper function to parse JSON fields in batch data
    const parseBatchData = (batch) => ({
        ...batch,
        schedule: typeof batch.schedule === 'string' ? JSON.parse(batch.schedule || '[]') : (batch.schedule || [])
    });

    app.get('/api/batches', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM batches ORDER BY created_at DESC');
            const batches = result.rows.map(parseBatchData);
            res.json(batches);
        } catch (error) {
            console.error('Error fetching batches:', error);
            res.status(500).json({ message: 'Server error fetching batches.' });
        }
    });

    app.post('/api/batches', ensureAdmin, async (req, res) => {
        try {
            const batchData = req.body;
            const { batch_name, course_id, teacher_id, schedule, start_date, end_date, max_students, student_ids, mode, location_id } = batchData;

            const result = await pool.query(
                `INSERT INTO batches (batch_name, course_id, teacher_id, schedule, start_date, end_date, max_students, student_ids, mode, location_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                [batch_name, course_id, teacher_id, JSON.stringify(schedule), start_date, end_date, max_students, student_ids || [], mode, location_id || null]
            );
            res.status(201).json(parseBatchData(result.rows[0]));
        } catch (error) {
            console.error('Error creating batch:', error);
            res.status(500).json({ message: 'Server error creating batch.' });
        }
    });

    app.put('/api/batches/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { batch_name, course_id, teacher_id, schedule, start_date, end_date, max_students, student_ids, mode, location_id } = req.body;

            const result = await pool.query(
                `UPDATE batches SET
                    batch_name = $1, course_id = $2, teacher_id = $3, schedule = $4,
                    start_date = $5, end_date = $6, max_students = $7, student_ids = $8, mode = $9,
                    location_id = $10, updated_at = NOW()
                 WHERE id = $11 RETURNING *`,
                [batch_name, course_id, teacher_id, JSON.stringify(schedule), start_date, end_date, max_students, student_ids || [], mode, location_id || null, id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Batch not found' });
            }
            res.json(parseBatchData(result.rows[0]));
        } catch (error) {
            console.error('Error updating batch:', error);
            res.status(500).json({ message: 'Server error updating batch.' });
        }
    });

    app.delete('/api/batches/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM batches WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Batch not found' });
            }
            res.json({ message: 'Batch deleted successfully' });
        } catch (error) {
            console.error('Error deleting batch:', error);
            res.status(500).json({ message: 'Server error deleting batch.' });
        }
    });

    // Get batch with populated details (teacher name, course name, student names)
    app.get('/api/batches/:id/details', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const batchResult = await pool.query('SELECT * FROM batches WHERE id = $1', [id]);
            if (batchResult.rows.length === 0) {
                return res.status(404).json({ message: 'Batch not found' });
            }
            const batch = parseBatchData(batchResult.rows[0]);

            // Get teacher name
            let teacherName = null;
            if (batch.teacher_id) {
                const teacherResult = await pool.query('SELECT name FROM users WHERE id = $1', [batch.teacher_id]);
                teacherName = teacherResult.rows[0]?.name || null;
            }

            // Get course name
            let courseName = null;
            if (batch.course_id) {
                const courseResult = await pool.query('SELECT name FROM courses WHERE id = $1', [batch.course_id]);
                courseName = courseResult.rows[0]?.name || null;
            }

            // Get student names
            const studentIds = batch.student_ids || [];
            let students = [];
            if (studentIds.length > 0) {
                const studentResult = await pool.query(
                    'SELECT id, name, email, user_id FROM users WHERE id = ANY($1)',
                    [studentIds]
                );
                students = studentResult.rows;
            }

            // Get location name
            let locationName = null;
            if (batch.location_id) {
                const locResult = await pool.query('SELECT name FROM locations WHERE id = $1', [batch.location_id]);
                locationName = locResult.rows[0]?.name || null;
            }

            res.json({
                ...batch,
                teacher_name: teacherName,
                course_name: courseName,
                location_name: locationName,
                students: students,
            });
        } catch (error) {
            console.error('Error fetching batch details:', error);
            res.status(500).json({ message: 'Server error fetching batch details.' });
        }
    });

    // Transfer student between batches
    app.post('/api/batches/transfer', ensureAdmin, async (req, res) => {
        try {
            const { studentId, fromBatchId, toBatchId } = req.body;
            if (!studentId || !fromBatchId || !toBatchId) {
                return res.status(400).json({ message: 'studentId, fromBatchId, and toBatchId are required.' });
            }

            // Remove student from source batch
            const fromBatch = await pool.query('SELECT student_ids FROM batches WHERE id = $1', [fromBatchId]);
            if (fromBatch.rows.length === 0) {
                return res.status(404).json({ message: 'Source batch not found.' });
            }
            const fromIds = (fromBatch.rows[0].student_ids || []).filter(id => id !== studentId);
            await pool.query('UPDATE batches SET student_ids = $1, updated_at = NOW() WHERE id = $2', [fromIds, fromBatchId]);

            // Add student to destination batch
            const toBatch = await pool.query('SELECT student_ids FROM batches WHERE id = $1', [toBatchId]);
            if (toBatch.rows.length === 0) {
                return res.status(404).json({ message: 'Destination batch not found.' });
            }
            const toIds = [...(toBatch.rows[0].student_ids || [])];
            if (!toIds.includes(studentId)) toIds.push(studentId);
            await pool.query('UPDATE batches SET student_ids = $1, updated_at = NOW() WHERE id = $2', [toIds, toBatchId]);

            // Return both updated batches
            const [updatedFrom, updatedTo] = await Promise.all([
                pool.query('SELECT * FROM batches WHERE id = $1', [fromBatchId]),
                pool.query('SELECT * FROM batches WHERE id = $1', [toBatchId]),
            ]);

            res.json({
                from: parseBatchData(updatedFrom.rows[0]),
                to: parseBatchData(updatedTo.rows[0]),
            });
        } catch (error) {
            console.error('Error transferring student:', error);
            res.status(500).json({ message: 'Server error transferring student.' });
        }
    });

    // --- Course Management API Endpoints ---
    app.post('/api/courses', ensureAdmin, async (req, res) => {
        try {
            const { name, description, icon, image } = req.body;
            const result = await pool.query(
                'INSERT INTO courses (name, description, icon, image) VALUES ($1, $2, $3, $4) RETURNING *',
                [name, description, icon, image]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating course:', error);
            res.status(500).json({ message: 'Server error creating course.' });
        }
    });

    app.put('/api/courses/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, icon, image } = req.body;
            const result = await pool.query(
                'UPDATE courses SET name = $1, description = $2, icon = $3, image = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
                [name, description, icon, image, id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Course not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating course:', error);
            res.status(500).json({ message: 'Server error updating course.' });
        }
    });

    app.delete('/api/courses/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM courses WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Course not found' });
            }
            res.json({ message: 'Course deleted successfully' });
        } catch (error) {
            console.error('Error deleting course:', error);
            res.status(500).json({ message: 'Server error deleting course.' });
        }
    });

    // --- Notification API Endpoints ---
    app.get('/api/notifications/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const result = await pool.query(
                'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({ message: 'Server error fetching notifications.' });
        }
    });

    app.get('/api/notifications/:userId/unread-count', async (req, res) => {
        try {
            const { userId } = req.params;
            const result = await pool.query(
                'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
                [userId]
            );
            res.json({ count: parseInt(result.rows[0].count) });
        } catch (error) {
            console.error('Error fetching unread count:', error);
            res.status(500).json({ message: 'Server error fetching unread count.' });
        }
    });

    app.put('/api/notifications/:id/mark-read', async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query(
                'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
                [id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Notification not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({ message: 'Server error updating notification.' });
        }
    });

    app.post('/api/notifications', ensureAuthenticated, async (req, res) => {
        try {
            const notifications = req.body;
            if (!Array.isArray(notifications)) {
                return res.status(400).json({ message: 'Expected array of notifications' });
            }

            const values = notifications.map((n, i) =>
                `($${i*4+1}, $${i*4+2}, $${i*4+3}, $${i*4+4})`
            ).join(',');

            const params = notifications.flatMap(n => [n.user_id, n.title, n.message, n.type || 'info']);

            await pool.query(
                `INSERT INTO notifications (user_id, title, message, type) VALUES ${values}`,
                params
            );
            res.status(201).json({ success: true, message: 'Notifications created' });
        } catch (error) {
            console.error('Error creating notifications:', error);
            res.status(500).json({ message: 'Server error creating notifications.' });
        }
    });

    // --- Fee Structure API Endpoints ---
    app.get('/api/fee-structures', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM fee_structures ORDER BY created_at DESC');
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching fee structures:', error);
            res.status(500).json({ message: 'Server error fetching fee structures.' });
        }
    });

    app.post('/api/fee-structures', ensureSuperAdmin, async (req, res) => {
        try {
            const { course_id, mode, monthly_fee, quarterly_fee, half_yearly_fee, annual_fee } = req.body;
            const result = await pool.query(
                `INSERT INTO fee_structures (course_id, mode, monthly_fee, quarterly_fee, half_yearly_fee, annual_fee)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [course_id, mode, monthly_fee, quarterly_fee, half_yearly_fee, annual_fee]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating fee structure:', error);
            res.status(500).json({ message: 'Server error creating fee structure.' });
        }
    });

    app.put('/api/fee-structures/:id', ensureSuperAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { course_id, mode, monthly_fee, quarterly_fee, half_yearly_fee, annual_fee } = req.body;
            const result = await pool.query(
                `UPDATE fee_structures SET
                    course_id = $1, mode = $2, monthly_fee = $3, quarterly_fee = $4,
                    half_yearly_fee = $5, annual_fee = $6, updated_at = NOW()
                 WHERE id = $7 RETURNING *`,
                [course_id, mode, monthly_fee, quarterly_fee, half_yearly_fee, annual_fee, id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Fee structure not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating fee structure:', error);
            res.status(500).json({ message: 'Server error updating fee structure.' });
        }
    });

    app.delete('/api/fee-structures/:id', ensureSuperAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM fee_structures WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Fee structure not found' });
            }
            res.json({ message: 'Fee structure deleted successfully' });
        } catch (error) {
            console.error('Error deleting fee structure:', error);
            res.status(500).json({ message: 'Server error deleting fee structure.' });
        }
    });

    // --- Demo Booking API Endpoints ---
    app.get('/api/demo-bookings', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM demo_bookings ORDER BY created_at DESC');
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching demo bookings:', error);
            res.status(500).json({ message: 'Server error fetching demo bookings.' });
        }
    });

    app.get('/api/demo-bookings/stats', async (req, res) => {
        try {
            const result = await pool.query('SELECT status, created_at FROM demo_bookings');
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching demo booking stats:', error);
            res.status(500).json({ message: 'Server error fetching stats.' });
        }
    });

    app.post('/api/demo-bookings', async (req, res) => {
        try {
            const { student_name, parent_name, email, phone, course, preferred_date, preferred_time, location, notes } = req.body;
            const result = await pool.query(
                `INSERT INTO demo_bookings (student_name, parent_name, email, phone, course, preferred_date, preferred_time, location, notes, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') RETURNING *`,
                [student_name, parent_name, email, phone, course, preferred_date, preferred_time, location, notes]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating demo booking:', error);
            res.status(500).json({ message: 'Server error creating demo booking.' });
        }
    });

    app.put('/api/demo-bookings/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { status, scheduled_date, scheduled_time, assigned_teacher, notes } = req.body;
            const result = await pool.query(
                `UPDATE demo_bookings SET
                    status = $1, scheduled_date = $2, scheduled_time = $3, assigned_teacher = $4, notes = $5, updated_at = NOW()
                 WHERE id = $6 RETURNING *`,
                [status, scheduled_date, scheduled_time, assigned_teacher, notes, id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Demo booking not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating demo booking:', error);
            res.status(500).json({ message: 'Server error updating demo booking.' });
        }
    });

    app.delete('/api/demo-bookings/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM demo_bookings WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Demo booking not found' });
            }
            res.json({ message: 'Demo booking deleted successfully' });
        } catch (error) {
            console.error('Error deleting demo booking:', error);
            res.status(500).json({ message: 'Server error deleting demo booking.' });
        }
    });

    // --- Event API Endpoints ---
    app.get('/api/events', async (req, res) => {
        try {
            const { isPublic } = req.query;
            let query = 'SELECT * FROM events WHERE is_active = true';
            if (isPublic === 'true') {
                query += ' AND is_public = true';
            }
            query += ' ORDER BY event_date DESC';
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching events:', error);
            res.status(500).json({ message: 'Server error fetching events.' });
        }
    });

    app.post('/api/events', ensureAdmin, async (req, res) => {
        try {
            const { title, description, event_date, event_time, location, is_public, recipient_ids, image_url } = req.body;
            const result = await pool.query(
                `INSERT INTO events (title, description, event_date, event_time, location, is_public, recipient_ids, image_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [title, description, event_date, event_time, location, is_public || false, recipient_ids || [], image_url]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating event:', error);
            res.status(500).json({ message: 'Server error creating event.' });
        }
    });

    app.put('/api/events/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { title, description, event_date, event_time, location, is_public, recipient_ids, image_url } = req.body;
            const result = await pool.query(
                `UPDATE events SET
                    title = $1, description = $2, event_date = $3, event_time = $4,
                    location = $5, is_public = $6, recipient_ids = $7, image_url = $8, updated_at = NOW()
                 WHERE id = $9 RETURNING *`,
                [title, description, event_date, event_time, location, is_public, recipient_ids, image_url, id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Event not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating event:', error);
            res.status(500).json({ message: 'Server error updating event.' });
        }
    });

    app.delete('/api/events/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Event not found' });
            }
            res.json({ message: 'Event deleted successfully' });
        } catch (error) {
            console.error('Error deleting event:', error);
            res.status(500).json({ message: 'Server error deleting event.' });
        }
    });

    // --- Grade Exam API Endpoints ---
    app.get('/api/grade-exams', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM grade_exams ORDER BY exam_date DESC');
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching grade exams:', error);
            res.status(500).json({ message: 'Server error fetching grade exams.' });
        }
    });

    app.post('/api/grade-exams', ensureAdmin, async (req, res) => {
        try {
            const { exam_name, course, exam_date, exam_time, location, syllabus, recipient_ids } = req.body;
            const result = await pool.query(
                `INSERT INTO grade_exams (exam_name, course, exam_date, exam_time, location, syllabus, recipient_ids)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [exam_name, course, exam_date, exam_time, location, syllabus, recipient_ids || []]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating grade exam:', error);
            res.status(500).json({ message: 'Server error creating grade exam.' });
        }
    });

    app.put('/api/grade-exams/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { exam_name, course, exam_date, exam_time, location, syllabus, recipient_ids } = req.body;
            const result = await pool.query(
                `UPDATE grade_exams SET
                    exam_name = $1, course = $2, exam_date = $3, exam_time = $4,
                    location = $5, syllabus = $6, recipient_ids = $7, updated_at = NOW()
                 WHERE id = $8 RETURNING *`,
                [exam_name, course, exam_date, exam_time, location, syllabus, recipient_ids, id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Grade exam not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating grade exam:', error);
            res.status(500).json({ message: 'Server error updating grade exam.' });
        }
    });

    app.delete('/api/grade-exams/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM grade_exams WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Grade exam not found' });
            }
            res.json({ message: 'Grade exam deleted successfully' });
        } catch (error) {
            console.error('Error deleting grade exam:', error);
            res.status(500).json({ message: 'Server error deleting grade exam.' });
        }
    });

    // --- Book Materials API Endpoints ---
    app.get('/api/book-materials', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM book_materials ORDER BY created_at DESC');
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching book materials:', error);
            res.status(500).json({ message: 'Server error fetching book materials.' });
        }
    });

    app.post('/api/book-materials', ensureAdmin, async (req, res) => {
        try {
            const { title, description, course, file_url, file_type, recipient_ids } = req.body;
            const result = await pool.query(
                `INSERT INTO book_materials (title, description, course, file_url, file_type, recipient_ids)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [title, description, course, file_url, file_type, recipient_ids || []]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating book material:', error);
            res.status(500).json({ message: 'Server error creating book material.' });
        }
    });

    app.put('/api/book-materials/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { title, description, course, file_url, file_type, recipient_ids } = req.body;
            const result = await pool.query(
                `UPDATE book_materials SET
                    title = $1, description = $2, course = $3, file_url = $4, file_type = $5, recipient_ids = $6, updated_at = NOW()
                 WHERE id = $7 RETURNING *`,
                [title, description, course, file_url, file_type, recipient_ids, id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Book material not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating book material:', error);
            res.status(500).json({ message: 'Server error updating book material.' });
        }
    });

    app.delete('/api/book-materials/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM book_materials WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Book material not found' });
            }
            res.json({ message: 'Book material deleted successfully' });
        } catch (error) {
            console.error('Error deleting book material:', error);
            res.status(500).json({ message: 'Server error deleting book material.' });
        }
    });

    // --- Notice API Endpoints ---
    app.get('/api/notices', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM notices ORDER BY created_at DESC');
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching notices:', error);
            res.status(500).json({ message: 'Server error fetching notices.' });
        }
    });

    app.post('/api/notices', ensureAdmin, async (req, res) => {
        try {
            const { title, content, priority, expiry_date, recipient_ids } = req.body;
            const result = await pool.query(
                `INSERT INTO notices (title, content, priority, expiry_date, recipient_ids)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [title, content, priority || 'normal', expiry_date, recipient_ids || []]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating notice:', error);
            res.status(500).json({ message: 'Server error creating notice.' });
        }
    });

    app.put('/api/notices/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { title, content, priority, expiry_date, recipient_ids } = req.body;
            const result = await pool.query(
                `UPDATE notices SET
                    title = $1, content = $2, priority = $3, expiry_date = $4, recipient_ids = $5, updated_at = NOW()
                 WHERE id = $6 RETURNING *`,
                [title, content, priority, expiry_date, recipient_ids, id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Notice not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating notice:', error);
            res.status(500).json({ message: 'Server error updating notice.' });
        }
    });

    app.delete('/api/notices/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM notices WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Notice not found' });
            }
            res.json({ message: 'Notice deleted successfully' });
        } catch (error) {
            console.error('Error deleting notice:', error);
            res.status(500).json({ message: 'Server error deleting notice.' });
        }
    });

    // --- Event Response API Endpoints ---
    app.get('/api/event-responses/:eventId', async (req, res) => {
        try {
            const { eventId } = req.params;
            const result = await pool.query(
                'SELECT * FROM event_responses WHERE event_id = $1',
                [eventId]
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching event responses:', error);
            res.status(500).json({ message: 'Server error fetching event responses.' });
        }
    });

    app.get('/api/event-responses/:eventId/user/:userId', async (req, res) => {
        try {
            const { eventId, userId } = req.params;
            const result = await pool.query(
                'SELECT response, response_message FROM event_responses WHERE event_id = $1 AND user_id = $2',
                [eventId, userId]
            );
            if (result.rows.length === 0) {
                return res.json(null);
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error fetching event response:', error);
            res.status(500).json({ message: 'Server error fetching event response.' });
        }
    });

    app.post('/api/event-responses', async (req, res) => {
        try {
            const { event_id, user_id, response, response_message } = req.body;
            const result = await pool.query(
                `INSERT INTO event_responses (event_id, user_id, response, response_message)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (event_id, user_id) DO UPDATE SET
                    response = $3, response_message = $4, updated_at = NOW()
                 RETURNING *`,
                [event_id, user_id, response, response_message]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error submitting event response:', error);
            res.status(500).json({ message: 'Server error submitting response.' });
        }
    });

    // --- Event Notification API Endpoints ---
    app.get('/api/event-notifications/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const result = await pool.query(
                `SELECT en.*, e.title as event_title, e.event_date, e.location
                 FROM event_notifications en
                 JOIN events e ON en.event_id = e.id
                 WHERE en.user_id = $1
                 ORDER BY en.created_at DESC`,
                [userId]
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching event notifications:', error);
            res.status(500).json({ message: 'Server error fetching event notifications.' });
        }
    });

    app.put('/api/event-notifications/:id/mark-read', async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query(
                'UPDATE event_notifications SET is_read = true WHERE id = $1 RETURNING *',
                [id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Event notification not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error marking event notification as read:', error);
            res.status(500).json({ message: 'Server error updating event notification.' });
        }
    });

    // --- Location Management API Endpoints ---
    app.post('/api/locations', ensureSuperAdmin, async (req, res) => {
        try {
            const { name, address, city, state, postal_code, country, phone, email, is_active } = req.body;
            const result = await pool.query(
                `INSERT INTO locations (name, address, city, state, postal_code, country, phone, email, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                [name, address, city, state, postal_code, country, phone, email, is_active !== false]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating location:', error);
            res.status(500).json({ message: 'Server error creating location.' });
        }
    });

    app.put('/api/locations/:id', ensureSuperAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { name, address, city, state, postal_code, country, phone, email, is_active } = req.body;
            const result = await pool.query(
                `UPDATE locations SET
                    name = $1, address = $2, city = $3, state = $4, postal_code = $5,
                    country = $6, phone = $7, email = $8, is_active = $9, updated_at = NOW()
                 WHERE id = $10 RETURNING *`,
                [name, address, city, state, postal_code, country, phone, email, is_active, id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Location not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating location:', error);
            res.status(500).json({ message: 'Server error updating location.' });
        }
    });

    app.delete('/api/locations/:id', ensureSuperAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM locations WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Location not found' });
            }
            res.json({ message: 'Location deleted successfully' });
        } catch (error) {
            console.error('Error deleting location:', error);
            res.status(500).json({ message: 'Server error deleting location.' });
        }
    });

    // --- Invoice API Endpoints ---
    app.get('/api/invoices', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT i.*, u.id as student_id, u.name as student_name, u.email as student_email
                FROM invoices i
                LEFT JOIN users u ON i.student_id = u.id
                ORDER BY i.created_at DESC
            `);
            const invoices = result.rows.map(row => ({
                ...row,
                student: row.student_id ? {
                    id: row.student_id,
                    name: row.student_name,
                    email: row.student_email
                } : null
            }));
            res.json(invoices);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            res.status(500).json({ message: 'Server error fetching invoices.' });
        }
    });

    app.post('/api/invoices', ensureAdmin, async (req, res) => {
        try {
            const { student_id, fee_structure_id, course_name, amount, currency, issue_date, due_date, billing_period, status, payment_details } = req.body;
            const result = await pool.query(
                `INSERT INTO invoices (student_id, fee_structure_id, course_name, amount, currency, issue_date, due_date, billing_period, status, payment_details)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                [student_id, fee_structure_id, course_name, amount, currency, issue_date, due_date, billing_period, status || 'pending', payment_details]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating invoice:', error);
            res.status(500).json({ message: 'Server error creating invoice.' });
        }
    });

    app.put('/api/invoices/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { status, payment_details } = req.body;
            const result = await pool.query(
                `UPDATE invoices SET status = $1, payment_details = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
                [status, payment_details, id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Invoice not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating invoice:', error);
            res.status(500).json({ message: 'Server error updating invoice.' });
        }
    });

    // --- FCM Token Management API Endpoints ---
    app.post('/api/fcm-tokens', async (req, res) => {
        try {
            const { user_id, fcm_token, device_type } = req.body;
            if (!user_id || !fcm_token) {
                return res.status(400).json({ message: 'user_id and fcm_token are required.' });
            }
            const result = await pool.query(
                `INSERT INTO user_fcm_tokens (user_id, fcm_token, device_type, is_active)
                 VALUES ($1, $2, $3, true)
                 ON CONFLICT (user_id, fcm_token) DO UPDATE SET is_active = true, created_at = NOW()
                 RETURNING *`,
                [user_id, fcm_token, device_type || 'unknown']
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error registering FCM token:', error);
            res.status(500).json({ message: 'Server error registering FCM token.' });
        }
    });

    app.delete('/api/fcm-tokens', async (req, res) => {
        try {
            const { user_id, fcm_token } = req.body;
            if (!user_id || !fcm_token) {
                return res.status(400).json({ message: 'user_id and fcm_token are required.' });
            }
            await pool.query(
                `UPDATE user_fcm_tokens SET is_active = false WHERE user_id = $1 AND fcm_token = $2`,
                [user_id, fcm_token]
            );
            res.json({ message: 'FCM token deactivated.' });
        } catch (error) {
            console.error('Error removing FCM token:', error);
            res.status(500).json({ message: 'Server error removing FCM token.' });
        }
    });

    // --- Salary Management API (Super Admin only) ---

    // GET /api/salaries - List all salary configs
    app.get('/api/salaries', ensureSuperAdmin, async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT s.*, u.name as employee_name, u.email as employee_email, u.role as employee_role
                FROM salaries s
                LEFT JOIN users u ON s.user_id = u.id
                ORDER BY s.created_at DESC
            `);
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching salaries:', error);
            res.status(500).json({ message: 'Server error fetching salaries.' });
        }
    });

    // POST /api/salaries - Create salary config
    app.post('/api/salaries', ensureSuperAdmin, async (req, res) => {
        try {
            const { user_id, role, base_salary, payment_frequency, bank_account_name, bank_account_number, bank_ifsc, upi_id } = req.body;
            const result = await pool.query(
                `INSERT INTO salaries (user_id, role, base_salary, payment_frequency, bank_account_name, bank_account_number, bank_ifsc, upi_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [user_id, role, base_salary, payment_frequency || 'Monthly', bank_account_name, bank_account_number, bank_ifsc, upi_id]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating salary:', error);
            res.status(500).json({ message: 'Server error creating salary.' });
        }
    });

    // PUT /api/salaries/:id - Update salary config
    app.put('/api/salaries/:id', ensureSuperAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { user_id, role, base_salary, payment_frequency, bank_account_name, bank_account_number, bank_ifsc, upi_id } = req.body;
            const result = await pool.query(
                `UPDATE salaries SET user_id = $1, role = $2, base_salary = $3, payment_frequency = $4,
                 bank_account_name = $5, bank_account_number = $6, bank_ifsc = $7, upi_id = $8, updated_at = NOW()
                 WHERE id = $9 RETURNING *`,
                [user_id, role, base_salary, payment_frequency, bank_account_name, bank_account_number, bank_ifsc, upi_id, id]
            );
            if (result.rows.length === 0) return res.status(404).json({ message: 'Salary config not found' });
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating salary:', error);
            res.status(500).json({ message: 'Server error updating salary.' });
        }
    });

    // DELETE /api/salaries/:id - Delete salary config
    app.delete('/api/salaries/:id', ensureSuperAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM salaries WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) return res.status(404).json({ message: 'Salary config not found' });
            res.json({ message: 'Salary config deleted successfully' });
        } catch (error) {
            console.error('Error deleting salary:', error);
            res.status(500).json({ message: 'Server error deleting salary.' });
        }
    });

    // GET /api/salary-payments - List all salary payments
    app.get('/api/salary-payments', ensureSuperAdmin, async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT sp.*, u.name as employee_name, u.email as employee_email
                FROM salary_payments sp
                LEFT JOIN users u ON sp.user_id = u.id
                ORDER BY sp.payment_date DESC, sp.created_at DESC
            `);
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching salary payments:', error);
            res.status(500).json({ message: 'Server error fetching salary payments.' });
        }
    });

    // POST /api/salary-payments - Record a salary payment
    app.post('/api/salary-payments', ensureSuperAdmin, async (req, res) => {
        try {
            const { salary_id, user_id, amount, payment_date, payment_method, transaction_id, payment_period, notes, status } = req.body;
            const result = await pool.query(
                `INSERT INTO salary_payments (salary_id, user_id, amount, payment_date, payment_method, transaction_id, payment_period, notes, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                [salary_id, user_id, amount, payment_date, payment_method, transaction_id, payment_period, notes, status || 'paid']
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error recording salary payment:', error);
            res.status(500).json({ message: 'Server error recording salary payment.' });
        }
    });

    // PUT /api/salary-payments/:id - Update a salary payment
    app.put('/api/salary-payments/:id', ensureSuperAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { amount, payment_date, payment_method, transaction_id, payment_period, notes, status } = req.body;
            const result = await pool.query(
                `UPDATE salary_payments SET amount = $1, payment_date = $2, payment_method = $3,
                 transaction_id = $4, payment_period = $5, notes = $6, status = $7, updated_at = NOW()
                 WHERE id = $8 RETURNING *`,
                [amount, payment_date, payment_method, transaction_id, payment_period, notes, status, id]
            );
            if (result.rows.length === 0) return res.status(404).json({ message: 'Salary payment not found' });
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating salary payment:', error);
            res.status(500).json({ message: 'Server error updating salary payment.' });
        }
    });

    // GET /api/salaries/:userId/summary - Salary summary for a user
    app.get('/api/salaries/:userId/summary', ensureSuperAdmin, async (req, res) => {
        try {
            const { userId } = req.params;
            const salaryResult = await pool.query(
                `SELECT s.*, u.name as employee_name FROM salaries s LEFT JOIN users u ON s.user_id = u.id WHERE s.user_id = $1`,
                [userId]
            );
            const paymentsResult = await pool.query(
                `SELECT * FROM salary_payments WHERE user_id = $1 ORDER BY payment_date DESC`,
                [userId]
            );
            res.json({
                salary: salaryResult.rows[0] || null,
                payments: paymentsResult.rows,
                total_paid: paymentsResult.rows.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
            });
        } catch (error) {
            console.error('Error fetching salary summary:', error);
            res.status(500).json({ message: 'Server error fetching salary summary.' });
        }
    });

    // --- Serve Static Files (React Frontend) ---
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));

    // Catch-all handler: send back React's index.html file for any non-API routes
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });

    // Global error handler — return JSON instead of HTML for API errors
    app.use((err, req, res, _next) => {
        console.error('[Server Error]', err.stack || err);
        if (req.path.startsWith('/api')) {
            res.status(500).json({ message: 'Internal server error.' });
        } else {
            res.status(500).send('Internal Server Error');
        }
    });

    // --- Start Server ---
    app.listen(PORT, () => {
        console.log(`[Server] Running on http://localhost:${PORT}`);
        console.log(`[Server] CORS is configured to allow requests from: ${whitelist.join(', ')}`);
        console.log(`[Server] Serving static files from: ${distPath}`);
    });
}

// Start the server
startServer().catch(err => {
    console.error("FATAL: Failed to start server:", err);
    process.exit(1);
});