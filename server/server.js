const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Load environment variables
dotenv.config();

// Safely turn a DB value (JSON string, plain string, array, or null) into an array.
// Never throws — a single malformed row must not 500 an entire list (e.g. /api/users)
// or block a login. Falls back to comma-splitting non-JSON strings like
// "Bharatham, Carnatic music".
const safeJsonArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === '') return [];
    if (typeof value !== 'string') return [];
    const trimmed = value.trim();
    if (trimmed === '') return [];
    try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (_) {
        return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }
};

// --- Firebase Admin SDK Initialization ---
let firebaseAdmin = null;
let firebaseMessaging = null;
try {
    firebaseAdmin = require('firebase-admin');

    // Check if Firebase service account credentials exist
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(serviceAccount),
        });
        firebaseMessaging = firebaseAdmin.messaging();
        console.log('[Firebase] Admin SDK initialized successfully');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Use default credentials file
        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.applicationDefault(),
        });
        firebaseMessaging = firebaseAdmin.messaging();
        console.log('[Firebase] Admin SDK initialized with default credentials');
    } else {
        console.log('[Firebase] No credentials found - push notifications will be disabled');
        console.log('[Firebase] Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS to enable push notifications');
    }
} catch (error) {
    console.error('[Firebase] Failed to initialize:', error.message);
    console.log('[Firebase] Push notifications will be disabled');
}

// --- File Upload Configuration ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ICONS_DIR = path.join(UPLOADS_DIR, 'icons');
const PAYMENTS_DIR = path.join(UPLOADS_DIR, 'payments');

// Ensure upload directories exist
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });
if (!fs.existsSync(PAYMENTS_DIR)) fs.mkdirSync(PAYMENTS_DIR, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, ICONS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${uuidv4()}${ext}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    // Allow SVG, PNG, JPG files
    const allowedTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg'];
    const allowedExts = ['.svg', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only SVG, PNG, and JPG files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB max
});

const paymentProofStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, PAYMENTS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${uuidv4()}${ext}`;
        cb(null, uniqueName);
    }
});

const uploadPaymentProof = multer({
    storage: paymentProofStorage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

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
        if (await addColumn('batches', 'studio', 'VARCHAR(100)')) successCount++; else failCount++;
        if (await addColumn('batches', 'time_slots', 'JSONB DEFAULT \'[]\'')) successCount++; else failCount++;
        if (await addColumn('courses', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('courses', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('fee_structures', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('fee_structures', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('fee_structures', 'grade', 'VARCHAR(100)')) successCount++; else failCount++;
        if (await addColumn('demo_bookings', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('demo_bookings', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('book_materials', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('book_materials', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('notices', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('notices', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('invoices', 'created_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('invoices', 'updated_at', 'TIMESTAMP DEFAULT NOW()')) successCount++; else failCount++;
        if (await addColumn('invoices', 'last_reminder_date', 'DATE')) successCount++; else failCount++;

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

            // Grade-based fees: a Grade belongs to a Course and carries the fee.
            try {
                await client.query(`
                    CREATE TABLE IF NOT EXISTS grades (
                        id SERIAL PRIMARY KEY,
                        course_id INTEGER,
                        name VARCHAR(100) NOT NULL,
                        monthly_fee NUMERIC DEFAULT 0,
                        currency VARCHAR(10) DEFAULT 'INR',
                        is_active BOOLEAN DEFAULT true,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    )
                `);
                console.log('[DB] ✓ Ensured grades table exists');
            } catch (error) {
                console.error('[DB] ✗ Failed to create grades table:', error.message);
            }

            // Which grade a student holds in each course they study (one per course).
            try {
                await client.query(`
                    CREATE TABLE IF NOT EXISTS student_course_grades (
                        id SERIAL PRIMARY KEY,
                        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        course_id INTEGER,
                        grade_id INTEGER,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW(),
                        UNIQUE(student_id, course_id)
                    )
                `);
                console.log('[DB] ✓ Ensured student_course_grades table exists');
            } catch (error) {
                console.error('[DB] ✗ Failed to create student_course_grades table:', error.message);
            }

            // Per-student discounts (course-level or batch-level, percentage).
            try {
                await client.query(`
                    CREATE TABLE IF NOT EXISTS student_discounts (
                        id SERIAL PRIMARY KEY,
                        student_id INTEGER NOT NULL,
                        discount_type TEXT NOT NULL CHECK (discount_type IN ('course', 'batch')),
                        course_id INTEGER,
                        batch_id INTEGER,
                        discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
                        reason TEXT,
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW(),
                        CONSTRAINT course_required CHECK (course_id IS NOT NULL),
                        CONSTRAINT batch_type_validation CHECK (
                            (discount_type = 'course' AND batch_id IS NULL) OR
                            (discount_type = 'batch' AND batch_id IS NOT NULL)
                        ),
                        CONSTRAINT unique_active_discount UNIQUE (student_id, discount_type, course_id, batch_id, is_active)
                    )
                `);
                await client.query(`CREATE INDEX IF NOT EXISTS idx_student_discounts_student ON student_discounts(student_id) WHERE is_active = TRUE`);
                await client.query(`CREATE INDEX IF NOT EXISTS idx_student_discounts_course ON student_discounts(course_id) WHERE is_active = TRUE`);
                console.log('[DB] ✓ Ensured student_discounts table exists');
            } catch (error) {
                console.error('[DB] ✗ Failed to create student_discounts table:', error.message);
            }

            // One-time password-reset codes (OTP). Channel-agnostic (emailed today,
            // WhatsApp later); stored hashed with a short expiry.
            try {
                await client.query(`
                    CREATE TABLE IF NOT EXISTS password_reset_otps (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER,
                        code_hash TEXT NOT NULL,
                        channel TEXT DEFAULT 'email',
                        expires_at TIMESTAMPTZ NOT NULL,
                        used BOOLEAN DEFAULT false,
                        attempts INTEGER DEFAULT 0,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )
                `);
                await client.query(`CREATE INDEX IF NOT EXISTS idx_pwreset_user ON password_reset_otps(user_id) WHERE used = false`);
                console.log('[DB] ✓ Ensured password_reset_otps table exists');
            } catch (error) {
                console.error('[DB] ✗ Failed to create password_reset_otps table:', error.message);
            }

            // First-login flag: everyone on the shared default password is asked to
            // set their own on first login. Adding the column defaults existing rows
            // to TRUE; admins are cleared (they set their own passwords).
            try {
                await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true`);
                await client.query(`UPDATE users SET must_change_password = false WHERE (LOWER(role) = 'admin' OR is_super_admin = true) AND must_change_password IS DISTINCT FROM false`);
                console.log('[DB] ✓ Ensured users.must_change_password column exists');
            } catch (error) {
                console.error('[DB] ✗ Failed to add must_change_password column:', error.message);
            }

            // Invoice course/grade/batch ids for clean course/batch/grade filtering.
            try {
                await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS course_id INTEGER`);
                await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS grade_id INTEGER`);
                await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS batch_id INTEGER`);
                await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_amount NUMERIC`);
                await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0`);
                await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0`);
                console.log('[DB] ✓ Ensured invoice course/grade/batch + discount columns exist');
            } catch (error) {
                console.error('[DB] ✗ Failed to add invoice columns:', error.message);
            }

            // fee_structures batch support.
            try {
                await client.query(`ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS batch_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[]`);
            } catch (error) {
                console.error('[DB] ✗ Failed to add fee_structures.batch_ids:', error.message);
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

            // Create invoice_payments table if not exists
            try {
                await client.query(`
                    CREATE TABLE IF NOT EXISTS invoice_payments (
                        id SERIAL PRIMARY KEY,
                        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
                        student_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                        amount DECIMAL(10,2),
                        payment_method VARCHAR(50) DEFAULT 'UPI',
                        transaction_id VARCHAR(255),
                        payment_date DATE,
                        proof_url TEXT,
                        status VARCHAR(50) DEFAULT 'submitted',
                        notes TEXT,
                        submitted_at TIMESTAMPTZ DEFAULT NOW(),
                        approved_at TIMESTAMPTZ,
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    )
                `);
                console.log('[DB] ✓ Ensured invoice_payments table exists');
            } catch (error) {
                console.error('[DB] ✗ Failed to create invoice_payments table:', error.message);
            }

            // --- Fee ledger (Phase 1) ---
            // invoice_payments is THE ledger: every rupee (cash at the office,
            // Razorpay, approved proof) is one row here, and an invoice is paid only
            // through it. Receipts, the collecting admin and reversals live here so
            // app, reports and the cash drawer always agree.
            try {
                const ledgerCols = [
                    ['receipt_number', 'VARCHAR(40)'],
                    ['collected_by', 'INTEGER'],
                    ['collected_by_name', 'TEXT'],
                    ['paid_at', 'TIMESTAMPTZ'],
                    ['reversed_at', 'TIMESTAMPTZ'],
                    ['reversed_by', 'INTEGER'],
                    ['reversed_by_name', 'TEXT'],
                    ['reversal_reason', 'TEXT'],
                ];
                for (const [col, type] of ledgerCols) {
                    await client.query(`ALTER TABLE invoice_payments ADD COLUMN IF NOT EXISTS ${col} ${type}`);
                }
                await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS prorated_from DATE`);
                await client.query(`CREATE SEQUENCE IF NOT EXISTS payment_receipt_seq START 1`);
                console.log('[DB] ✓ Fee ledger columns + receipt sequence ready');
            } catch (error) {
                console.error('[DB] ✗ Fee ledger columns failed:', error.message);
            }
            // Database-level duplicate locks. Each in its own try: if old duplicate
            // rows already exist the index can't be built — log it rather than stop
            // startup (the generator's own check still prevents new duplicates).
            try {
                await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uniq_invoice_student_course_period
                    ON invoices (student_id, course_id, billing_period) WHERE course_id IS NOT NULL`);
                console.log('[DB] ✓ Duplicate-bill lock (student + course + month)');
            } catch (error) {
                console.error('[DB] ✗ Duplicate-bill lock NOT created (existing duplicate bills?):', error.message);
            }
            try {
                await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uniq_payment_razorpay_txn
                    ON invoice_payments (transaction_id)
                    WHERE payment_method = 'Razorpay' AND transaction_id IS NOT NULL AND status = 'approved'`);
                console.log('[DB] ✓ Razorpay double-record lock');
            } catch (error) {
                console.error('[DB] ✗ Razorpay double-record lock NOT created:', error.message);
            }
            // Backfill: invoices marked paid before the ledger existed (the old
            // "Mark paid" flipped status only) get one ledger row each, so cash
            // collected in the past finally appears in collection reports.
            // Idempotent: only for paid invoices with no live ledger row.
            try {
                const orphans = await client.query(`
                    SELECT i.id, i.student_id, i.amount, i.payment_details, i.updated_at
                    FROM invoices i
                    WHERE LOWER(i.status) = 'paid'
                      AND NOT EXISTS (SELECT 1 FROM invoice_payments p
                                      WHERE p.invoice_id = i.id AND p.status = 'approved')`);
                let filled = 0;
                for (const o of orphans.rows) {
                    try {
                        const pd = (o.payment_details && typeof o.payment_details === 'object') ? o.payment_details : {};
                        const method = String(pd.payment_method || 'Offline').slice(0, 50);
                        const dateStr = /^\d{4}-\d{2}-\d{2}/.test(String(pd.payment_date || ''))
                            ? String(pd.payment_date).slice(0, 10) : null;
                        await client.query(
                            `INSERT INTO invoice_payments (invoice_id, student_id, amount, payment_method, transaction_id,
                                payment_date, status, approved_at, paid_at, notes, receipt_number)
                             VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, $7::date, CURRENT_DATE), 'approved',
                                COALESCE($7, NOW()), COALESCE($7, NOW()),
                                'Recorded automatically: marked paid before the payment ledger existed',
                                'NDA-R-' || lpad(nextval('payment_receipt_seq')::text, 6, '0'))`,
                            [o.id, o.student_id, o.amount, method, pd.transaction_id || null, dateStr, o.updated_at]
                        );
                        filled++;
                    } catch (e) {
                        console.error(`[DB] Ledger backfill skipped invoice #${o.id}:`, e.message);
                    }
                }
                // Earlier approved payments (Razorpay / approved proofs) get receipts too.
                const numbered = await client.query(`
                    UPDATE invoice_payments
                    SET receipt_number = 'NDA-R-' || lpad(nextval('payment_receipt_seq')::text, 6, '0'),
                        paid_at = COALESCE(paid_at, approved_at, submitted_at)
                    WHERE status = 'approved' AND receipt_number IS NULL`);
                if (filled || numbered.rowCount) {
                    console.log(`[DB] ✓ Ledger backfill: ${filled} paid invoice(s) recorded, ${numbered.rowCount} receipt number(s) assigned`);
                }
            } catch (error) {
                console.error('[DB] ✗ Ledger backfill failed:', error.message);
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

            // Drop restrictive CHECK constraint on notifications.type
            try {
                await client.query(`
                    ALTER TABLE IF EXISTS notifications
                    DROP CONSTRAINT IF EXISTS notifications_type_check
                `);
                console.log('[DB] ✓ Dropped notifications_type_check constraint');
            } catch (error) {
                console.error('[DB] ✗ Failed to drop notifications_type_check:', error.message);
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

    // Seed courses if the table exists but is empty
    try {
        await seedCourses();
    } catch (e) {
        console.log('[DB] Could not seed courses (table may not exist yet):', e.message);
    }

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
    app.use(express.json({
        limit: '50mb',
        // Keep the raw body so the Razorpay webhook can verify its HMAC signature.
        verify: (req, res, buf) => { req.rawBody = buf; }
    }));
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

    // --- Static File Serving for Uploads ---
    app.use('/uploads', express.static(UPLOADS_DIR));

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

    // --- Email & Notification Helpers ---
    // Send email in background (fire-and-forget, never blocks response)
    const sendEmailBackground = (to, name, subject, messageText) => {
        if (!mailTransporter) {
            console.log('[Email] Skipped (no transporter):', subject, 'to:', to);
            return;
        }
        mailTransporter.sendMail({
            from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
            to,
            subject,
            html: createEmailTemplate(name, subject, messageText)
        }).then(() => {
            console.log(`📧 Email sent: "${subject}" to ${to}`);
        }).catch(error => {
            console.error(`[Email] Failed "${subject}" to ${to}:`, error.message);
        });
    };

    // Where admin notification emails go (new registrations, demo bookings, etc.).
    const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'nadanaloga2026@gmail.com';

    // Send push notification via FCM (fire-and-forget)
    const sendPushNotification = async (userId, title, body) => {
        if (!firebaseMessaging) {
            console.log(`[Push] Firebase not configured, skipping push for user ${userId}`);
            return; // Firebase not configured, skip push
        }
        try {
            // Get user's active FCM tokens
            const result = await pool.query(
                'SELECT fcm_token FROM user_fcm_tokens WHERE user_id = $1 AND is_active = true',
                [userId]
            );
            if (result.rows.length === 0) {
                console.log(`[Push] No FCM tokens found for user ${userId}`);
                return; // No tokens registered for this user
            }
            console.log(`[Push] Found ${result.rows.length} FCM tokens for user ${userId}`);

            const tokens = result.rows.map(r => r.fcm_token);

            // Send to all user's devices
            const response = await firebaseMessaging.sendEachForMulticast({
                tokens: tokens,
                notification: {
                    title: title,
                    body: body,
                },
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'nadanaloga_notifications',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                        },
                    },
                },
            });

            // Deactivate invalid tokens
            response.responses.forEach((resp, idx) => {
                if (!resp.success && resp.error) {
                    const errorCode = resp.error.code;
                    if (errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered') {
                        pool.query(
                            'UPDATE user_fcm_tokens SET is_active = false WHERE fcm_token = $1',
                            [tokens[idx]]
                        ).catch(() => {});
                    }
                }
            });

            console.log(`📱 Push sent to user ${userId}: ${response.successCount} success, ${response.failureCount} failed`);
        } catch (error) {
            console.error(`[Push] Failed for user ${userId}:`, error.message);
        }
    };

    // Create in-app notification and send push (fire-and-forget)
    const createNotificationForUser = (userId, title, message, type = 'Info') => {
        const validTypes = ['Info', 'Warning', 'Success', 'Error'];
        if (!validTypes.includes(type)) type = 'Info';
        pool.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
            [userId, title, message, type]
        ).then(() => {
            // Send push notification after successfully creating in-app notification
            sendPushNotification(userId, title, message);
        }).catch(error => {
            console.error(`[Notification] Failed for user ${userId}:`, error.message);
        });
    };

    // Fetch users by IDs
    const getUsersByIds = async (ids) => {
        if (!ids || ids.length === 0) return [];
        const result = await pool.query(
            'SELECT id, name, email FROM users WHERE id = ANY($1) AND is_deleted = false',
            [ids]
        );
        return result.rows;
    };

    // Fetch all active students and teachers
    const getActiveUsers = async (roleFilter) => {
        if (roleFilter) {
            const result = await pool.query(
                "SELECT id, name, email FROM users WHERE is_deleted = false AND status = 'active' AND LOWER(role) = LOWER($1)",
                [roleFilter]
            );
            return result.rows;
        }
        const result = await pool.query(
            "SELECT id, name, email FROM users WHERE is_deleted = false AND status = 'active' AND LOWER(role) != 'admin'"
        );
        return result.rows;
    };

    // Fetch all active admins (including super admins)
    const getActiveAdmins = async () => {
        const result = await pool.query(
            "SELECT id, name, email FROM users WHERE is_deleted = false AND status = 'active' AND (LOWER(role) = 'admin' OR is_super_admin = true)"
        );
        return result.rows;
    };

    // Send a WhatsApp alert to the admin via Meta WhatsApp Cloud API. No-ops until
    // the env vars are set, so nothing breaks before onboarding is complete.
    // Requires an approved template with 3 body params: {{1}} name, {{2}} amount, {{3}} txn.
    const notifyAdminWhatsApp = async (studentName, amountStr, txnId, invoiceId) => {
        const token = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const adminNumber = process.env.WHATSAPP_ADMIN_NUMBER;
        const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
        const lang = process.env.WHATSAPP_TEMPLATE_LANG || 'en';
        if (!token || !phoneNumberId || !adminNumber || !templateName) return; // not configured
        try {
            const resp = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: adminNumber,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: lang },
                        components: [{
                            type: 'body',
                            parameters: [
                                { type: 'text', text: String(studentName) },
                                { type: 'text', text: String(amountStr) },
                                { type: 'text', text: String(txnId) },
                            ],
                        }],
                    },
                }),
            });
            if (!resp.ok) {
                const err = await resp.text();
                console.error('[WhatsApp] send failed:', resp.status, err);
            } else {
                console.log(`[WhatsApp] Admin alerted for invoice #${invoiceId}`);
            }
        } catch (e) {
            console.error('[WhatsApp] error:', e.message);
        }
    };

    // Assign a newly-created student's grade for each course, from a
    // [{course_id, grade_id}] list optionally sent at registration time.
    const assignCourseGradesForStudent = async (studentId, courseGrades) => {
        if (!Array.isArray(courseGrades)) return;
        for (const cg of courseGrades) {
            const courseId = cg.course_id ?? cg.courseId;
            const gradeId = cg.grade_id ?? cg.gradeId;
            if (!courseId || !gradeId) continue;
            try {
                await pool.query(
                    `INSERT INTO student_course_grades (student_id, course_id, grade_id)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (student_id, course_id)
                     DO UPDATE SET grade_id = EXCLUDED.grade_id, updated_at = NOW()`,
                    [studentId, courseId, gradeId]
                );
            } catch (e) {
                console.error('[Register] grade assign failed:', e.message);
            }
        }
    };

    // Create a profile linked to an existing account (the family head) so one
    // email can hold a teacher + her children, or a parent + several students.
    // The linked profile shares the family's single login: it gets a synthetic,
    // unique, non-functional email + random password (to satisfy the NOT NULL /
    // UNIQUE constraints) but nobody signs in as it. Returns the created row.
    const createLinkedFamilyProfile = async (existingAccountId, userData) => {
        const headRes = await pool.query('SELECT id, email, parent_id FROM users WHERE id = $1 AND is_deleted = false', [existingAccountId]);
        if (headRes.rows.length === 0) throw new Error('Existing account not found');
        const existing = headRes.rows[0];
        // Always link to the family head, never to another child.
        const headId = existing.parent_id || existing.id;
        let headEmail = existing.email;
        if (existing.parent_id) {
            const r = await pool.query('SELECT email FROM users WHERE id = $1', [headId]);
            headEmail = r.rows[0]?.email || existing.email;
        }

        const year = new Date().getFullYear();
        const seqResult = await pool.query(`SELECT nextval('user_id_seq') as seq`);
        const generatedUserId = `NDA-${year}-${String(seqResult.rows[0].seq).padStart(4, '0')}`;
        const syntheticEmail = (headEmail && headEmail.includes('@'))
            ? headEmail.replace('@', `+${generatedUserId.toLowerCase()}@`)
            : `${generatedUserId.toLowerCase()}@child.nadanaloga.local`;
        const placeholderPassword = await bcrypt.hash(uuidv4(), 10);

        const result = await pool.query(
            `INSERT INTO users (name, email, password, role, class_preference, photo_url, dob, sex, contact_number, address, date_of_joining, courses, father_name, standard, school_name, grade, notes, course_expertise, user_id, preferred_location_id, parent_id, display_name, is_primary)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, false) RETURNING *`,
            [
                userData.name,
                syntheticEmail,
                placeholderPassword,
                userData.role || 'Student',
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
                generatedUserId,
                userData.preferred_location_id || userData.preferredLocationId || null,
                headId,
                userData.display_name || userData.displayName || userData.name,
            ]
        );
        return result.rows[0];
    };

    // --- Fee due-date reminders ---------------------------------------------
    // Sends in-app + push + email reminders to students with unpaid invoices,
    // on a cadence around the due date (default: the 10th of the month). The
    // last_reminder_date column makes it idempotent — at most one reminder per
    // invoice per day, even if the job runs several times (restarts, retries).
    const daysBetween = (a, b) => Math.round((a.getTime() - b.getTime()) / 86400000);

    // Format/parse dates in LOCAL time (never UTC) so a positive-offset server
    // timezone doesn't shift the calendar day — that would break the
    // once-per-day idempotency guard and print off-by-one due dates.
    const toDateStr = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const parseLocalDate = (v) => {
        if (!v) return null;
        if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
        const [y, m, d] = String(v).split('T')[0].split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
    };

    // The effective due date: the invoice's own due_date, else the 10th of its
    // billing month (falling back to issue/created date, then today).
    const effectiveDueDate = (invoice) => {
        if (invoice.due_date) return parseLocalDate(invoice.due_date);
        const base = parseLocalDate(invoice.issue_date) || parseLocalDate(invoice.created_at) || new Date();
        return new Date(base.getFullYear(), base.getMonth(), 10);
    };

    // Reminder cadence relative to the due date: 3 and 1 days before, on the
    // day, then 1, 3 and every 7 days overdue.
    const shouldRemindToday = (due, today) => {
        const d = daysBetween(due, today); // days until due (negative = overdue)
        if (d === 3 || d === 1 || d === 0) return true;
        const overdue = -d;
        if (overdue > 0 && (overdue === 1 || overdue === 3 || overdue % 7 === 0)) return true;
        return false;
    };

    const runFeeReminders = async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = toDateStr(today);
        let sent = 0, considered = 0;

        const { rows } = await pool.query(`
            SELECT i.id, i.course_name, i.amount, i.currency, i.due_date, i.issue_date,
                   i.created_at, i.billing_period, i.last_reminder_date, i.status,
                   u.id AS student_id, u.name AS student_name, u.email AS student_email, u.parent_id,
                   p.id AS parent_id_real, p.name AS parent_name, p.email AS parent_email,
                   (SELECT ip.status FROM invoice_payments ip
                    WHERE ip.invoice_id = i.id ORDER BY ip.submitted_at DESC LIMIT 1) AS payment_status
            FROM invoices i
            JOIN users u ON i.student_id = u.id AND u.is_deleted = false
            LEFT JOIN users p ON u.parent_id = p.id AND p.is_deleted = false
            WHERE i.status IN ('pending', 'overdue')
        `);

        for (const inv of rows) {
            considered++;
            // Skip if a proof is already awaiting verification, or already reminded today.
            if (inv.payment_status === 'submitted') continue;
            if (inv.last_reminder_date && toDateStr(parseLocalDate(inv.last_reminder_date)) === todayStr) continue;

            const due = effectiveDueDate(inv);
            if (!shouldRemindToday(due, today)) continue;

            // Send to the account that can actually receive it: the parent for a
            // child profile, otherwise the student.
            const recipientId = inv.parent_id_real || inv.student_id;
            const recipientName = inv.parent_name || inv.student_name || 'Student';
            const recipientEmail = inv.parent_email || inv.student_email;
            const amount = `${inv.currency || 'INR'} ${inv.amount}`;
            const overdue = daysBetween(today, due) > 0;
            const forWhom = inv.parent_id_real ? ` for ${inv.student_name}` : '';
            const dueStr = toDateStr(due);

            const title = overdue ? 'Fee Payment Overdue' : 'Fee Payment Reminder';
            const shortMsg = overdue
                ? `Fee of ${amount}${forWhom} (${inv.course_name || 'classes'}) was due on ${dueStr}. Please pay at the earliest.`
                : `Fee of ${amount}${forWhom} (${inv.course_name || 'classes'}) is due by ${dueStr}. Please pay and upload the receipt in the app.`;

            try {
                createNotificationForUser(recipientId, title, shortMsg, overdue ? 'Warning' : 'Info');
                if (recipientEmail) {
                    const body = `Dear ${recipientName},\n\n${shortMsg}\n\n📋 Invoice #${inv.id}\n📚 Course: ${inv.course_name || 'Not specified'}\n💰 Amount: ${amount}\n📅 Due: ${dueStr}\n\nYou can pay via UPI (GPay / PhonePe / CRED) and upload the payment receipt in the app. We'll confirm once verified.\n\nBest regards,\nNadanaloga Academy Team`;
                    sendEmailBackground(recipientEmail, recipientName, `${title} - Invoice #${inv.id}`, body);
                }
                await pool.query('UPDATE invoices SET last_reminder_date = $1 WHERE id = $2', [todayStr, inv.id]);
                sent++;
            } catch (e) {
                console.error(`[FeeReminders] Failed for invoice #${inv.id}:`, e.message);
            }
        }
        console.log(`[FeeReminders] Considered ${considered} unpaid invoice(s), sent ${sent} reminder(s).`);
        return { considered, sent };
    };

    // --- Auto monthly invoice generation ------------------------------------
    const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    // Choose the best fee structure for a student's course, by grade then batch.
    // A structure with a specific grade only applies if it matches the student's
    // grade; a structure with no grade is a generic fallback.
    const pickBestFeeStructure = (candidates, grade, batchIds) => {
        const g = (grade || '').trim().toLowerCase();
        const eligible = candidates.filter((c) => {
            const cg = (c.grade || '').trim().toLowerCase();
            return !cg || cg === g;
        });
        const search = eligible.length ? eligible : candidates;
        let best = null, bestScore = -1;
        for (const c of search) {
            const cg = (c.grade || '').trim().toLowerCase();
            let score = 0;
            if (cg && cg === g) score += 2;
            if (Array.isArray(c.batch_ids) && c.batch_ids.some((b) => batchIds.includes(b))) score += 1;
            if (score > bestScore) { bestScore = score; best = c; }
        }
        return best;
    };

    // Create this month's invoice for every active student, from their course +
    // grade + batch fee. Idempotent: one invoice per student+course+month.
    const generateMonthlyInvoices = async () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const billingPeriod = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
        const monthFirst = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthTenth = new Date(now.getFullYear(), now.getMonth(), 10);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        // Grade-based fees: a student's grade in each course.
        const gradeMapRes = await pool.query(`
            SELECT scg.student_id, scg.course_id, scg.grade_id, c.name AS course_name,
                   g.name AS grade_name, g.monthly_fee
            FROM student_course_grades scg
            LEFT JOIN courses c ON scg.course_id = c.id
            LEFT JOIN grades g ON scg.grade_id = g.id
            WHERE g.is_active = true
        `);
        const gradeFeesByStudent = {};
        gradeMapRes.rows.forEach((r) => { (gradeFeesByStudent[r.student_id] = gradeFeesByStudent[r.student_id] || []).push(r); });

        const batchRes = await pool.query('SELECT id, course_id, student_ids FROM batches');
        // Resolve which batch a student belongs to for a given course (for invoice filtering).
        const resolveBatchId = (studentId, courseId) => {
            if (!courseId) return null;
            const b = batchRes.rows.find((r) =>
                r.course_id === courseId && Array.isArray(r.student_ids) && r.student_ids.includes(studentId));
            return b ? b.id : null;
        };

        const students = await pool.query(
            `SELECT id, name, date_of_joining FROM users
             WHERE LOWER(TRIM(role)) = 'student' AND is_deleted = false AND (status IS NULL OR LOWER(status) = 'active')`
        );

        let created = 0, skipped = 0, prorated = 0, notYetJoined = 0;
        const newLines = []; // for one "fees ready" message per family

        // Create one idempotent, discount-aware, pro-rata-aware bill line.
        const createLine = async (student, courseName, courseId, monthly, gradeId, batchId, terms) => {
            if (!monthly || monthly <= 0) return;
            // Duplicate check by COURSE (not the "Course - Grade" label: a grade change
            // mid-month renamed the label and produced a second bill). Legacy rows with
            // no course_id still match by label. The unique index backs this up.
            const exists = await pool.query(
                `SELECT id FROM invoices WHERE student_id = $1 AND billing_period = $2
                   AND ((course_id IS NOT NULL AND course_id = $3) OR (course_id IS NULL AND course_name = $4))
                 LIMIT 1`,
                [student.id, billingPeriod, courseId || null, courseName]
            );
            if (exists.rows.length > 0) { skipped++; return; }
            const base = Math.round(monthly * terms.factor);
            let discountPct = null, discountAmt = null, finalAmount = base;
            if (courseId) {
                const dRes = await pool.query(
                    `SELECT discount_percentage FROM student_discounts
                     WHERE student_id = $1 AND course_id = $2 AND is_active = TRUE
                     ORDER BY CASE WHEN discount_type = 'batch' THEN 1 ELSE 2 END, discount_percentage DESC LIMIT 1`,
                    [student.id, courseId]
                );
                if (dRes.rows.length > 0) {
                    discountPct = parseFloat(dRes.rows[0].discount_percentage);
                    discountAmt = Math.round((base * discountPct) / 100);
                    finalAmount = base - discountAmt;
                }
            }
            try {
                const inv = await pool.query(
                    `INSERT INTO invoices (student_id, fee_structure_id, course_name, amount, currency, issue_date, due_date,
                        billing_period, status, original_amount, discount_percentage, discount_amount, course_id, grade_id,
                        batch_id, prorated_from)
                     VALUES ($1, NULL, $2, $3, 'INR', $4, $5, $6, 'pending', $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
                    [student.id, courseName, finalAmount, terms.issueDate, terms.dueDate, billingPeriod, base,
                        discountPct, discountAmt, courseId || null, gradeId || null, batchId || null, terms.proratedFrom]
                );
                created++;
                if (terms.proratedFrom) prorated++;
                newLines.push({ studentId: student.id, studentName: student.name, courseName, amount: finalAmount, dueDate: terms.dueDate });
                console.log(`[MonthlyInvoices] Invoice #${inv.rows[0].id} for ${student.name} (${courseName}) ${billingPeriod}${terms.proratedFrom ? ` pro-rata from ${terms.proratedFrom}` : ''}`);
            } catch (e) {
                if (e.code === '23505') { skipped++; return; } // another run created it first
                throw e;
            }
        };

        // Fees are grade-based only. A student with no grade assigned gets no bill
        // (Fees Management lists them as "Fee not set up").
        let noGrade = 0;
        for (const s of students.rows) {
            const joined = s.date_of_joining ? parseLocalDate(s.date_of_joining) : null;
            if (joined && joined > today) { notYetJoined++; continue; } // not started yet
            // Pro-rata for a student who joins partway through THIS month: bill the
            // remaining days, from the joining date; due the later of the 10th or a week
            // after joining. Everyone else: full month, issued the 1st, due the 10th.
            const joinedThisMonth = joined && joined.getFullYear() === now.getFullYear()
                && joined.getMonth() === now.getMonth() && joined.getDate() > 1;
            let terms;
            if (joinedThisMonth) {
                const weekAfter = new Date(joined.getFullYear(), joined.getMonth(), joined.getDate() + 7);
                terms = {
                    factor: (daysInMonth - joined.getDate() + 1) / daysInMonth,
                    issueDate: toDateStr(joined),
                    dueDate: toDateStr(weekAfter > monthTenth ? weekAfter : monthTenth),
                    proratedFrom: toDateStr(joined),
                };
            } else {
                terms = { factor: 1, issueDate: toDateStr(monthFirst), dueDate: toDateStr(monthTenth), proratedFrom: null };
            }
            const gradeFees = gradeFeesByStudent[s.id];
            if (gradeFees && gradeFees.length > 0) {
                for (const gf of gradeFees) {
                    const label = `${gf.course_name || 'Course'} - ${gf.grade_name || 'Grade'}`;
                    await createLine(s, label, gf.course_id, Number(gf.monthly_fee), gf.grade_id,
                        resolveBatchId(s.id, gf.course_id), terms);
                }
            } else {
                noGrade++;
            }
        }

        // One "fees ready" message per family (not one per bill), to the parent.
        (async () => {
            try {
                const byContact = new Map();
                for (const line of newLines) {
                    const c = await resolveFeeContact(line.studentId);
                    if (!c) continue;
                    if (!byContact.has(c.userId)) byContact.set(c.userId, { contact: c, lines: [] });
                    byContact.get(c.userId).lines.push(line);
                }
                for (const { contact, lines } of byContact.values()) {
                    const total = lines.reduce((s, l) => s + Number(l.amount || 0), 0);
                    const who = [...new Set(lines.map(l => l.studentName))].join(', ');
                    const due = lines.map(l => l.dueDate).sort()[0];
                    createNotificationForUser(contact.userId, `${billingPeriod} fees ready`,
                        `${inr(total)} for ${who}. Please pay by ${due}.`, 'Info');
                }
            } catch (e) { console.error('[MonthlyInvoices] fee-ready notify failed:', e.message); }
        })();

        console.log(`[MonthlyInvoices] ${billingPeriod}: created ${created} (${prorated} pro-rata), skipped ${skipped} (existed), ${noGrade} with no grade, ${notYetJoined} not yet joined.`);
        return { billingPeriod, created, prorated, skipped, noGrade, notYetJoined };
    };

    // Manual trigger so an admin can generate this month's invoices on demand.
    app.post('/api/admin/generate-monthly-invoices', ensureAdmin, async (req, res) => {
        try {
            const result = await generateMonthlyInvoices();
            res.json({ message: 'Monthly invoices generated.', ...result });
        } catch (error) {
            console.error('Error generating monthly invoices:', error);
            res.status(500).json({ message: 'Server error generating monthly invoices.' });
        }
    });

    // Manual trigger so an admin can fire the reminder run on demand.
    app.post('/api/admin/run-fee-reminders', ensureAdmin, async (req, res) => {
        try {
            const result = await runFeeReminders();
            res.json({ message: 'Fee reminders processed.', ...result });
        } catch (error) {
            console.error('Error running fee reminders:', error);
            res.status(500).json({ message: 'Server error running fee reminders.' });
        }
    });

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
            
            const existingUserResult = await pool.query('SELECT id, is_deleted FROM users WHERE email = $1', [normalizedEmail]);
            if (existingUserResult.rows.length > 0) {
                const existingUser = existingUserResult.rows[0];
                if (existingUser.is_deleted) {
                    // Re-activate soft-deleted user: update their data and un-delete
                    if (!password) return res.status(400).json({ message: 'Password is required.' });
                    const hashedPassword = await bcrypt.hash(password, 10);
                    if (normalizedEmail === 'admin@nadanaloga.com') userData.role = 'Admin';
                    const result = await pool.query(
                        `UPDATE users SET name=$1, password=$2, role=$3, class_preference=$4, photo_url=$5, dob=$6, sex=$7, contact_number=$8, address=$9, date_of_joining=$10, courses=$11, father_name=$12, standard=$13, school_name=$14, grade=$15, notes=$16, course_expertise=$17, educational_qualifications=$18, employment_type=$19, is_deleted=false, deleted_at=NULL, preferred_location_id=$20, parent_id=$21, display_name=$22, is_primary=$23 WHERE id=$24 RETURNING *`,
                        [
                            userData.name, hashedPassword, userData.role || 'Student',
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
                            userData.preferred_location_id || userData.preferredLocationId || null,
                            userData.parent_id || userData.parentId || null,
                            userData.display_name || userData.displayName || userData.name,
                            userData.is_primary !== undefined ? userData.is_primary : (userData.isPrimary !== undefined ? userData.isPrimary : true),
                            existingUser.id
                        ]
                    );
                    const reactivatedUser = result.rows[0];
                    const parsedUser = {
                        ...reactivatedUser,
                        courses: safeJsonArray(reactivatedUser.courses),
                        course_expertise: safeJsonArray(reactivatedUser.course_expertise)
                    };
                    delete parsedUser.password;
                    return res.status(201).json(parsedUser);
                }
                // Email already belongs to an active account → attach this person
                // as a linked family profile (shared single login) rather than
                // rejecting, so a teacher + her children / a parent + multiple
                // students can all share one email.
                try {
                    const linked = await createLinkedFamilyProfile(existingUser.id, { ...userData });
                    await assignCourseGradesForStudent(linked.id, userData.course_grades || userData.courseGrades);
                    const parsedLinked = {
                        ...linked,
                        courses: safeJsonArray(linked.courses),
                        course_expertise: safeJsonArray(linked.course_expertise)
                    };
                    delete parsedLinked.password;
                    return res.status(201).json(parsedLinked);
                } catch (attachErr) {
                    console.error('[Register] Failed to attach to family:', attachErr.message);
                    return res.status(409).json({ message: 'This email is already registered. Please try logging in.' });
                }
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
                'INSERT INTO users (name, email, password, role, class_preference, photo_url, dob, sex, contact_number, address, date_of_joining, courses, father_name, standard, school_name, grade, notes, course_expertise, educational_qualifications, employment_type, user_id, preferred_location_id, parent_id, display_name, is_primary) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25) RETURNING *',
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
                    userData.preferred_location_id || userData.preferredLocationId || null,
                    userData.parent_id || userData.parentId || null,
                    userData.display_name || userData.displayName || userData.name,
                    userData.is_primary !== undefined ? userData.is_primary : (userData.isPrimary !== undefined ? userData.isPrimary : true)
                ]
            );

            // Parse JSON fields before returning
            const newUser = result.rows[0];

            // Set super admin for primary admin email
            if (normalizedEmail === 'admin@nadanaloga.com') {
                await pool.query('UPDATE users SET is_super_admin = true WHERE id = $1', [newUser.id]);
                newUser.is_super_admin = true;
            }

            // Admin may assign a grade per course at registration time.
            await assignCourseGradesForStudent(newUser.id, userData.course_grades || userData.courseGrades);

            const parsedUser = {
                ...newUser,
                courses: safeJsonArray(newUser.courses),
                course_expertise: safeJsonArray(newUser.course_expertise)
            };
            delete parsedUser.password;

            // Create in-app notifications server-side
            // Note: type must be one of 'Info','Warning','Success','Error' due to DB CHECK constraint
            try {
                // Notification for the new user
                await pool.query(
                    `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
                    [newUser.id, 'Welcome to Nadanaloga Academy!', `Registration successful for ${userData.name}. Your application is being reviewed by our admin team.`, 'Success']
                );

                // Notification for admin(s)
                const admins = await pool.query(`SELECT id FROM users WHERE role = 'Admin' AND is_deleted = false`);
                for (const admin of admins.rows) {
                    await pool.query(
                        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
                        [admin.id, 'New Student Registration', `New student ${userData.name} (${normalizedEmail}) has registered. Please review their application.`, 'Info']
                    );
                }
            } catch (notifError) {
                console.error('Error creating registration notifications:', notifError.message);
            }

            // Email the registrant + admin on EVERY registration path (web, mobile,
            // self-register, admin-add) — sent server-side so it never depends on the client.
            try {
                const coursesList = (safeJsonArray(userData.courses).length > 0)
                    ? safeJsonArray(userData.courses).join(', ')
                    : 'No specific courses selected';
                const welcomeMsg = `Thank you for registering with Nadanaloga Academy!\n\n` +
                    `Your registration has been received:\n\n` +
                    `Name: ${userData.name}\nEmail: ${normalizedEmail}\n` +
                    `Courses: ${coursesList}\nContact: ${userData.contact_number || userData.contactNumber || 'Not provided'}\n\n` +
                    `Our team will review your application and get in touch about class schedules. Welcome to the Nadanaloga family!`;
                sendEmailBackground(normalizedEmail, userData.name || 'Student', 'Welcome to Nadanaloga Academy!', welcomeMsg);

                const adminMsg = `A new ${userData.role || 'Student'} has registered:\n\n` +
                    `Name: ${userData.name}\nEmail: ${normalizedEmail}\n` +
                    `Contact: ${userData.contact_number || userData.contactNumber || 'Not provided'}\n` +
                    `Courses: ${coursesList}\n\nPlease review them in the admin panel.`;
                sendEmailBackground(ADMIN_NOTIFY_EMAIL, 'Admin', 'New Registration - Nadanaloga Academy', adminMsg);
            } catch (mailErr) {
                console.error('[Register] email error:', mailErr.message);
            }

            res.status(201).json(parsedUser);
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Server error during registration.' });
        }
    });

    // Phone numbers are stored exactly as they were typed ("+91 98765 43210",
    // "098765...", "9876543210"), so an exact digits comparison misses most
    // variants and the user sees "Invalid credentials" with the right password.
    // Compare the LAST 10 DIGITS (the significant part of an Indian mobile
    // number), falling back to an exact match for shorter/odd numbers.
    // `param` is the SQL placeholder holding the digits-only typed number.
    // Hoisted so every query below can use it.
    function phoneMatchSql(param) {
        const digitsOf = `regexp_replace(COALESCE(contact_number, ''), '\\D', '', 'g')`;
        return `((length(${digitsOf}) >= 10 AND length(${param}) >= 10
                  AND right(${digitsOf}, 10) = right(${param}, 10))
                 OR ${digitsOf} = ${param})`;
    }

    // Every switchable profile behind one identity. Identity = the phone number:
    // all non-deleted accounts sharing it (a teacher who is also a student, etc.)
    // plus every child profile linked to any of them. One shared password
    // unlocks the whole set; the app shows a "Continue as…" picker.
    // Hoisted function declaration so both /api/login and /api/switch-profile can use it.
    async function buildProfilesForUser(user) {
        const digits = String(user.contact_number || '').replace(/\D/g, '');
        const cols = 'id, name, display_name, role, photo_url, courses, grade, parent_id';
        let rows;
        if (digits.length >= 7) {
            rows = (await pool.query(
                `SELECT ${cols} FROM users
                 WHERE is_deleted = false AND (
                    ${phoneMatchSql('$1')}
                    OR parent_id IN (
                        SELECT id FROM users
                        WHERE ${phoneMatchSql('$1')}
                          AND is_deleted = false
                    )
                 )
                 ORDER BY parent_id NULLS FIRST, COALESCE(display_name, name)`,
                [digits]
            )).rows;
        } else {
            // No usable phone on this account: just itself and its own children.
            rows = (await pool.query(
                `SELECT ${cols} FROM users
                 WHERE is_deleted = false AND (id = $1 OR parent_id = $1)
                 ORDER BY parent_id NULLS FIRST, COALESCE(display_name, name)`,
                [user.id]
            )).rows;
        }
        const seen = new Set();
        const profiles = [];
        for (const r of rows) {
            if (seen.has(r.id)) continue;
            seen.add(r.id);
            const role = String(r.role || 'Student');
            profiles.push({
                id: r.id,
                name: r.display_name || r.name,
                role: role.charAt(0).toUpperCase() + role.slice(1).toLowerCase(),
                kind: r.parent_id ? 'child' : 'self',
                photo_url: r.photo_url || null,
                courses: safeJsonArray(r.courses),
                grade: r.grade || null,
            });
        }
        return profiles;
    }

    // The household behind the current session: every profile sharing the phone
    // number (the adult's own roles + all children). Computed on demand from the
    // session user — not from ids stored at login — so restored/older sessions
    // work too. Used by the household endpoints and by pay/proof authorization.
    async function householdFor(req) {
        const me = req.session.user;
        const profiles = me ? await buildProfilesForUser(me) : [];
        const students = profiles.filter(p => p.role === 'Student');
        const teacher = profiles.find(p => p.role === 'Teacher' && p.kind === 'self') || null;
        const nameById = {};
        for (const p of profiles) nameById[p.id] = p.name;
        return {
            profiles,
            memberIds: profiles.map(p => p.id),
            studentIds: students.map(p => p.id),
            nameById,
            teacher,
        };
    }

    app.post('/api/login', async (req, res) => {
        try {
            const { email, password, identifier } = req.body;
            // Support login by email or userId (identifier field)
            // identifier takes priority; falls back to email for backward compatibility
            const loginId = identifier || email;
            if (!loginId || !password) {
                return res.status(400).json({ message: 'Email/User ID and password are required.' });
            }

            // Detect how the user is logging in: User ID, phone number, or email
            const trimmedLoginId = loginId.trim();
            const phoneDigits = trimmedLoginId.replace(/\D/g, ''); // strip spaces, +, -, ()

            let result;
            if (trimmedLoginId.toUpperCase().startsWith('NDA-')) {
                // Login by user_id
                result = await pool.query('SELECT * FROM users WHERE user_id = $1 AND is_deleted = false', [trimmedLoginId.toUpperCase()]);
            } else if (!trimmedLoginId.includes('@') && /^\d{7,}$/.test(phoneDigits)) {
                // Login by phone number (contact_number). Compare digits-only on both sides so
                // formatting differences (spaces, +91, etc.) don't matter. May return multiple
                // rows when a family shares one phone number — resolved by password below.
                result = await pool.query(
                    `SELECT * FROM users WHERE ${phoneMatchSql('$1')} AND is_deleted = false`,
                    [phoneDigits]
                );
            } else {
                // Login by email
                result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_deleted = false', [trimmedLoginId.toLowerCase()]);
            }

            if (result.rows.length === 0) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }

            // Find the account whose password matches. With email/user_id this is the single
            // row; with a shared phone number it picks the family member whose password fits.
            let user = null;
            for (const candidate of result.rows) {
                if (await bcrypt.compare(password, candidate.password)) {
                    user = candidate;
                    break;
                }
            }
            if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

            delete user.password;

            // Normalize role to title case (e.g., 'admin' → 'Admin')
            if (user.role) {
                // trim(): a role stored as 'Teacher ' used to come back as
                // 'Teacher ' and fail every exact role comparison in the apps
                // (routing sent the user straight back to the login screen).
                const r = user.role.trim();
                user.role = r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
            }

            // Parse JSON fields before returning
            const parsedUser = {
                ...user,
                courses: safeJsonArray(user.courses),
                course_expertise: safeJsonArray(user.course_expertise)
            };

            // Fetch any linked child profiles (parent_id = this account). This applies to
            // ANY primary account — a Parent, or a Teacher/Student who is also a parent —
            // so a single login surfaces every profile in the family. Child profiles have
            // no login of their own; they are switched to inside the primary's dashboard.
            const childrenResult = await pool.query(
                'SELECT id, display_name, name, grade, courses, photo_url, status FROM users WHERE parent_id = $1 AND is_deleted = false ORDER BY display_name',
                [parsedUser.id]
            );
            if (childrenResult.rows.length > 0) {
                parsedUser.students = childrenResult.rows.map(child => ({
                    ...child,
                    courses: safeJsonArray(child.courses)
                }));
                console.log(`[Login] Account ${parsedUser.id} (${parsedUser.role}) has ${parsedUser.students.length} linked child profile(s)`);
            }

            // All switchable profiles behind this identity (grouped by phone number).
            // Remembered in the session so /api/switch-profile can only move between
            // profiles this login actually unlocked.
            const profiles = await buildProfilesForUser(parsedUser);
            parsedUser.profiles = profiles;
            req.session.profileIds = profiles.map(p => p.id);
            req.session.profiles = profiles;

            req.session.user = parsedUser;
            res.json(parsedUser);
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Server error during login.' });
        }
    });

    // Find account(s) by phone / email / NDA-id (same rules as login).
    const findAccountsByIdentifier = async (identifier) => {
        const id = String(identifier || '').trim();
        const digits = id.replace(/\D/g, '');
        if (id.toUpperCase().startsWith('NDA-')) {
            return (await pool.query('SELECT * FROM users WHERE user_id = $1 AND is_deleted = false', [id.toUpperCase()])).rows;
        } else if (!id.includes('@') && /^\d{7,}$/.test(digits)) {
            return (await pool.query(`SELECT * FROM users WHERE ${phoneMatchSql('$1')} AND is_deleted = false`, [digits])).rows;
        }
        return (await pool.query('SELECT * FROM users WHERE email = $1 AND is_deleted = false', [id.toLowerCase()])).rows;
    };
    // The primary login account for a match (a shared phone can return a family).
    const pickPrimaryAccount = (rows) =>
        rows.find(r => (r.is_primary !== false) && r.email && r.email.includes('@') && !r.email.includes('@child.nadanaloga.local'))
        || rows.find(r => r.email && r.email.includes('@') && !r.email.includes('@child.nadanaloga.local'))
        || rows[0];
    const maskEmail = (e) => {
        if (!e || !e.includes('@')) return null;
        const [u, d] = e.split('@');
        return `${u.slice(0, 1)}${'*'.repeat(Math.max(1, u.length - 1))}@${d}`;
    };

    // Step 1: request a reset code (emailed today; WhatsApp/SMS can be added later).
    app.post('/api/forgot-password', async (req, res) => {
        try {
            const { identifier } = req.body;
            if (!identifier) return res.status(400).json({ message: 'Enter your phone number, email, or ID.' });
            const account = pickPrimaryAccount(await findAccountsByIdentifier(identifier));
            if (account && account.email && account.email.includes('@') && !account.email.includes('@child.nadanaloga.local')) {
                const code = String(Math.floor(100000 + Math.random() * 900000));
                const codeHash = await bcrypt.hash(code, 10);
                const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
                await pool.query('UPDATE password_reset_otps SET used = true WHERE user_id = $1 AND used = false', [account.id]);
                await pool.query(
                    'INSERT INTO password_reset_otps (user_id, code_hash, channel, expires_at) VALUES ($1, $2, $3, $4)',
                    [account.id, codeHash, 'email', expiresAt]
                );
                sendEmailBackground(account.email, account.name || 'there', 'Nadanaloga Password Reset Code',
                    `Your Nadanaloga password reset code is ${code}\n\nThis code expires in 10 minutes. If you did not request a password reset, please ignore this email.`);
                return res.json({ success: true, message: 'A reset code has been sent to your email.', channel: 'email', emailHint: maskEmail(account.email) });
            }
            // Don't reveal whether the account exists.
            res.json({ success: true, message: 'If an account exists, a reset code has been sent to its email.', channel: 'email', emailHint: null });
        } catch (error) {
            console.error('forgot-password error:', error);
            res.status(500).json({ message: 'Server error requesting reset code.' });
        }
    });

    // Step 2: verify the code and set a new password.
    app.post('/api/reset-password', async (req, res) => {
        try {
            const { identifier, otp, password } = req.body;
            if (!identifier || !otp || !password) return res.status(400).json({ message: 'Identifier, code and new password are required.' });
            if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
            const account = pickPrimaryAccount(await findAccountsByIdentifier(identifier));
            if (!account) return res.status(400).json({ message: 'Invalid code or account.' });
            const otpRow = (await pool.query(
                'SELECT * FROM password_reset_otps WHERE user_id = $1 AND used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
                [account.id]
            )).rows[0];
            if (!otpRow) return res.status(400).json({ message: 'Code expired or not found. Please request a new one.' });
            if (otpRow.attempts >= 5) return res.status(429).json({ message: 'Too many attempts. Please request a new code.' });
            const ok = await bcrypt.compare(String(otp).trim(), otpRow.code_hash);
            if (!ok) {
                await pool.query('UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = $1', [otpRow.id]);
                return res.status(400).json({ message: 'Incorrect code.' });
            }
            const hashed = await bcrypt.hash(password, 10);
            await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashed, account.id]);
            await pool.query('UPDATE password_reset_otps SET used = true WHERE id = $1', [otpRow.id]);
            res.json({ success: true, message: 'Password updated. You can now log in with your new password.' });
        } catch (error) {
            console.error('reset-password error:', error);
            res.status(500).json({ message: 'Server error resetting password.' });
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

If you have any questions, feel free to contact us at nadanaloga2026@gmail.com.

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
                    to: 'nadanaloga2026@gmail.com',
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

            const existingUserResult = await pool.query('SELECT id, is_deleted FROM users WHERE email = $1', [normalizedEmail]);
            if (existingUserResult.rows.length > 0) {
                const existingUser = existingUserResult.rows[0];
                if (existingUser.is_deleted) {
                    // Re-activate soft-deleted user
                    if (!password) return res.status(400).json({ message: 'Password is required.' });
                    const hashedPassword = await bcrypt.hash(password, 10);
                    if (normalizedEmail === 'admin@nadanaloga.com') userData.role = 'Admin';
                    const result = await pool.query(
                        `UPDATE users SET name=$1, password=$2, role=$3, class_preference=$4, photo_url=$5, dob=$6, sex=$7, contact_number=$8, address=$9, date_of_joining=$10, courses=$11, father_name=$12, standard=$13, school_name=$14, grade=$15, notes=$16, course_expertise=$17, educational_qualifications=$18, employment_type=$19, is_deleted=false, deleted_at=NULL WHERE id=$20 RETURNING id`,
                        [
                            userData.name, hashedPassword, userData.role || 'Student',
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
                            existingUser.id
                        ]
                    );
                    // Continue with the same newUserId flow for email sending etc.
                    const newUserId = result.rows[0].id;
                    console.log('[DEBUG] Re-activated soft-deleted user with ID:', newUserId);
                    // Skip to sending emails - return early after email logic
                    res.status(201).json({ id: newUserId, message: 'Registration successful (re-activated).' });
                    return;
                }
                // Email already in use → attach as a linked family profile (shared login).
                try {
                    const linked = await createLinkedFamilyProfile(existingUser.id, { ...userData });
                    return res.status(201).json({ id: linked.id, message: 'Registration successful (added to family).' });
                } catch (attachErr) {
                    console.error('[RegisterWithEmail] Failed to attach to family:', attachErr.message);
                    return res.status(409).json({ message: 'This email is already registered. Please try logging in.' });
                }
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

If you have any questions, feel free to contact us at nadanaloga2026@gmail.com.

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
                        to: 'nadanaloga2026@gmail.com',
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
    const parseUserData = (user) => {
        // Never expose the password hash in any API response.
        const { password, ...rest } = user;
        return {
            ...rest,
            courses: safeJsonArray(user.courses),
            course_expertise: safeJsonArray(user.course_expertise)
        };
    };

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

            // Enrich students with their per-course grade summary + batch names (for list tiles).
            const studentIds = users
                .filter(u => String(u.role).toLowerCase() === 'student')
                .map(u => u.id);
            if (studentIds.length > 0) {
                const gradeRows = await pool.query(
                    `SELECT scg.student_id, scg.course_id, c.name AS course_name, g.name AS grade_name,
                            g.monthly_fee, g.currency,
                            (SELECT sd.discount_percentage FROM student_discounts sd
                             WHERE sd.student_id = scg.student_id AND sd.course_id = scg.course_id AND sd.is_active = TRUE
                             ORDER BY CASE WHEN sd.discount_type = 'batch' THEN 1 ELSE 2 END, sd.discount_percentage DESC
                             LIMIT 1) AS discount_percentage
                     FROM student_course_grades scg
                     LEFT JOIN courses c ON scg.course_id = c.id
                     LEFT JOIN grades g ON scg.grade_id = g.id
                     WHERE scg.student_id = ANY($1)`, [studentIds]);
                const gradeMap = new Map();
                for (const r of gradeRows.rows) {
                    if (!gradeMap.has(r.student_id)) gradeMap.set(r.student_id, []);
                    const fee = Number(r.monthly_fee || 0);
                    const pct = r.discount_percentage != null ? Number(r.discount_percentage) : 0;
                    const net = pct > 0 ? fee - (fee * pct) / 100 : fee;
                    gradeMap.get(r.student_id).push({
                        course_name: r.course_name,
                        grade_name: r.grade_name,
                        monthly_fee: r.monthly_fee,
                        currency: r.currency,
                        discount_percentage: pct,
                        net_amount: net,
                    });
                }
                const batchRows = await pool.query('SELECT batch_name, student_ids FROM batches');
                const batchMap = new Map();
                for (const b of batchRows.rows) {
                    const ids = Array.isArray(b.student_ids) ? b.student_ids : [];
                    for (const sid of ids) {
                        if (!batchMap.has(sid)) batchMap.set(sid, []);
                        batchMap.get(sid).push(b.batch_name);
                    }
                }
                // Most recent paid invoice per student (for "last paid").
                const paidRows = await pool.query(
                    `SELECT student_id, MAX(COALESCE(updated_at, created_at)) AS last_paid
                     FROM invoices WHERE LOWER(status) = 'paid' AND student_id = ANY($1)
                     GROUP BY student_id`, [studentIds]);
                const paidMap = new Map(paidRows.rows.map(r => [r.student_id, r.last_paid]));
                for (const u of users) {
                    if (String(u.role).toLowerCase() === 'student') {
                        u.course_grades = gradeMap.get(u.id) || [];
                        u.batch_names = batchMap.get(u.id) || [];
                        u.last_paid = paidMap.get(u.id) || null;
                    }
                }
            }

            res.json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ message: 'Server error fetching users.' });
        }
    });

    // Authenticated "family" list for the student/parent dashboards: every STUDENT
    // in the household (all accounts sharing the phone number + their children).
    // A teacher role is deliberately excluded here — these pages treat every row
    // as a student; teaching lives on its own card/dashboard. A lone student
    // always sees at least themselves.
    app.get('/api/family', ensureAuthenticated, async (req, res) => {
        try {
            const { studentIds } = await householdFor(req);
            const ids = studentIds.length ? studentIds : [req.session.user.id];
            const rows = (await pool.query(
                'SELECT * FROM users WHERE id = ANY($1) AND is_deleted = false ORDER BY parent_id NULLS FIRST, COALESCE(display_name, name)',
                [ids]
            )).rows;
            res.json(rows.map(parseUserData));
        } catch (error) {
            console.error('Error fetching family:', error);
            res.status(500).json({ message: 'Server error fetching family.' });
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

    // Add a child profile linked to a primary account. The child has no usable login
    // of its own (a synthetic internal email + random password satisfy the NOT NULL /
    // UNIQUE constraints, but no one signs in as the child). The family logs in with
    // the primary account's real email and switches between profiles. This is how one
    // email — a teacher who is also a parent, or a parent with several children — can
    // hold multiple people without colliding on the unique email.
    app.post('/api/users/:id/children', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const userData = req.body || {};

            const parentResult = await pool.query('SELECT id, email FROM users WHERE id = $1 AND is_deleted = false', [id]);
            if (parentResult.rows.length === 0) {
                return res.status(404).json({ message: 'Primary account not found.' });
            }
            if (!userData.name) {
                return res.status(400).json({ message: 'Child name is required.' });
            }

            // Generate user_id (NDA-YYYY-XXXX)
            const year = new Date().getFullYear();
            const seqResult = await pool.query(`SELECT nextval('user_id_seq') as seq`);
            const generatedUserId = `NDA-${year}-${String(seqResult.rows[0].seq).padStart(4, '0')}`;

            // Synthetic, unique, non-functional email derived from the parent + user_id.
            const parentEmail = parentResult.rows[0].email;
            const syntheticEmail = (parentEmail && parentEmail.includes('@'))
                ? parentEmail.replace('@', `+${generatedUserId.toLowerCase()}@`)
                : `${generatedUserId.toLowerCase()}@child.nadanaloga.local`;
            const placeholderPassword = await bcrypt.hash(uuidv4(), 10);

            const result = await pool.query(
                `INSERT INTO users (name, email, password, role, class_preference, photo_url, dob, sex, contact_number, address, date_of_joining, courses, father_name, standard, school_name, grade, notes, user_id, preferred_location_id, parent_id, display_name, is_primary)
                 VALUES ($1, $2, $3, 'Student', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, false) RETURNING *`,
                [
                    userData.name,
                    syntheticEmail,
                    placeholderPassword,
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
                    generatedUserId,
                    userData.preferred_location_id || userData.preferredLocationId || null,
                    id,
                    userData.display_name || userData.displayName || userData.name,
                ]
            );

            res.status(201).json(parseUserData(result.rows[0]));
        } catch (error) {
            console.error('Error adding child profile:', error);
            res.status(500).json({ message: 'Server error adding child profile.' });
        }
    });

    // List child profiles linked to a primary account.
    app.get('/api/users/:id/children', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query(
                'SELECT * FROM users WHERE parent_id = $1 AND is_deleted = false ORDER BY display_name',
                [id]
            );
            res.json(result.rows.map(parseUserData));
        } catch (error) {
            console.error('Error listing child profiles:', error);
            res.status(500).json({ message: 'Server error listing child profiles.' });
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
            res.json(parseUserData(result.rows[0]));
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
            res.json(parseUserData(result.rows[0]));
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
            res.json(parseUserData(result.rows[0]));
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
            await pool.query('UPDATE users SET password = $1, must_change_password = false, updated_at = NOW() WHERE id = $2', [hashedPassword, id]);

            res.json({ message: 'Password changed successfully.' });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ message: 'Server error changing password.' });
        }
    });

    // First-login: the signed-in user sets a new password (no current password
    // needed — they just authenticated). Clears the must_change_password flag.
    // Switch the active profile within one login (teacher <-> student <-> child).
    // Only profiles that this login unlocked (recorded in the session at /api/login)
    // are allowed, so a session can never jump to an unrelated account. Rebinds
    // req.session.user so every subsequent API call acts as the chosen profile.
    app.post('/api/switch-profile', ensureAuthenticated, async (req, res) => {
        try {
            const profileId = Number(req.body.profile_id);
            const allowed = (req.session.profileIds || []).map(Number);
            if (!Number.isInteger(profileId) || !allowed.includes(profileId)) {
                return res.status(403).json({ message: 'That profile is not available for this login.' });
            }
            const row = (await pool.query(
                'SELECT * FROM users WHERE id = $1 AND is_deleted = false', [profileId]
            )).rows[0];
            if (!row) return res.status(404).json({ message: 'Profile not found.' });

            delete row.password;
            if (row.role) {
                row.role = row.role.charAt(0).toUpperCase() + row.role.slice(1).toLowerCase();
            }
            const parsed = {
                ...row,
                courses: safeJsonArray(row.courses),
                course_expertise: safeJsonArray(row.course_expertise),
            };
            // This profile's own children (a parent switching to themselves gets them).
            const kids = (await pool.query(
                'SELECT id, display_name, name, grade, courses, photo_url, status FROM users WHERE parent_id = $1 AND is_deleted = false ORDER BY display_name',
                [row.id]
            )).rows;
            if (kids.length > 0) {
                parsed.students = kids.map(c => ({ ...c, courses: safeJsonArray(c.courses) }));
            }
            // Keep the full picker available after switching.
            parsed.profiles = req.session.profiles || [];

            req.session.user = parsed;
            res.json(parsed);
        } catch (error) {
            console.error('Switch profile error:', error);
            res.status(500).json({ message: 'Server error switching profile.' });
        }
    });

    // Why can't this phone log in? Admin-only diagnostic. Reports what the
    // server sees for a number — never password hashes, only whether an account
    // is usable. Covers the real causes: number stored with a country code /
    // leading zero, the account being deleted, or the phone existing ONLY on
    // child profiles (children get a random placeholder password and can never
    // log in themselves — the parent logs in and sees them).
    app.get('/api/admin/phone-diagnostic', ensureAdmin, async (req, res) => {
        try {
            const raw = String(req.query.phone || '');
            const digits = raw.replace(/\D/g, '');
            if (!digits) return res.status(400).json({ message: 'Pass ?phone=...' });
            const rows = (await pool.query(
                `SELECT id, name, email, role, contact_number, parent_id, is_primary,
                        is_deleted, must_change_password,
                        (email LIKE '%@child.nadanaloga.local') AS is_child_placeholder
                 FROM users WHERE ${phoneMatchSql('$1')}
                 ORDER BY is_deleted, parent_id NULLS FIRST, id`,
                [digits]
            )).rows;
            const accounts = rows.map(r => {
                const stored = String(r.contact_number || '');
                const sto = stored.replace(/\D/g, '');
                const canLogIn = !r.is_deleted && !r.parent_id && !r.is_child_placeholder;
                return {
                    id: r.id, name: r.name, role: r.role,
                    stored_number: stored,
                    matches_exactly: sto === digits,
                    matched_by_last10: sto !== digits,
                    is_deleted: r.is_deleted,
                    is_child_profile: !!r.parent_id || r.is_child_placeholder,
                    must_change_password: r.must_change_password === true,
                    can_log_in: canLogIn,
                    reason: r.is_deleted ? 'Account is deleted'
                        : (r.parent_id || r.is_child_placeholder)
                            ? 'Child profile — has no login of its own; the parent logs in'
                            : 'Can log in (if the password is correct)',
                };
            });
            res.json({
                typed: raw, digits,
                found: accounts.length,
                can_log_in_count: accounts.filter(a => a.can_log_in).length,
                summary: accounts.length === 0
                    ? 'No account has this number. Check the number saved on the student/teacher record.'
                    : accounts.some(a => a.can_log_in)
                        ? 'An account with this number can log in — if it still fails, the password is wrong (use Forgot password or reset it from the admin).'
                        : 'This number exists but only on profiles that cannot log in (see reason per account).',
                accounts,
            });
        } catch (error) {
            console.error('Phone diagnostic error:', error);
            res.status(500).json({ message: 'Server error running the diagnostic.' });
        }
    });

    // --- Household (one phone number = one household) ---
    // Everything the home overview needs in one call: each member as a card —
    // students enriched with courses/batches/grades, plus the teacher role if any.
    app.get('/api/household', ensureAuthenticated, async (req, res) => {
        try {
            const { profiles, studentIds, teacher } = await householdFor(req);
            const gradeMap = new Map();
            const batchMap = new Map();
            if (studentIds.length > 0) {
                // Per-student grade summary (course, grade, fee, discount) — same shape
                // the admin student list uses.
                const gradeRows = await pool.query(
                    `SELECT scg.student_id, c.name AS course_name, g.name AS grade_name,
                            g.monthly_fee, g.currency,
                            (SELECT sd.discount_percentage FROM student_discounts sd
                             WHERE sd.student_id = scg.student_id AND sd.course_id = scg.course_id AND sd.is_active = TRUE
                             ORDER BY CASE WHEN sd.discount_type = 'batch' THEN 1 ELSE 2 END, sd.discount_percentage DESC
                             LIMIT 1) AS discount_percentage
                     FROM student_course_grades scg
                     LEFT JOIN courses c ON scg.course_id = c.id
                     LEFT JOIN grades g ON scg.grade_id = g.id
                     WHERE scg.student_id = ANY($1)`, [studentIds]);
                for (const r of gradeRows.rows) {
                    if (!gradeMap.has(r.student_id)) gradeMap.set(r.student_id, []);
                    const fee = Number(r.monthly_fee || 0);
                    const pct = r.discount_percentage != null ? Number(r.discount_percentage) : 0;
                    gradeMap.get(r.student_id).push({
                        course_name: r.course_name,
                        grade_name: r.grade_name,
                        monthly_fee: fee,
                        currency: r.currency,
                        discount_percentage: pct,
                        net_amount: pct > 0 ? fee - (fee * pct) / 100 : fee,
                    });
                }
                const batchRows = await pool.query('SELECT batch_name, student_ids FROM batches');
                for (const b of batchRows.rows) {
                    for (const sid of (Array.isArray(b.student_ids) ? b.student_ids : [])) {
                        if (!batchMap.has(sid)) batchMap.set(sid, []);
                        batchMap.get(sid).push(b.batch_name);
                    }
                }
            }
            let teacherDetail = null;
            if (teacher) {
                const t = (await pool.query(
                    'SELECT course_expertise FROM users WHERE id = $1', [teacher.id]
                )).rows[0];
                teacherDetail = { ...teacher, course_expertise: safeJsonArray(t ? t.course_expertise : null) };
            }
            const members = profiles.map(p => ({
                ...p,
                course_grades: gradeMap.get(p.id) || [],
                batch_names: batchMap.get(p.id) || [],
            }));
            res.json({ members, teacher: teacherDetail, student_count: studentIds.length });
        } catch (error) {
            console.error('Error building household:', error);
            res.status(500).json({ message: 'Server error building household.' });
        }
    });

    // Household fees for the home "bill card" (Airtel-style) + drilldown:
    // this month's generated / paid / due across every student, a per-student
    // breakdown, and each student's invoices (all statuses) for drilldown.
    // `period` uses the same MONTH_NAMES format generateMonthlyInvoices writes.
    app.get('/api/household/fees', ensureAuthenticated, async (req, res) => {
        try {
            const { studentIds, nameById } = await householdFor(req);
            const now = new Date();
            const period = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
            if (studentIds.length === 0) {
                return res.json({ period, total_generated: 0, total_paid: 0, total_due: 0,
                    has_bill: false, all_paid: false, due_date: null, students: [] });
            }
            const invRes = await pool.query(
                `SELECT i.id, i.student_id, i.course_name, i.amount, i.currency, i.status, i.billing_period,
                        i.issue_date, i.due_date, i.payment_details, i.prorated_from,
                        p.receipt_number, p.payment_method, p.paid_at, p.collected_by_name
                 FROM invoices i
                 LEFT JOIN LATERAL (
                     SELECT receipt_number, payment_method, paid_at, collected_by_name FROM invoice_payments
                     WHERE invoice_id = i.id AND status = 'approved' ORDER BY id DESC LIMIT 1
                 ) p ON true
                 WHERE i.student_id = ANY($1)
                 ORDER BY i.issue_date DESC NULLS LAST, i.id DESC`, [studentIds]);
            const byStudent = new Map();
            for (const sid of studentIds) {
                byStudent.set(sid, {
                    student_id: sid, student_name: nameById[sid] || 'Student',
                    month_generated: 0, month_paid: 0, month_due: 0, invoices: [],
                });
            }
            let totalGenerated = 0, totalPaid = 0, totalDue = 0, earliestDue = null;
            for (const inv of invRes.rows) {
                const s = byStudent.get(inv.student_id);
                if (!s) continue;
                const amt = Number(inv.amount || 0);
                const status = String(inv.status || '').toLowerCase();
                s.invoices.push({ ...inv, amount: amt, status });
                if (inv.billing_period === period) {
                    s.month_generated += amt; totalGenerated += amt;
                    if (status === 'paid') { s.month_paid += amt; totalPaid += amt; }
                    else {
                        s.month_due += amt; totalDue += amt;
                        if (inv.due_date && (!earliestDue || new Date(inv.due_date) < new Date(earliestDue))) {
                            earliestDue = inv.due_date;
                        }
                    }
                }
            }
            res.json({
                period,
                total_generated: totalGenerated,
                total_paid: totalPaid,
                total_due: totalDue,
                has_bill: totalGenerated > 0,
                all_paid: totalGenerated > 0 && totalDue === 0,
                due_date: earliestDue,
                students: Array.from(byStudent.values()),
            });
        } catch (error) {
            console.error('Error building household fees:', error);
            res.status(500).json({ message: 'Server error building household fees.' });
        }
    });

    // ===================== Fees Management (admin) =====================
    // Starts from STUDENTS, not bills: every active student appears, with this
    // month's status — so nobody is invisible just because they have no bill.
    const billDateStr = (v) => (v ? toDateStr(parseLocalDate(v)) : null);

    app.get('/api/fees/roster', ensureAdmin, async (req, res) => {
        try {
            const now = new Date();
            const period = String(req.query.period || `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`);
            const todayStr = toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
            const courseId = req.query.course_id ? Number(req.query.course_id) : null;
            const batchId = req.query.batch_id ? Number(req.query.batch_id) : null;
            const statusFilter = String(req.query.status || '').toLowerCase();
            const q = String(req.query.search || '').trim().toLowerCase();
            const qDigits = q.replace(/\D/g, '');

            const invRows = (await pool.query(`
                SELECT i.id, i.student_id, i.course_id, i.batch_id, i.course_name, i.amount, i.original_amount,
                       i.discount_percentage, i.status, i.due_date, i.issue_date, i.prorated_from,
                       p.receipt_number, p.payment_method, p.paid_at, p.collected_by_name
                FROM invoices i
                LEFT JOIN LATERAL (
                    SELECT receipt_number, payment_method, paid_at, collected_by_name FROM invoice_payments
                    WHERE invoice_id = i.id AND status = 'approved' ORDER BY id DESC LIMIT 1
                ) p ON true
                WHERE i.billing_period = $1
                ORDER BY i.id`, [period])).rows;
            const invByStudent = new Map();
            for (const r of invRows) {
                if (!invByStudent.has(r.student_id)) invByStudent.set(r.student_id, []);
                invByStudent.get(r.student_id).push(r);
            }

            // Every active student, plus anyone billed this period even if since
            // deactivated — so the rows always add up to the period's totals.
            const students = (await pool.query(`
                SELECT u.id, u.name, u.display_name, u.user_id, u.contact_number, u.status, u.is_deleted,
                       u.parent_id, p.name AS parent_name
                FROM users u LEFT JOIN users p ON p.id = u.parent_id
                WHERE (LOWER(TRIM(u.role)) = 'student' AND u.is_deleted = false
                       AND (u.status IS NULL OR LOWER(u.status) = 'active'))
                   OR u.id = ANY($1)
                ORDER BY COALESCE(u.display_name, u.name)`, [[...invByStudent.keys()]])).rows;

            const gradesByStudent = new Map();
            for (const g of (await pool.query(`
                SELECT scg.student_id, scg.course_id, c.name AS course_name, g.name AS grade_name, g.monthly_fee
                FROM student_course_grades scg
                JOIN grades g ON g.id = scg.grade_id AND g.is_active = true
                LEFT JOIN courses c ON c.id = scg.course_id`)).rows) {
                if (!gradesByStudent.has(g.student_id)) gradesByStudent.set(g.student_id, []);
                gradesByStudent.get(g.student_id).push(g);
            }
            const batchesByStudent = new Map();
            for (const b of (await pool.query('SELECT id, batch_name, course_id, student_ids FROM batches')).rows) {
                for (const sid of (Array.isArray(b.student_ids) ? b.student_ids : [])) {
                    if (!batchesByStudent.has(sid)) batchesByStudent.set(sid, []);
                    batchesByStudent.get(sid).push({ id: b.id, name: b.batch_name, course_id: b.course_id });
                }
            }

            const rows = [];
            for (const s of students) {
                const inv = invByStudent.get(s.id) || [];
                const grades = gradesByStudent.get(s.id) || [];
                const batches = batchesByStudent.get(s.id) || [];
                if (courseId && !inv.some(i => i.course_id === courseId) && !grades.some(g => g.course_id === courseId)) continue;
                if (batchId && !inv.some(i => i.batch_id === batchId) && !batches.some(b => b.id === batchId)) continue;
                if (q) {
                    const hay = `${s.display_name || s.name} ${s.user_id || ''} ${s.parent_name || ''}`.toLowerCase();
                    const phone = String(s.contact_number || '').replace(/\D/g, '');
                    if (!hay.includes(q) && !(qDigits.length >= 4 && phone.includes(qDigits))) continue;
                }
                const isPaid = (i) => String(i.status).toLowerCase() === 'paid';
                const isOverdue = (i) => !isPaid(i) && i.due_date && billDateStr(i.due_date) < todayStr;
                const billed = inv.reduce((t, i) => t + Number(i.amount || 0), 0);
                const paid = inv.filter(isPaid).reduce((t, i) => t + Number(i.amount || 0), 0);
                let status;
                if (inv.length === 0) status = grades.length ? 'no_bill' : 'not_set_up';
                else if (inv.every(isPaid)) status = 'paid';
                else if (inv.some(isOverdue)) status = 'overdue';
                else if (inv.some(isPaid)) status = 'partly_paid';
                else status = 'pending';
                const unpaidDue = inv.filter(i => !isPaid(i)).map(i => billDateStr(i.due_date)).filter(Boolean).sort();
                rows.push({
                    student_id: s.id,
                    name: s.display_name || s.name,
                    user_id: s.user_id,
                    phone: s.contact_number,
                    parent_name: s.parent_name,
                    inactive: s.is_deleted || (s.status && String(s.status).toLowerCase() !== 'active'),
                    grades: grades.map(g => ({ course_id: g.course_id, course_name: g.course_name, grade_name: g.grade_name, monthly_fee: Number(g.monthly_fee || 0) })),
                    batch_names: batches.map(b => b.name),
                    status,
                    billed, paid, due: billed - paid,
                    due_date: unpaidDue[0] || null,
                    bills: inv.map(i => ({
                        id: i.id,
                        course_name: i.course_name,
                        amount: Number(i.amount || 0),
                        original_amount: i.original_amount != null ? Number(i.original_amount) : null,
                        discount_percentage: i.discount_percentage != null ? Number(i.discount_percentage) : null,
                        status: isPaid(i) ? 'paid' : (isOverdue(i) ? 'overdue' : 'pending'),
                        due_date: billDateStr(i.due_date),
                        prorated_from: billDateStr(i.prorated_from),
                        receipt_number: i.receipt_number || null,
                        payment_method: i.payment_method || null,
                        paid_at: i.paid_at || null,
                        collected_by_name: i.collected_by_name || null,
                    })),
                });
            }
            const count = (st) => rows.filter(r => r.status === st).length;
            const summary = {
                students: rows.length,
                billed: rows.reduce((t, r) => t + r.billed, 0),
                collected: rows.reduce((t, r) => t + r.paid, 0),
                outstanding: rows.reduce((t, r) => t + r.due, 0),
                counts: {
                    paid: count('paid'), pending: count('pending'), overdue: count('overdue'),
                    partly_paid: count('partly_paid'), no_bill: count('no_bill'), not_set_up: count('not_set_up'),
                },
            };
            res.json({ period, today: todayStr, summary, rows: statusFilter ? rows.filter(r => r.status === statusFilter) : rows });
        } catch (error) {
            console.error('Error building fees roster:', error);
            res.status(500).json({ message: 'Server error loading fees.' });
        }
    });

    // Everything a family still owes (any month) — what "Collect cash" shows, so
    // one handover can settle several children / months at once.
    app.get('/api/fees/family-due', ensureAdmin, async (req, res) => {
        try {
            const studentId = Number(req.query.student_id);
            if (!Number.isInteger(studentId)) return res.status(400).json({ message: 'student_id is required.' });
            const s = (await pool.query('SELECT * FROM users WHERE id = $1', [studentId])).rows[0];
            if (!s) return res.status(404).json({ message: 'Student not found.' });
            let base = s;
            if (s.parent_id) {
                const p = (await pool.query('SELECT * FROM users WHERE id = $1 AND is_deleted = false', [s.parent_id])).rows[0];
                if (p) base = p;
            }
            const profiles = await buildProfilesForUser(base);
            const ids = [...new Set([studentId, ...profiles.filter(p => p.role === 'Student').map(p => p.id)])];
            const names = await studentNames(ids);
            const todayStr = toDateStr(new Date());
            const bills = (await pool.query(
                `SELECT id, student_id, course_name, billing_period, amount, due_date, issue_date, prorated_from
                 FROM invoices WHERE student_id = ANY($1) AND LOWER(status) <> 'paid'
                 ORDER BY issue_date NULLS LAST, student_id, id`, [ids]
            )).rows.map(b => ({
                id: b.id,
                student_id: b.student_id,
                student_name: names.get(b.student_id) || 'Student',
                course_name: b.course_name,
                billing_period: b.billing_period,
                amount: Number(b.amount || 0),
                due_date: billDateStr(b.due_date),
                prorated_from: billDateStr(b.prorated_from),
                overdue: !!(b.due_date && billDateStr(b.due_date) < todayStr),
            }));
            const contact = await resolveFeeContact(studentId);
            res.json({
                student_id: studentId,
                bills,
                total: bills.reduce((t, b) => t + b.amount, 0),
                notify: contact ? { name: contact.emailName || contact.name, email: contact.email } : null,
            });
        } catch (error) {
            console.error('Error loading family dues:', error);
            res.status(500).json({ message: 'Server error loading dues.' });
        }
    });

    // Cash at the office. FULL payment only: the client sends which bills, never
    // an amount — each bill is settled for exactly its amount.
    app.post('/api/fees/collect-cash', ensureAdmin, async (req, res) => {
        try {
            const receipt = await recordPayments({
                invoiceIds: Array.isArray(req.body.invoice_ids) ? req.body.invoice_ids : [],
                method: 'Cash',
                collectedBy: { id: req.session.user.id, name: req.session.user.name },
            });
            res.json({
                receipt_number: receipt.receiptNumber,
                total: receipt.total,
                paid_at: receipt.paidAt,
                collected_by_name: receipt.collectedByName,
                lines: receipt.lines.map(l => ({
                    invoice_id: l.invoiceId, student_name: l.studentName, course_name: l.courseName,
                    billing_period: l.billingPeriod, amount: l.amount,
                })),
            });
        } catch (error) {
            sendLedgerError(res, error, 'Could not record the cash payment.');
        }
    });

    // A receipt — admins see any; a family sees receipts for its own students.
    app.get('/api/fees/receipts/:receipt', ensureAuthenticated, async (req, res) => {
        try {
            const rows = (await pool.query(
                `SELECT ip.*, i.course_name, i.billing_period, u.name AS student_name, u.display_name
                 FROM invoice_payments ip
                 JOIN invoices i ON i.id = ip.invoice_id
                 LEFT JOIN users u ON u.id = ip.student_id
                 WHERE ip.receipt_number = $1 ORDER BY ip.id`, [req.params.receipt]
            )).rows;
            if (rows.length === 0) return res.status(404).json({ message: 'Receipt not found.' });
            const me = req.session.user;
            const isAdmin = String(me.role || '').toLowerCase() === 'admin' || me.is_super_admin === true;
            if (!isAdmin) {
                const { studentIds } = await householdFor(req);
                const mine = new Set(studentIds.map(Number));
                if (!rows.every(r => mine.has(Number(r.student_id)))) {
                    return res.status(403).json({ message: 'Forbidden.' });
                }
            }
            const first = rows[0];
            res.json({
                receipt_number: first.receipt_number,
                status: rows.some(r => r.status === 'approved') ? 'paid' : first.status,
                method: first.payment_method,
                method_label: methodLabel(first.payment_method, first.collected_by_name),
                transaction_id: first.transaction_id,
                paid_at: first.paid_at || first.approved_at,
                collected_by_name: first.collected_by_name,
                reversed_at: first.reversed_at,
                reversed_by_name: first.reversed_by_name,
                reversal_reason: first.reversal_reason,
                lines: rows.map(r => ({
                    invoice_id: r.invoice_id, student_name: r.display_name || r.student_name || 'Student',
                    course_name: r.course_name, billing_period: r.billing_period, amount: Number(r.amount || 0),
                })),
                total: rows.reduce((t, r) => t + Number(r.amount || 0), 0),
            });
        } catch (error) {
            console.error('Error loading receipt:', error);
            res.status(500).json({ message: 'Server error loading receipt.' });
        }
    });

    // Reverse a receipt (admin, reason required). Bills return to pending and the
    // family is told; nothing is deleted.
    app.post('/api/fees/receipts/:receipt/reverse', ensureAdmin, async (req, res) => {
        try {
            const r = await reverseReceipt({
                receiptNumber: req.params.receipt,
                reason: req.body.reason,
                reversedBy: { id: req.session.user.id, name: req.session.user.name },
            });
            res.json({ receipt_number: r.receiptNumber, total: r.total, reason: r.reason, reversed_at: r.reversedAt });
        } catch (error) {
            sendLedgerError(res, error, 'Could not reverse the receipt.');
        }
    });

    app.post('/api/set-password', ensureAuthenticated, async (req, res) => {
        try {
            const { new_password } = req.body;
            const userId = req.session.user && req.session.user.id;
            if (!userId) return res.status(401).json({ message: 'Not signed in.' });
            if (!new_password || String(new_password).length < 6) {
                return res.status(400).json({ message: 'Password must be at least 6 characters.' });
            }
            const hashed = await bcrypt.hash(new_password, 10);
            await pool.query('UPDATE users SET password = $1, must_change_password = false, updated_at = NOW() WHERE id = $2', [hashed, userId]);
            if (req.session.user) req.session.user.must_change_password = false;
            res.json({ success: true, message: 'Password set. You are all set!' });
        } catch (error) {
            console.error('Error setting password:', error);
            res.status(500).json({ message: 'Server error setting password.' });
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

    // Database Migration Endpoint (Admin only) - Run parent-student schema migration
    app.post('/api/admin/migrate-parent-student', ensureAdmin, async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            console.log('[Migration] Starting parent-student schema migration...');

            // Check if columns already exist
            const checkColumns = await client.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name IN ('parent_id', 'display_name', 'is_primary')
            `);

            if (checkColumns.rows.length === 3) {
                console.log('[Migration] Columns already exist, skipping migration');
                await client.query('COMMIT');
                return res.json({
                    success: true,
                    message: 'Migration already applied',
                    columnsAdded: []
                });
            }

            const addedColumns = [];

            // Add parent_id column
            if (!checkColumns.rows.find(r => r.column_name === 'parent_id')) {
                await client.query('ALTER TABLE users ADD COLUMN parent_id UUID REFERENCES users(id) ON DELETE SET NULL');
                addedColumns.push('parent_id');
                console.log('[Migration] Added parent_id column');
            }

            // Add is_primary column
            if (!checkColumns.rows.find(r => r.column_name === 'is_primary')) {
                await client.query('ALTER TABLE users ADD COLUMN is_primary BOOLEAN DEFAULT true');
                addedColumns.push('is_primary');
                console.log('[Migration] Added is_primary column');
            }

            // Add display_name column
            if (!checkColumns.rows.find(r => r.column_name === 'display_name')) {
                await client.query('ALTER TABLE users ADD COLUMN display_name TEXT');
                addedColumns.push('display_name');
                console.log('[Migration] Added display_name column');
            }

            // Create index for parent_id
            await client.query('CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id)');
            console.log('[Migration] Created index on parent_id');

            // Set display_name = name for existing users
            await client.query("UPDATE users SET display_name = name WHERE display_name IS NULL AND is_deleted = false");
            console.log('[Migration] Set display_name for existing users');

            // Add student_id to notifications table
            const checkNotifColumns = await client.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'notifications'
                AND column_name = 'student_id'
            `);

            if (checkNotifColumns.rows.length === 0) {
                await client.query('ALTER TABLE notifications ADD COLUMN student_id UUID REFERENCES users(id) ON DELETE CASCADE');
                await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON notifications(student_id)');
                addedColumns.push('notifications.student_id');
                console.log('[Migration] Added student_id to notifications');
            }

            await client.query('COMMIT');

            console.log('[Migration] Parent-student schema migration completed successfully');

            res.json({
                success: true,
                message: 'Parent-student schema migration completed',
                columnsAdded: addedColumns
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[Migration] Error:', error);
            res.status(500).json({
                success: false,
                message: 'Migration failed',
                error: error.message
            });
        } finally {
            client.release();
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
            res.json(result.rows.map(parseUserData));
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
            const { batch_name, course_id, teacher_id, schedule, start_date, end_date, max_students, student_ids, mode, location_id, days, start_time, end_time, studio, time_slots } = batchData;

            const result = await pool.query(
                `INSERT INTO batches (batch_name, course_id, teacher_id, schedule, start_date, end_date, max_students, student_ids, mode, location_id, days, start_time, end_time, studio, time_slots)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
                [batch_name, course_id, teacher_id, JSON.stringify(schedule), start_date, end_date, max_students, student_ids || [], mode, location_id || null, days || [], start_time || null, end_time || null, studio || null, JSON.stringify(time_slots || [])]
            );
            res.status(201).json(parseBatchData(result.rows[0]));

            // Send batch allocation emails to assigned students (fire-and-forget)
            console.log(`[Batch Create] Batch: ${batch_name}, Students received: ${JSON.stringify(student_ids)}`);
            if (student_ids && student_ids.length > 0) {
                (async () => {
                    try {
                        const students = await getUsersByIds(student_ids);
                        let courseName = '';
                        let teacherName = '';
                        if (course_id) {
                            const cr = await pool.query('SELECT name FROM courses WHERE id = $1', [course_id]);
                            courseName = cr.rows[0]?.name || '';
                        }
                        if (teacher_id) {
                            const tr = await pool.query('SELECT name FROM users WHERE id = $1', [teacher_id]);
                            teacherName = tr.rows[0]?.name || '';
                        }
                        const scheduleStr = schedule ? (typeof schedule === 'string' ? schedule : JSON.stringify(schedule)) : '';
                        for (const student of students) {
                            const msg = `Congratulations! You have been allocated to a new batch.\n\n📚 Course: ${courseName || 'Not specified'}\n👥 Batch: ${batch_name}\n👨‍🏫 Teacher: ${teacherName || 'To be assigned'}\n📅 Schedule: ${scheduleStr || 'To be confirmed'}\n🚀 Start Date: ${start_date || 'To be announced'}\n\nPlease log in to your portal for more details.`;
                            sendEmailBackground(student.email, student.name, `Batch Allocation - ${courseName || batch_name}`, msg);
                            createNotificationForUser(student.id, 'Batch Allocation', `You have been added to batch "${batch_name}" for ${courseName || 'a course'}.`, 'Success');
                        }
                        console.log(`[Batch] Sent allocation emails to ${students.length} students for batch "${batch_name}"`);
                    } catch (e) {
                        console.error('[Batch] Error sending allocation emails:', e.message);
                    }
                })();
            }
        } catch (error) {
            console.error('Error creating batch:', error);
            res.status(500).json({ message: 'Server error creating batch.' });
        }
    });

    app.put('/api/batches/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { batch_name, course_id, teacher_id, schedule, start_date, end_date, max_students, student_ids, mode, location_id, days, start_time, end_time, studio, time_slots } = req.body;

            // Load the full existing batch so we can MERGE: a client (e.g. the mobile
            // app) that doesn't manage a field must not wipe it. Only fields the client
            // actually sent (not undefined) override the stored values. This protects
            // schedule/student_ids set on the web from being erased by a mobile edit.
            const oldBatch = await pool.query('SELECT * FROM batches WHERE id = $1', [id]);
            if (oldBatch.rows.length === 0) {
                return res.status(404).json({ message: 'Batch not found' });
            }
            const old = oldBatch.rows[0];
            const oldStudentIds = Array.isArray(old.student_ids) ? old.student_ids : [];
            const oldTeacherId = old.teacher_id;

            const pick = (sent, existing) => (sent !== undefined ? sent : existing);
            const mergedSchedule = schedule !== undefined
                ? JSON.stringify(schedule)
                : (typeof old.schedule === 'string' ? old.schedule : JSON.stringify(old.schedule || []));
            const mergedTimeSlots = time_slots !== undefined
                ? JSON.stringify(time_slots)
                : (typeof old.time_slots === 'string' ? old.time_slots : JSON.stringify(old.time_slots || []));

            const result = await pool.query(
                `UPDATE batches SET
                    batch_name = $1, course_id = $2, teacher_id = $3, schedule = $4,
                    start_date = $5, end_date = $6, max_students = $7, student_ids = $8, mode = $9,
                    location_id = $10, days = $11, start_time = $12, end_time = $13,
                    studio = $14, time_slots = $15, updated_at = NOW()
                 WHERE id = $16 RETURNING *`,
                [
                    pick(batch_name, old.batch_name),
                    pick(course_id, old.course_id),
                    pick(teacher_id, old.teacher_id),
                    mergedSchedule,
                    pick(start_date, old.start_date),
                    pick(end_date, old.end_date),
                    pick(max_students, old.max_students),
                    student_ids !== undefined ? student_ids : oldStudentIds,
                    pick(mode, old.mode),
                    location_id !== undefined ? location_id : (old.location_id || null),
                    days !== undefined ? days : (old.days || []),
                    start_time !== undefined ? start_time : (old.start_time || null),
                    end_time !== undefined ? end_time : (old.end_time || null),
                    studio !== undefined ? studio : (old.studio || null),
                    mergedTimeSlots,
                    id,
                ]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Batch not found' });
            }
            res.json(parseBatchData(result.rows[0]));

            // Send emails to newly added students only (fire-and-forget)
            console.log(`[Batch Update] Batch: ${batch_name}, Old students: ${JSON.stringify(oldStudentIds)}, New students: ${JSON.stringify(student_ids)}`);
            const newStudentIds = (student_ids || []).filter(sid => !oldStudentIds.includes(sid) && !oldStudentIds.includes(Number(sid)) && !oldStudentIds.includes(String(sid)));
            console.log(`[Batch Update] Newly added students: ${JSON.stringify(newStudentIds)}`);
            if (newStudentIds.length > 0) {
                (async () => {
                    try {
                        const students = await getUsersByIds(newStudentIds.map(Number));
                        // Use the persisted batch row so this works even on a partial edit.
                        const batchRow = result.rows[0] || {};
                        const bName = batchRow.batch_name || batch_name;
                        const bCourseId = batchRow.course_id;
                        let courseName = '';
                        let teacherName = '';
                        if (bCourseId) {
                            const cr = await pool.query('SELECT name FROM courses WHERE id = $1', [bCourseId]);
                            courseName = cr.rows[0]?.name || '';
                        }
                        if (batchRow.teacher_id) {
                            const tr = await pool.query('SELECT name FROM users WHERE id = $1', [batchRow.teacher_id]);
                            teacherName = tr.rows[0]?.name || '';
                        }
                        // Build the per-day schedule text from time_slots.
                        let slots = batchRow.time_slots;
                        if (typeof slots === 'string') { try { slots = JSON.parse(slots || '[]'); } catch (_) { slots = []; } }
                        const scheduleText = (Array.isArray(slots) && slots.length)
                            ? slots.map(s => `${String(s.day || '').slice(0, 3)} ${s.start_time || ''}-${s.end_time || ''}`.trim()).join(', ')
                            : 'To be confirmed';

                        for (const student of students) {
                            // The student's grade in this batch's course.
                            let gradeName = '';
                            if (bCourseId) {
                                const gr = await pool.query(
                                    `SELECT g.name FROM student_course_grades scg
                                     JOIN grades g ON scg.grade_id = g.id
                                     WHERE scg.student_id = $1 AND scg.course_id = $2 LIMIT 1`,
                                    [student.id, bCourseId]);
                                gradeName = gr.rows[0]?.name || '';
                            }
                            const line = `${courseName || 'Course'}${gradeName ? ' • ' + gradeName : ''} • Batch ${bName} (${scheduleText})`;
                            const emailMsg = `Congratulations! Your enrollment is confirmed.\n\n📚 Course: ${courseName || 'Not specified'}\n🎓 Grade: ${gradeName || 'To be assigned'}\n👥 Batch: ${bName}\n👨‍🏫 Teacher: ${teacherName || 'To be assigned'}\n📅 Schedule: ${scheduleText}\n\nPlease log in to your portal for more details.`;
                            sendEmailBackground(student.email, student.name, `Enrollment Confirmed - ${courseName || bName}`, emailMsg);
                            createNotificationForUser(student.id, 'Enrollment Confirmed', `You've been enrolled — ${line}.`, 'Success');
                        }
                        console.log(`[Batch] Sent allocation emails to ${students.length} newly added students for batch "${batch_name}"`);
                    } catch (e) {
                        console.error('[Batch] Error sending allocation emails:', e.message);
                    }
                })();
            }

            // Detect teacher change and notify students (fire-and-forget)
            if (teacher_id && oldTeacherId && Number(teacher_id) !== Number(oldTeacherId)) {
                (async () => {
                    try {
                        const teacherResult = await pool.query('SELECT name FROM users WHERE id = $1', [teacher_id]);
                        const newTeacherName = teacherResult.rows[0]?.name || 'a new teacher';
                        const allIds = (student_ids || []).map(Number).filter(id => !isNaN(id));
                        if (allIds.length > 0) {
                            const students = await getUsersByIds(allIds);
                            for (const student of students) {
                                createNotificationForUser(student.id, 'Teacher Changed',
                                    `Your batch "${batch_name}" teacher has been changed to ${newTeacherName}.`, 'Info');
                            }
                            console.log(`[Batch] Teacher change notified ${students.length} students for batch "${batch_name}"`);
                        }
                    } catch (e) {
                        console.error('[Batch] Error sending teacher change notifications:', e.message);
                    }
                })();
            }

            // Detect removed students and notify them (fire-and-forget)
            const removedStudentIds = oldStudentIds.filter(sid =>
                !(student_ids || []).includes(sid) &&
                !(student_ids || []).includes(Number(sid)) &&
                !(student_ids || []).includes(String(sid))
            );
            if (removedStudentIds.length > 0) {
                (async () => {
                    try {
                        const removedStudents = await getUsersByIds(removedStudentIds.map(Number));
                        for (const student of removedStudents) {
                            createNotificationForUser(student.id, 'Batch Removal',
                                `You have been removed from batch "${batch_name}".`, 'Warning');
                            sendEmailBackground(student.email, student.name, `Batch Update - ${batch_name}`,
                                `You have been removed from batch "${batch_name}". Please contact your administrator if you have any questions.`);
                        }
                        console.log(`[Batch] Removal notified ${removedStudents.length} students for batch "${batch_name}"`);
                    } catch (e) {
                        console.error('[Batch] Error sending removal notifications:', e.message);
                    }
                })();
            }
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

            // Send transfer notification to the student (fire-and-forget)
            (async () => {
                try {
                    const fromName = updatedFrom.rows[0]?.batch_name || 'Unknown';
                    const toName = updatedTo.rows[0]?.batch_name || 'Unknown';
                    let courseName = '';
                    const courseId = updatedTo.rows[0]?.course_id;
                    if (courseId) {
                        const cr = await pool.query('SELECT name FROM courses WHERE id = $1', [courseId]);
                        courseName = cr.rows[0]?.name || '';
                    }

                    createNotificationForUser(studentId, 'Batch Transfer',
                        `You have been transferred from batch "${fromName}" to batch "${toName}"${courseName ? ` for ${courseName}` : ''}.`, 'Info');

                    const students = await getUsersByIds([studentId]);
                    if (students.length > 0) {
                        const msg = `Your batch has been changed.\n\n🔄 Previous Batch: ${fromName}\n👥 New Batch: ${toName}\n📚 Course: ${courseName || 'Not specified'}\n\nPlease log in to your portal for more details.`;
                        sendEmailBackground(students[0].email, students[0].name, `Batch Transfer - ${courseName || toName}`, msg);
                    }
                    console.log(`[Batch Transfer] Notified student ${studentId}: ${fromName} → ${toName}`);
                } catch (e) {
                    console.error('[Batch Transfer] Error sending notification:', e.message);
                }
            })();
        } catch (error) {
            console.error('Error transferring student:', error);
            res.status(500).json({ message: 'Server error transferring student.' });
        }
    });

    // --- Share Content API (for mobile app) ---
    app.post('/api/share-content', ensureAdmin, async (req, res) => {
        try {
            const { content_id, content_type, recipient_ids, send_email } = req.body;
            if (!content_id || !content_type || !recipient_ids || recipient_ids.length === 0) {
                return res.status(400).json({ message: 'content_id, content_type, and recipient_ids are required.' });
            }

            const tableMap = {
                'Event': { table: 'events', titleCol: 'title' },
                'Notice': { table: 'notices', titleCol: 'title' },
                'BookMaterial': { table: 'book_materials', titleCol: 'title' },
                'GradeExam': { table: 'grade_exams', titleCol: 'exam_name' },
            };
            const config = tableMap[content_type];
            if (!config) return res.status(400).json({ message: 'Invalid content_type. Must be Event, Notice, BookMaterial, or GradeExam.' });

            // Update recipient_ids on the content record
            const contentResult = await pool.query(
                `UPDATE ${config.table} SET recipient_ids = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
                [recipient_ids, content_id]
            );
            if (contentResult.rows.length === 0) {
                return res.status(404).json({ message: `${content_type} not found.` });
            }

            const contentTitle = contentResult.rows[0][config.titleCol];
            res.json({ success: true, message: `Shared with ${recipient_ids.length} recipients.` });

            // Fire-and-forget: create notifications + send emails + push
            (async () => {
                try {
                    const users = await getUsersByIds(recipient_ids);
                    for (const user of users) {
                        createNotificationForUser(user.id, `New ${content_type}`,
                            `New ${content_type.toLowerCase()}: "${contentTitle}".`, 'Info');
                        if (send_email) {
                            sendEmailBackground(user.email, user.name,
                                `${content_type}: ${contentTitle}`,
                                `A new ${content_type.toLowerCase()} "${contentTitle}" has been shared with you. Please log in to your portal for details.`);
                        }
                    }
                    console.log(`[ShareContent] Shared ${content_type} "${contentTitle}" with ${users.length} users`);
                } catch (e) {
                    console.error(`[ShareContent] Error sending notifications for ${content_type}:`, e.message);
                }
            })();
        } catch (error) {
            console.error('Error sharing content:', error);
            res.status(500).json({ message: 'Server error sharing content.' });
        }
    });

    // --- File Upload API Endpoint ---
    app.post('/api/upload/icon', ensureAdmin, upload.single('icon'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            // Build the URL for the uploaded file
            const protocol = req.protocol;
            const host = req.get('host');
            const fileUrl = `${protocol}://${host}/uploads/icons/${req.file.filename}`;

            console.log(`[Upload] Icon uploaded: ${req.file.filename}`);

            res.json({
                message: 'File uploaded successfully',
                filename: req.file.filename,
                url: fileUrl,
                path: `/uploads/icons/${req.file.filename}`
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            res.status(500).json({ message: 'Server error uploading file.' });
        }
    });

    // Delete uploaded icon
    app.delete('/api/upload/icon/:filename', ensureAdmin, async (req, res) => {
        try {
            const { filename } = req.params;
            const filePath = path.join(ICONS_DIR, filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[Upload] Icon deleted: ${filename}`);
                res.json({ message: 'File deleted successfully' });
            } else {
                res.status(404).json({ message: 'File not found' });
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            res.status(500).json({ message: 'Server error deleting file.' });
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

            // Notify active users (fire-and-forget)
            (async () => {
                try {
                    const users = await getActiveUsers();
                    for (const user of users) {
                        createNotificationForUser(
                            user.id,
                            'New Course',
                            `New course added: "${name}".`,
                            'Info'
                        );
                    }
                    console.log(`[Course] Notified ${users.length} users for new course "${name}"`);
                } catch (e) {
                    console.error('[Course] Error sending notifications:', e.message);
                }
            })();
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

            // Notify active users (fire-and-forget)
            (async () => {
                try {
                    const users = await getActiveUsers();
                    for (const user of users) {
                        createNotificationForUser(
                            user.id,
                            'Course Updated',
                            `Course updated: "${name}".`,
                            'Info'
                        );
                    }
                    console.log(`[Course] Notified ${users.length} users for course update "${name}"`);
                } catch (e) {
                    console.error('[Course] Error sending notifications:', e.message);
                }
            })();
        } catch (error) {
            console.error('Error updating course:', error);
            res.status(500).json({ message: 'Server error updating course.' });
        }
    });

    app.delete('/api/courses/:id', ensureAdmin, async (req, res) => {
        const client = await pool.connect();
        try {
            const { id } = req.params;
            await client.query('BEGIN');

            // Check if course exists
            const courseCheck = await client.query('SELECT id, name FROM courses WHERE id = $1', [id]);
            if (courseCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Course not found' });
            }
            const courseName = courseCheck.rows[0].name;

            // The CASCADE constraints should handle batches, book_materials, and fee_structures automatically
            // demo_bookings has ON DELETE SET NULL
            // But to be safe and get proper counts, we'll manually check and delete

            const batchesResult = await client.query('SELECT COUNT(*) as count FROM batches WHERE course_id = $1', [id]);
            const materialsResult = await client.query('SELECT COUNT(*) as count FROM book_materials WHERE course_id = $1', [id]);
            const feeResult = await client.query('SELECT COUNT(*) as count FROM fee_structures WHERE course_id = $1', [id]);

            // Delete the course (CASCADE will handle related records)
            await client.query('DELETE FROM courses WHERE id = $1', [id]);

            await client.query('COMMIT');

            console.log(`[Course Delete] Deleted course "${courseName}" (ID: ${id}). Cascaded: ${batchesResult.rows[0].count} batches, ${materialsResult.rows[0].count} materials, ${feeResult.rows[0].count} fee structures.`);

            res.json({
                message: 'Course deleted successfully',
                deletedCourse: courseName,
                cascadedDeletions: {
                    batches: parseInt(batchesResult.rows[0].count),
                    materials: parseInt(materialsResult.rows[0].count),
                    feeStructures: parseInt(feeResult.rows[0].count)
                }
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error deleting course:', error);
            res.status(500).json({
                message: 'Server error deleting course.',
                error: error.message,
                details: error.detail || 'Check if course is referenced by other records.'
            });
        } finally {
            client.release();
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

            const validTypes = ['Info', 'Warning', 'Success', 'Error'];
            const params = notifications.flatMap(n => {
                let type = n.type || 'Info';
                if (!validTypes.includes(type)) type = 'Info';
                return [n.user_id, n.title, n.message, type];
            });

            await pool.query(
                `INSERT INTO notifications (user_id, title, message, type) VALUES ${values}`,
                params
            );

            // Send push notifications for each (fire-and-forget)
            for (const n of notifications) {
                sendPushNotification(n.user_id, n.title, n.message);
            }

            res.status(201).json({ success: true, message: 'Notifications created' });
        } catch (error) {
            console.error('Error creating notifications:', error);
            res.status(500).json({ message: 'Server error creating notifications.' });
        }
    });

    // --- Grade Management (grade-based fees) ---
    // Grades belong to a course and carry the monthly fee. A student's fee is the
    // sum of the grade fees across the courses they study.
    app.get('/api/grades', async (req, res) => {
        try {
            const { course_id } = req.query;
            const params = [];
            let where = 'WHERE g.is_active = true';
            if (course_id) { params.push(course_id); where += ` AND g.course_id = $${params.length}`; }
            const result = await pool.query(
                `SELECT g.*, c.name AS course_name
                 FROM grades g LEFT JOIN courses c ON g.course_id = c.id
                 ${where} ORDER BY c.name NULLS FIRST, g.name`, params
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching grades:', error);
            res.status(500).json({ message: 'Server error fetching grades.' });
        }
    });

    app.post('/api/grades', ensureAdmin, async (req, res) => {
        try {
            const { course_id, name, monthly_fee, currency } = req.body;
            if (!name) return res.status(400).json({ message: 'Grade name is required.' });
            const result = await pool.query(
                `INSERT INTO grades (course_id, name, monthly_fee, currency) VALUES ($1, $2, $3, $4) RETURNING *`,
                [course_id || null, name, monthly_fee || 0, currency || 'INR']
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating grade:', error);
            res.status(500).json({ message: 'Server error creating grade.' });
        }
    });

    app.put('/api/grades/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { course_id, name, monthly_fee, currency, is_active } = req.body;
            const result = await pool.query(
                `UPDATE grades SET course_id = $1, name = $2, monthly_fee = $3, currency = $4,
                    is_active = COALESCE($5, is_active), updated_at = NOW() WHERE id = $6 RETURNING *`,
                [course_id || null, name, monthly_fee || 0, currency || 'INR', is_active, id]
            );
            if (result.rows.length === 0) return res.status(404).json({ message: 'Grade not found' });
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating grade:', error);
            res.status(500).json({ message: 'Server error updating grade.' });
        }
    });

    app.delete('/api/grades/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            // Soft-delete so historical invoices/assignments stay intact.
            const result = await pool.query('UPDATE grades SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) return res.status(404).json({ message: 'Grade not found' });
            res.json({ message: 'Grade deleted.' });
        } catch (error) {
            console.error('Error deleting grade:', error);
            res.status(500).json({ message: 'Server error deleting grade.' });
        }
    });

    // A student's grade in each course they study (with fee).
    app.get('/api/students/:id/grades', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query(
                `SELECT scg.id, scg.course_id, c.name AS course_name, scg.grade_id,
                        g.name AS grade_name, g.monthly_fee, g.currency,
                        (SELECT sd.discount_percentage FROM student_discounts sd
                         WHERE sd.student_id = scg.student_id AND sd.course_id = scg.course_id AND sd.is_active = TRUE
                         ORDER BY CASE WHEN sd.discount_type = 'batch' THEN 1 ELSE 2 END, sd.discount_percentage DESC
                         LIMIT 1) AS discount_percentage
                 FROM student_course_grades scg
                 LEFT JOIN courses c ON scg.course_id = c.id
                 LEFT JOIN grades g ON scg.grade_id = g.id
                 WHERE scg.student_id = $1 ORDER BY c.name`, [id]
            );
            const rows = result.rows.map((r) => {
                const fee = Number(r.monthly_fee || 0);
                const pct = r.discount_percentage != null ? Number(r.discount_percentage) : 0;
                return { ...r, discount_percentage: pct, net_amount: pct > 0 ? fee - (fee * pct) / 100 : fee };
            });
            res.json(rows);
        } catch (error) {
            console.error('Error fetching student grades:', error);
            res.status(500).json({ message: 'Server error fetching student grades.' });
        }
    });

    // Assign / update a student's grade for a course (one grade per course).
    app.post('/api/students/:id/grades', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { course_id, grade_id } = req.body;
            if (!course_id || !grade_id) return res.status(400).json({ message: 'course_id and grade_id are required.' });
            const result = await pool.query(
                `INSERT INTO student_course_grades (student_id, course_id, grade_id)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (student_id, course_id)
                 DO UPDATE SET grade_id = EXCLUDED.grade_id, updated_at = NOW()
                 RETURNING *`,
                [id, course_id, grade_id]
            );
            res.status(201).json(result.rows[0]);

            // Notify the student of the enrollment (fire-and-forget).
            (async () => {
                try {
                    const info = await pool.query(
                        `SELECT c.name AS course_name, g.name AS grade_name, g.monthly_fee
                         FROM grades g LEFT JOIN courses c ON c.id = $1 WHERE g.id = $2`,
                        [course_id, grade_id]
                    );
                    const row = info.rows[0] || {};
                    createNotificationForUser(Number(id), 'Enrollment Updated',
                        `You've been enrolled in ${row.course_name || 'a course'} — ${row.grade_name || 'Grade'} (fee INR ${row.monthly_fee || 0}/month).`,
                        'Info');
                } catch (e) { console.error('[Grade assign] notify error:', e.message); }
            })();
        } catch (error) {
            console.error('Error assigning student grade:', error);
            res.status(500).json({ message: 'Server error assigning student grade.' });
        }
    });

    app.delete('/api/students/:id/grades/:courseId', ensureAdmin, async (req, res) => {
        try {
            const { id, courseId } = req.params;
            await pool.query('DELETE FROM student_course_grades WHERE student_id = $1 AND course_id = $2', [id, courseId]);
            res.json({ message: 'Student course grade removed.' });
        } catch (error) {
            console.error('Error removing student grade:', error);
            res.status(500).json({ message: 'Server error removing student grade.' });
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
            const { course_id, mode, monthly_fee, quarterly_fee, half_yearly_fee, annual_fee, batch_ids, grade } = req.body;
            const result = await pool.query(
                `INSERT INTO fee_structures (course_id, mode, monthly_fee, quarterly_fee, half_yearly_fee, annual_fee, batch_ids, grade)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [course_id, mode, monthly_fee, quarterly_fee, half_yearly_fee, annual_fee, batch_ids || [], grade || null]
            );
            res.status(201).json(result.rows[0]);

            // Notify active users (fire-and-forget)
            (async () => {
                try {
                    const users = await getActiveUsers();
                    for (const user of users) {
                        createNotificationForUser(
                            user.id,
                            'Fee Structure Updated',
                            'Fee structure has been updated. Please check the latest fees.',
                            'Info'
                        );
                    }
                    console.log(`[FeeStructure] Notified ${users.length} users for new fee structure`);
                } catch (e) {
                    console.error('[FeeStructure] Error sending notifications:', e.message);
                }
            })();
        } catch (error) {
            console.error('Error creating fee structure:', error);
            res.status(500).json({ message: 'Server error creating fee structure.' });
        }
    });

    app.put('/api/fee-structures/:id', ensureSuperAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { course_id, mode, monthly_fee, quarterly_fee, half_yearly_fee, annual_fee, batch_ids, grade } = req.body;
            const result = await pool.query(
                `UPDATE fee_structures SET
                    course_id = $1, mode = $2, monthly_fee = $3, quarterly_fee = $4,
                    half_yearly_fee = $5, annual_fee = $6, batch_ids = $7, grade = $8, updated_at = NOW()
                 WHERE id = $9 RETURNING *`,
                [course_id, mode, monthly_fee, quarterly_fee, half_yearly_fee, annual_fee, batch_ids || [], grade || null, id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Fee structure not found' });
            }
            res.json(result.rows[0]);

            // Notify active users (fire-and-forget)
            (async () => {
                try {
                    const users = await getActiveUsers();
                    for (const user of users) {
                        createNotificationForUser(
                            user.id,
                            'Fee Structure Updated',
                            'Fee structure has been updated. Please check the latest fees.',
                            'Info'
                        );
                    }
                    console.log(`[FeeStructure] Notified ${users.length} users for fee structure update`);
                } catch (e) {
                    console.error('[FeeStructure] Error sending notifications:', e.message);
                }
            })();
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

    // Purge ALL legacy fee_structures (the old ₹-per-course amounts). Fees are
    // grade-based now, so these are obsolete. Students/invoices are untouched.
    app.post('/api/admin/purge-fee-structures', ensureSuperAdmin, async (req, res) => {
        try {
            const result = await pool.query('DELETE FROM fee_structures RETURNING id');
            console.log(`[Purge] Deleted ${result.rows.length} legacy fee_structures.`);
            res.json({ message: `Deleted ${result.rows.length} legacy fee structure(s).`, deleted: result.rows.length });
        } catch (error) {
            console.error('Error purging fee structures:', error);
            res.status(500).json({ message: 'Server error purging fee structures.' });
        }
    });

    // Delete only the OLD unpaid invoices (legacy = not grade-based: grade_id IS
    // NULL). Grade-based invoices and any PAID invoice (history) are kept. Use
    // this once to clear pre-grade ₹ invoices, then re-generate from grades.
    app.post('/api/admin/purge-legacy-invoices', ensureSuperAdmin, async (req, res) => {
        try {
            const result = await pool.query(
                `DELETE FROM invoices WHERE LOWER(status) <> 'paid' AND grade_id IS NULL RETURNING id`
            );
            console.log(`[Purge] Deleted ${result.rows.length} legacy unpaid invoices.`);
            res.json({ message: `Deleted ${result.rows.length} old unpaid invoice(s).`, deleted: result.rows.length });
        } catch (error) {
            console.error('Error purging legacy invoices:', error);
            res.status(500).json({ message: 'Server error purging legacy invoices.' });
        }
    });

    // --- Student Discount API Endpoints ---
    // GET all discounts
    app.get('/api/student-discounts', async (req, res) => {
        try {
            const { student_id, course_id, batch_id, discount_type } = req.query;
            let query = 'SELECT * FROM student_discounts WHERE is_active = TRUE';
            const params = [];
            let paramIndex = 1;

            if (student_id) {
                query += ` AND student_id = $${paramIndex++}`;
                params.push(student_id);
            }
            if (course_id) {
                query += ` AND course_id = $${paramIndex++}`;
                params.push(course_id);
            }
            if (batch_id) {
                query += ` AND batch_id = $${paramIndex++}`;
                params.push(batch_id);
            }
            if (discount_type) {
                query += ` AND discount_type = $${paramIndex++}`;
                params.push(discount_type);
            }

            query += ' ORDER BY created_at DESC';
            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching discounts:', error);
            res.status(500).json({ message: 'Server error fetching discounts.' });
        }
    });

    // POST create discount
    app.post('/api/student-discounts', ensureSuperAdmin, async (req, res) => {
        try {
            const { student_id, discount_type, course_id, batch_id, discount_percentage, reason } = req.body;

            // Validation
            if (!student_id || !discount_type || !course_id || discount_percentage == null) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            if (discount_type === 'batch' && !batch_id) {
                return res.status(400).json({ message: 'batch_id is required for batch-level discounts' });
            }

            if (discount_type === 'course' && batch_id) {
                return res.status(400).json({ message: 'batch_id should not be provided for course-level discounts' });
            }

            // Deactivate existing discount if any
            await pool.query(
                `UPDATE student_discounts SET is_active = FALSE, updated_at = NOW()
                 WHERE student_id = $1 AND discount_type = $2 AND course_id = $3
                   AND ($4::INTEGER IS NULL OR batch_id = $4) AND is_active = TRUE`,
                [student_id, discount_type, course_id, batch_id || null]
            );

            // Create new discount
            const result = await pool.query(
                `INSERT INTO student_discounts (student_id, discount_type, course_id, batch_id, discount_percentage, reason)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [student_id, discount_type, course_id, batch_id || null, discount_percentage, reason]
            );

            // Apply the discount to this student's UNPAID invoices for the course so
            // they immediately show the discounted amount (original struck through).
            try {
                await pool.query(
                    `UPDATE invoices
                     SET original_amount = COALESCE(original_amount, amount),
                         discount_percentage = $3,
                         discount_amount = ROUND(COALESCE(original_amount, amount) * $3 / 100.0, 2),
                         amount = ROUND(COALESCE(original_amount, amount) * (100 - $3) / 100.0, 2),
                         updated_at = NOW()
                     WHERE student_id = $1 AND course_id = $2 AND LOWER(status) <> 'paid'`,
                    [student_id, course_id, discount_percentage]
                );
            } catch (e) { console.error('[Discount] invoice update failed:', e.message); }

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating discount:', error);
            res.status(500).json({ message: 'Server error creating discount.' });
        }
    });

    // PUT update discount
    app.put('/api/student-discounts/:id', ensureSuperAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { discount_percentage, reason, is_active } = req.body;

            const result = await pool.query(
                `UPDATE student_discounts SET
                    discount_percentage = COALESCE($1, discount_percentage),
                    reason = COALESCE($2, reason),
                    is_active = COALESCE($3, is_active),
                    updated_at = NOW()
                 WHERE id = $4 RETURNING *`,
                [discount_percentage, reason, is_active, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Discount not found' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating discount:', error);
            res.status(500).json({ message: 'Server error updating discount.' });
        }
    });

    // DELETE discount (soft delete by setting is_active = false)
    app.delete('/api/student-discounts/:id', ensureSuperAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query(
                'UPDATE student_discounts SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, student_id, course_id',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Discount not found' });
            }

            // Restore full price on this student's unpaid invoices for the course.
            try {
                const { student_id, course_id } = result.rows[0];
                await pool.query(
                    `UPDATE invoices
                     SET amount = COALESCE(original_amount, amount),
                         discount_percentage = 0, discount_amount = 0, updated_at = NOW()
                     WHERE student_id = $1 AND course_id = $2 AND LOWER(status) <> 'paid'`,
                    [student_id, course_id]
                );
            } catch (e) { console.error('[Discount] invoice restore failed:', e.message); }

            res.json({ message: 'Discount deleted successfully' });
        } catch (error) {
            console.error('Error deleting discount:', error);
            res.status(500).json({ message: 'Server error deleting discount.' });
        }
    });

    // GET student's applicable discount for a course/batch
    app.get('/api/student-discounts/calculate/:student_id', async (req, res) => {
        try {
            const { student_id } = req.params;
            const { course_id, batch_id } = req.query;

            if (!course_id) {
                return res.status(400).json({ message: 'course_id is required' });
            }

            // Check for batch-level discount first (more specific)
            if (batch_id) {
                const batchDiscount = await pool.query(
                    `SELECT * FROM student_discounts
                     WHERE student_id = $1 AND discount_type = 'batch'
                       AND course_id = $2 AND batch_id = $3 AND is_active = TRUE
                     ORDER BY discount_percentage DESC LIMIT 1`,
                    [student_id, course_id, batch_id]
                );

                if (batchDiscount.rows.length > 0) {
                    return res.json(batchDiscount.rows[0]);
                }
            }

            // Fall back to course-level discount
            const courseDiscount = await pool.query(
                `SELECT * FROM student_discounts
                 WHERE student_id = $1 AND discount_type = 'course'
                   AND course_id = $2 AND is_active = TRUE
                 ORDER BY discount_percentage DESC LIMIT 1`,
                [student_id, course_id]
            );

            if (courseDiscount.rows.length > 0) {
                return res.json(courseDiscount.rows[0]);
            }

            // No discount found
            res.json({ discount_percentage: 0, message: 'No discount applicable' });
        } catch (error) {
            console.error('Error calculating discount:', error);
            res.status(500).json({ message: 'Server error calculating discount.' });
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

            // Notify admins about new demo booking (fire-and-forget)
            (async () => {
                try {
                    const admins = await getActiveAdmins();
                    const name = student_name || parent_name || 'New student';
                    for (const admin of admins) {
                        createNotificationForUser(
                            admin.id,
                            'New Demo Booking',
                            `New demo booking from "${name}"${course ? ` for ${course}` : ''}.`,
                            'Info'
                        );
                    }
                    console.log(`[DemoBooking] Notified ${admins.length} admins for new booking "${name}"`);
                } catch (e) {
                    console.error('[DemoBooking] Error sending admin notifications:', e.message);
                }
            })();

            // Email the parent (confirmation) + admin (notification).
            try {
                const who = student_name || parent_name || 'Student';
                const when = [preferred_date, preferred_time].filter(Boolean).join(' ');
                if (email) {
                    const confMsg = `Thank you for booking a demo class with Nadanaloga Academy!\n\n` +
                        `Student: ${who}\nCourse: ${course || 'Not specified'}\n` +
                        `Preferred: ${when || 'To be confirmed'}\n${location ? `Location: ${location}\n` : ''}` +
                        `\nOur team will contact you shortly to confirm the schedule. See you soon!`;
                    sendEmailBackground(email, parent_name || who, 'Demo Class Booking Received - Nadanaloga', confMsg);
                }
                const adminMsg = `A new demo class booking was received:\n\n` +
                    `Student: ${student_name || 'N/A'}\nParent: ${parent_name || 'N/A'}\n` +
                    `Email: ${email || 'N/A'}\nPhone: ${phone || 'N/A'}\nCourse: ${course || 'N/A'}\n` +
                    `Preferred: ${when || 'N/A'}\n${location ? `Location: ${location}\n` : ''}${notes ? `Notes: ${notes}\n` : ''}` +
                    `\nReview it in the admin panel (Demo Bookings).`;
                sendEmailBackground(ADMIN_NOTIFY_EMAIL, 'Admin', 'New Demo Booking - Nadanaloga Academy', adminMsg);
            } catch (mailErr) {
                console.error('[DemoBooking] email error:', mailErr.message);
            }
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

            // Send demo booking status email (fire-and-forget)
            const booking = result.rows[0];
            if (booking.email && status) {
                (async () => {
                    try {
                        const statusMessages = {
                            confirmed: `Your demo class has been confirmed!\n\n📅 Date: ${scheduled_date || booking.preferred_date || 'TBA'}\n🕐 Time: ${scheduled_time || booking.preferred_time || 'TBA'}\n👨‍🏫 Teacher: ${assigned_teacher || 'To be assigned'}\n📚 Course: ${booking.course || 'Not specified'}\n\nWe look forward to seeing you!`,
                            cancelled: `We regret to inform you that your demo class booking has been cancelled.\n\n📚 Course: ${booking.course || 'Not specified'}\n\n${notes ? `📝 Note: ${notes}` : ''}\n\nPlease contact us if you'd like to reschedule.`,
                            completed: `Thank you for attending the demo class!\n\n📚 Course: ${booking.course || 'Not specified'}\n\nWe hope you enjoyed the experience. Contact us to enroll!`,
                        };
                        const msg = statusMessages[status] || `Your demo booking status has been updated to: ${status}.`;
                        const name = booking.student_name || booking.parent_name || 'Student';
                        sendEmailBackground(booking.email, name, `Demo Class - ${status.charAt(0).toUpperCase() + status.slice(1)}`, msg + '\n\nBest regards,\nNadanaloga Academy Team');
                    } catch (e) {
                        console.error('[DemoBooking] Error sending email:', e.message);
                    }
                })();
            }

            // Notify admins about demo booking update (fire-and-forget)
            (async () => {
                try {
                    const admins = await getActiveAdmins();
                    const name = booking.student_name || booking.parent_name || 'Student';
                    for (const admin of admins) {
                        createNotificationForUser(
                            admin.id,
                            'Demo Booking Updated',
                            `Demo booking for "${name}" updated to ${status || 'updated'}.`,
                            'Info'
                        );
                    }
                    console.log(`[DemoBooking] Notified ${admins.length} admins for booking update "${name}"`);
                } catch (e) {
                    console.error('[DemoBooking] Error sending admin update notifications:', e.message);
                }
            })();
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

            // Send event emails (fire-and-forget)
            (async () => {
                try {
                    const users = (recipient_ids && recipient_ids.length > 0)
                        ? await getUsersByIds(recipient_ids)
                        : await getActiveUsers();
                    const msg = `You're invited to an upcoming event!\n\n🎉 Event: ${title}\n📅 Date: ${event_date || 'To be announced'}\n🕐 Time: ${event_time || 'To be announced'}\n📍 Location: ${location || 'To be announced'}\n\n${description ? `📝 Description:\n${description}` : ''}\n\nWe look forward to seeing you there!\n\nBest regards,\nNadanaloga Academy Team`;
                    for (const user of users) {
                        sendEmailBackground(user.email, user.name, `Event Invitation - ${title}`, msg);
                        createNotificationForUser(user.id, 'New Event', `New event: "${title}" on ${event_date || 'TBA'}.`, 'Info');
                    }
                    console.log(`[Event] Sent event emails to ${users.length} users for "${title}"`);
                } catch (e) {
                    console.error('[Event] Error sending event emails:', e.message);
                }
            })();
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

            // Send grade exam notification emails (fire-and-forget)
            (async () => {
                try {
                    const users = (recipient_ids && recipient_ids.length > 0)
                        ? await getUsersByIds(recipient_ids)
                        : await getActiveUsers();
                    const msg = `A grade exam has been scheduled!\n\n📋 Exam: ${exam_name}\n📚 Course: ${course || 'Not specified'}\n📅 Date: ${exam_date || 'To be announced'}\n🕐 Time: ${exam_time || 'To be announced'}\n📍 Location: ${location || 'To be announced'}\n\n${syllabus ? `📖 Syllabus:\n${syllabus}` : ''}\n\nPlease prepare accordingly. Log in to your portal for more details.\n\nBest regards,\nNadanaloga Academy Team`;
                    for (const user of users) {
                        sendEmailBackground(user.email, user.name, `Grade Exam Scheduled - ${exam_name}`, msg);
                        createNotificationForUser(user.id, 'Grade Exam', `Grade exam "${exam_name}" scheduled for ${exam_date || 'TBA'}.`, 'Info');
                    }
                    console.log(`[GradeExam] Sent emails to ${users.length} users for "${exam_name}"`);
                } catch (e) {
                    console.error('[GradeExam] Error sending emails:', e.message);
                }
            })();
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

            // Send book materials emails (fire-and-forget)
            (async () => {
                try {
                    const users = (recipient_ids && recipient_ids.length > 0)
                        ? await getUsersByIds(recipient_ids)
                        : await getActiveUsers();
                    const msg = `New study material is now available!\n\n📖 Title: ${title}\n📚 Course: ${course || 'General'}\n\n${description ? `📝 Description:\n${description}` : ''}\n\nLog in to your portal to access the material.\n\nBest regards,\nNadanaloga Academy Team`;
                    for (const user of users) {
                        sendEmailBackground(user.email, user.name, `New Study Material - ${title}`, msg);
                        createNotificationForUser(user.id, 'New Material', `New study material available: "${title}".`, 'Info');
                    }
                    console.log(`[Materials] Sent emails to ${users.length} users for "${title}"`);
                } catch (e) {
                    console.error('[Materials] Error sending emails:', e.message);
                }
            })();
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

            // Send notice emails (fire-and-forget)
            (async () => {
                try {
                    const users = (recipient_ids && recipient_ids.length > 0)
                        ? await getUsersByIds(recipient_ids)
                        : await getActiveUsers();
                    const priorityEmoji = priority === 'high' ? '🚨' : priority === 'medium' ? '⚠️' : 'ℹ️';
                    const msg = `${priorityEmoji} Important Notice\n\n📢 ${title}\n\n${content}\n\n${expiry_date ? `⏰ Valid until: ${expiry_date}` : ''}\n\nPlease take note and log in to your portal for any required actions.\n\nBest regards,\nNadanaloga Academy Team`;
                    for (const user of users) {
                        sendEmailBackground(user.email, user.name, `Notice - ${title}`, msg);
                        createNotificationForUser(user.id, 'New Notice', `${priorityEmoji} ${title}`, 'Info');
                    }
                    console.log(`[Notice] Sent notice emails to ${users.length} users for "${title}"`);
                } catch (e) {
                    console.error('[Notice] Error sending notice emails:', e.message);
                }
            })();
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

            // Notify active users (fire-and-forget)
            (async () => {
                try {
                    const users = await getActiveUsers();
                    for (const user of users) {
                        createNotificationForUser(
                            user.id,
                            'New Location',
                            `New location added: "${name}".`,
                            'Info'
                        );
                    }
                    console.log(`[Location] Notified ${users.length} users for new location "${name}"`);
                } catch (e) {
                    console.error('[Location] Error sending notifications:', e.message);
                }
            })();
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

            // Notify active users (fire-and-forget)
            (async () => {
                try {
                    const users = await getActiveUsers();
                    for (const user of users) {
                        createNotificationForUser(
                            user.id,
                            'Location Updated',
                            `Location updated: "${name}".`,
                            'Info'
                        );
                    }
                    console.log(`[Location] Notified ${users.length} users for location update "${name}"`);
                } catch (e) {
                    console.error('[Location] Error sending notifications:', e.message);
                }
            })();
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

    // --- Razorpay online payments (auto-confirmed, no manual verification) ---
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
    const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const razorpayConfigured = () => RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET;

    // Mark an invoice paid from a verified Razorpay payment + notify (idempotent).
    // ======================= Fee ledger core =======================
    // invoice_payments is the single ledger. recordPayments() is the ONLY way a
    // bill becomes paid (cash at the office, Razorpay, approved proof) and
    // reverseReceipt() the only way to undo one — so the app, the reports and
    // the cash drawer can never disagree.
    const isRealEmail = (e) => !!e && String(e).includes('@') && !String(e).toLowerCase().endsWith('@child.nadanaloga.local');
    const inr = (n) => `₹${Math.round(Number(n || 0)).toLocaleString('en-IN')}`;
    const istDateTime = (d) => new Date(d || Date.now()).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const methodLabel = (method, collectedByName) => {
        const m = String(method || '').toLowerCase();
        if (m === 'cash') return `Cash (collected at the office${collectedByName ? ` by ${collectedByName}` : ''})`;
        if (m === 'razorpay') return 'Online (UPI via Razorpay)';
        return method || 'Payment';
    };
    const ledgerError = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });
    const sendLedgerError = (res, e, fallback) => {
        if (e && e.status) return res.status(e.status).json({ message: e.message });
        console.error(`[Ledger] ${fallback}`, e);
        return res.status(500).json({ message: fallback });
    };

    // Who hears about a student's fees: the linked parent, else the adult on the
    // same phone number, else the student. In-app/push go to the first of those;
    // email goes to the first with a REAL address — never a child placeholder
    // (…@child.nadanaloga.local), which silently lost every receipt before.
    const resolveFeeContact = async (studentId) => {
        const s = (await pool.query(
            'SELECT id, name, email, parent_id, contact_number FROM users WHERE id = $1', [studentId]
        )).rows[0];
        if (!s) return null;
        const candidates = [];
        if (s.parent_id) {
            const p = (await pool.query(
                'SELECT id, name, email FROM users WHERE id = $1 AND is_deleted = false', [s.parent_id]
            )).rows[0];
            if (p) candidates.push(p);
        }
        const digits = String(s.contact_number || '').replace(/\D/g, '');
        if (digits.length >= 7) {
            const adult = (await pool.query(
                `SELECT id, name, email FROM users
                 WHERE ${phoneMatchSql('$1')} AND is_deleted = false AND parent_id IS NULL AND id <> $2
                   AND COALESCE(email, '') NOT ILIKE '%@child.nadanaloga.local'
                 ORDER BY CASE WHEN LOWER(TRIM(role)) IN ('parent', 'teacher', 'admin') THEN 0 ELSE 1 END, id
                 LIMIT 1`, [digits, s.id]
            )).rows[0];
            if (adult) candidates.push(adult);
        }
        candidates.push(s);
        const target = candidates[0];
        const mailTo = candidates.find(c => isRealEmail(c.email));
        return {
            userId: target.id,
            name: target.name,
            email: mailTo ? mailTo.email : null,
            emailName: mailTo ? mailTo.name : target.name,
        };
    };

    // One message per family per receipt: email + in-app notification + push.
    const sendReceiptNotifications = async (kind, receipt) => {
        const byContact = new Map();
        for (const line of receipt.lines) {
            const c = await resolveFeeContact(line.studentId);
            if (!c) continue;
            if (!byContact.has(c.userId)) byContact.set(c.userId, { contact: c, lines: [] });
            byContact.get(c.userId).lines.push(line);
        }
        for (const { contact, lines } of byContact.values()) {
            const total = lines.reduce((s, l) => s + Number(l.amount || 0), 0);
            const who = [...new Set(lines.map(l => l.studentName))].join(', ');
            const detail = lines
                .map(l => `  • ${l.studentName} – ${l.courseName || 'Fees'} · ${l.billingPeriod || ''} · ${inr(l.amount)}`)
                .join('\n');
            let title, message, subject, body;
            if (kind === 'reversed') {
                title = 'Payment reversed';
                message = `Receipt ${receipt.receiptNumber} (${inr(total)}) for ${who} was reversed: ${receipt.reason}. This amount is due again.`;
                subject = `Receipt ${receipt.receiptNumber} reversed`;
                body = `Dear ${contact.emailName},\n\n`
                    + `Receipt ${receipt.receiptNumber} has been reversed by the academy.\n\n`
                    + `Reason   : ${receipt.reason}\nDate     : ${istDateTime(receipt.reversedAt)}\n\n`
                    + `Bills that are due again:\n${detail}\n\nAmount due: ${inr(total)}\n\n`
                    + `If you have any questions, please contact the office.\n\nRegards,\nNadanaloga Fine Arts Academy`;
            } else {
                title = 'Payment received ✅';
                message = `${inr(total)} received for ${who}. Receipt ${receipt.receiptNumber}.`;
                subject = `Payment received – Receipt ${receipt.receiptNumber}`;
                body = `Dear ${contact.emailName},\n\n`
                    + `We have received your fee payment. Thank you!\n\n`
                    + `Receipt number : ${receipt.receiptNumber}\n`
                    + `Date & time    : ${istDateTime(receipt.paidAt)}\n`
                    + `Paid by        : ${methodLabel(receipt.method, receipt.collectedByName)}\n\n`
                    + `Details:\n${detail}\n\nTotal paid: ${inr(total)}\n\n`
                    + `You can see this payment anytime in the Nadanaloga app under Fees.\n\n`
                    + `Regards,\nNadanaloga Fine Arts Academy`;
            }
            createNotificationForUser(contact.userId, title, message, kind === 'reversed' ? 'Warning' : 'Success');
            if (contact.email) sendEmailBackground(contact.email, contact.emailName, subject, body);
        }
    };

    const studentNames = async (ids) => {
        const rows = (await pool.query(
            'SELECT id, name, display_name FROM users WHERE id = ANY($1)', [[...new Set(ids)]]
        )).rows;
        return new Map(rows.map(r => [r.id, r.display_name || r.name]));
    };

    // THE only way a bill becomes paid. One ledger row per bill, all sharing one
    // receipt number (one handover = one receipt). Row-locked in a transaction, so
    // a bill can never be paid twice (cash + online racing, or a double tap).
    // existingPaymentId: approve an uploaded proof in place instead of inserting.
    const recordPayments = async ({
        invoiceIds, method, transactionId = null, collectedBy = null, notes = null,
        existingPaymentId = null, notify = true,
    }) => {
        const ids = [...new Set((invoiceIds || []).map(Number).filter(Number.isInteger))];
        if (ids.length === 0) throw ledgerError(400, 'No bills selected.');
        if (existingPaymentId && ids.length !== 1) throw ledgerError(400, 'A proof covers exactly one bill.');
        const client = await pool.connect();
        const lines = [];
        let receiptNumber;
        try {
            await client.query('BEGIN');
            const inv = await client.query('SELECT * FROM invoices WHERE id = ANY($1) ORDER BY id FOR UPDATE', [ids]);
            if (inv.rows.length !== ids.length) throw ledgerError(404, 'One or more bills were not found.');
            const already = inv.rows.find(r => String(r.status).toLowerCase() === 'paid');
            if (already) {
                const p = (await client.query(
                    `SELECT receipt_number, payment_method, collected_by_name, paid_at FROM invoice_payments
                     WHERE invoice_id = $1 AND status = 'approved' ORDER BY id DESC LIMIT 1`, [already.id]
                )).rows[0];
                throw ledgerError(409,
                    `Already paid${p ? ` — ${methodLabel(p.payment_method, p.collected_by_name)}, receipt ${p.receipt_number}, ${istDateTime(p.paid_at)}` : ''}.`,
                    { alreadyPaid: true });
            }
            receiptNumber = (await client.query(
                `SELECT 'NDA-R-' || lpad(nextval('payment_receipt_seq')::text, 6, '0') AS r`
            )).rows[0].r;
            for (const r of inv.rows) {
                if (existingPaymentId) {
                    const upd = await client.query(
                        `UPDATE invoice_payments
                         SET status = 'approved', approved_at = NOW(), paid_at = NOW(), receipt_number = $1,
                             collected_by = $2, collected_by_name = $3, notes = COALESCE($4, notes), updated_at = NOW()
                         WHERE id = $5 AND invoice_id = $6 AND status = 'submitted' RETURNING id`,
                        [receiptNumber, collectedBy?.id || null, collectedBy?.name || null, notes, existingPaymentId, r.id]
                    );
                    if (upd.rows.length === 0) throw ledgerError(409, 'This payment proof was already processed.');
                } else {
                    await client.query(
                        `INSERT INTO invoice_payments (invoice_id, student_id, amount, payment_method, transaction_id,
                            payment_date, status, approved_at, paid_at, receipt_number, collected_by, collected_by_name, notes)
                         VALUES ($1, $2, $3, $4, $5, (NOW() AT TIME ZONE 'Asia/Kolkata')::date, 'approved', NOW(), NOW(),
                            $6, $7, $8, $9)`,
                        [r.id, r.student_id, r.amount, method, transactionId, receiptNumber,
                            collectedBy?.id || null, collectedBy?.name || null, notes]
                    );
                }
                await client.query(
                    `UPDATE invoices SET status = 'paid', payment_details = $1, updated_at = NOW() WHERE id = $2`,
                    [{
                        payment_method: method, transaction_id: transactionId, receipt_number: receiptNumber,
                        collected_by: collectedBy?.name || null, payment_status: 'approved',
                        payment_date: new Date().toISOString().slice(0, 10),
                    }, r.id]
                );
                lines.push({
                    invoiceId: r.id, studentId: r.student_id, courseName: r.course_name,
                    billingPeriod: r.billing_period, amount: Number(r.amount),
                });
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK').catch(() => {});
            throw e;
        } finally {
            client.release();
        }
        const names = await studentNames(lines.map(l => l.studentId));
        lines.forEach(l => { l.studentName = names.get(l.studentId) || 'Student'; });
        const receipt = {
            receiptNumber, method, transactionId, paidAt: new Date(),
            collectedByName: collectedBy?.name || null, lines,
            total: lines.reduce((s, l) => s + l.amount, 0),
        };
        if (notify) sendReceiptNotifications('paid', receipt).catch(e => console.error('[Ledger] notify failed:', e.message));
        console.log(`[Ledger] ${receiptNumber}: ${method} ${inr(receipt.total)} for bill(s) ${ids.join(', ')}${collectedBy ? ` by ${collectedBy.name}` : ''}`);
        return receipt;
    };

    // Undo a whole receipt (admin only, reason required). Never deletes: the rows
    // are marked reversed with who/when/why, the bills go back to pending, and the
    // family is told. Reversed rows drop out of every 'approved' total.
    const reverseReceipt = async ({ receiptNumber, reason, reversedBy }) => {
        const why = String(reason || '').trim();
        if (!why) throw ledgerError(400, 'A reason is required to reverse a receipt.');
        const client = await pool.connect();
        let live;
        try {
            await client.query('BEGIN');
            const rows = (await client.query(
                'SELECT * FROM invoice_payments WHERE receipt_number = $1 ORDER BY id FOR UPDATE', [receiptNumber]
            )).rows;
            if (rows.length === 0) throw ledgerError(404, 'Receipt not found.');
            live = rows.filter(r => r.status === 'approved');
            if (live.length === 0) throw ledgerError(409, 'This receipt has already been reversed.');
            await client.query(
                `UPDATE invoice_payments SET status = 'reversed', reversed_at = NOW(), reversed_by = $1,
                    reversed_by_name = $2, reversal_reason = $3, updated_at = NOW()
                 WHERE receipt_number = $4 AND status = 'approved'`,
                [reversedBy?.id || null, reversedBy?.name || null, why, receiptNumber]
            );
            await client.query(
                `UPDATE invoices SET status = 'pending', payment_details = NULL, updated_at = NOW() WHERE id = ANY($1)`,
                [live.map(r => r.invoice_id)]
            );
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK').catch(() => {});
            throw e;
        } finally {
            client.release();
        }
        const inv = (await pool.query(
            'SELECT id, student_id, course_name, billing_period, amount FROM invoices WHERE id = ANY($1)',
            [live.map(r => r.invoice_id)]
        )).rows;
        const names = await studentNames(inv.map(i => i.student_id));
        const receipt = {
            receiptNumber, reason: why, reversedAt: new Date(), reversedByName: reversedBy?.name || null,
            lines: inv.map(i => ({
                invoiceId: i.id, studentId: i.student_id, studentName: names.get(i.student_id) || 'Student',
                courseName: i.course_name, billingPeriod: i.billing_period, amount: Number(i.amount),
            })),
        };
        receipt.total = receipt.lines.reduce((s, l) => s + l.amount, 0);
        sendReceiptNotifications('reversed', receipt).catch(e => console.error('[Ledger] reversal notify failed:', e.message));
        console.log(`[Ledger] ${receiptNumber} REVERSED by ${reversedBy?.name || '?'}: ${why}`);
        return receipt;
    };

    // Razorpay confirmation (both the checkout callback and the webhook call this;
    // whichever arrives second is a no-op).
    const markInvoicePaidFromRazorpay = async (invoiceId, paymentId, amountPaise) => {
        const dup = await pool.query(
            `SELECT id FROM invoice_payments WHERE transaction_id = $1 AND payment_method = 'Razorpay'
               AND status IN ('approved', 'needs_refund') LIMIT 1`, [paymentId]
        );
        if (dup.rows.length > 0) return;
        const invoice = (await pool.query('SELECT * FROM invoices WHERE id = $1', [invoiceId])).rows[0];
        if (!invoice) return;
        let receipt;
        try {
            receipt = await recordPayments({ invoiceIds: [invoiceId], method: 'Razorpay', transactionId: paymentId });
        } catch (e) {
            if (e && e.alreadyPaid) {
                // Money arrived online for a bill that was already paid (e.g. cash at
                // the office moments earlier). Keep a NON-counting record and ask the
                // admin to refund — never silently count it twice.
                await pool.query(
                    `INSERT INTO invoice_payments (invoice_id, student_id, amount, payment_method, transaction_id,
                        payment_date, status, notes)
                     VALUES ($1, $2, $3, 'Razorpay', $4, (NOW() AT TIME ZONE 'Asia/Kolkata')::date, 'needs_refund', $5)`,
                    [invoiceId, invoice.student_id, amountPaise != null ? amountPaise / 100 : invoice.amount, paymentId,
                        'Bill was already paid — refund this online payment from the Razorpay dashboard']
                ).catch(err => console.error('[Razorpay] needs_refund record failed:', err.message));
                sendEmailBackground(ADMIN_NOTIFY_EMAIL, 'Admin', `Refund needed – bill #${invoiceId} paid twice`,
                    `An online payment (${paymentId}) arrived for bill #${invoiceId} (${invoice.course_name || 'fees'}, ${invoice.billing_period || ''}), `
                    + `which was already paid.\n\nPlease refund this payment from the Razorpay dashboard.`);
                return;
            }
            if (e && e.code === '23505') return; // raced with the other confirmation — already recorded
            throw e;
        }
        // Admin alerts (the family's receipt is sent by recordPayments).
        (async () => {
            try {
                const who = receipt.lines.map(l => l.studentName).join(', ');
                const adminMsg = `${who} paid ${inr(receipt.total)} online (${invoice.course_name || 'fees'}). Receipt ${receipt.receiptNumber}.`;
                for (const admin of await getActiveAdmins()) {
                    createNotificationForUser(admin.id, 'Fee Payment Received', adminMsg, 'Success');
                }
                notifyAdminWhatsApp(who, inr(receipt.total), paymentId, invoiceId);
            } catch (e) { console.error('[Razorpay] admin notify error:', e.message); }
        })();
    };

    // Create a Razorpay order for an invoice; the app opens checkout with it.
    app.post('/api/invoices/:id/razorpay-order', ensureAuthenticated, async (req, res) => {
        try {
            if (!razorpayConfigured()) {
                return res.status(503).json({ message: 'Online payments are not configured yet.' });
            }
            const { id } = req.params;
            const invRes = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
            if (invRes.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
            const invoice = invRes.rows[0];

            const user = req.session.user;
            const isAdminUser = (user?.role && user.role.toLowerCase() === 'admin') || user?.is_super_admin === true;
            // Anyone in the household may pay for any of its students (a parent
            // paying a child's invoice), not only the invoice's own account.
            const { studentIds: householdStudentIds } = await householdFor(req);
            if (!isAdminUser && !householdStudentIds.map(Number).includes(Number(invoice.student_id))) {
                return res.status(403).json({ message: 'Forbidden.' });
            }
            if (invoice.status === 'paid') return res.status(400).json({ message: 'Invoice already paid.' });

            const amountPaise = Math.round(Number(invoice.amount) * 100);
            const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
            const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
                method: 'POST',
                headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amountPaise,
                    currency: invoice.currency || 'INR',
                    receipt: `invoice_${id}`,
                    notes: { invoice_id: String(id), student_id: String(invoice.student_id || '') }
                })
            });
            const order = await rpRes.json();
            if (!rpRes.ok) {
                console.error('[Razorpay] order creation failed:', order);
                return res.status(502).json({ message: 'Could not create payment order.' });
            }
            res.json({
                order_id: order.id,
                amount: amountPaise,
                currency: invoice.currency || 'INR',
                key_id: RAZORPAY_KEY_ID,
                invoice_id: Number(id),
                name: 'Nadanaloga Academy',
                description: invoice.course_name || 'Fee payment',
                prefill: { name: user?.name || '', email: user?.email || '', contact: user?.contact_number || '' }
            });
        } catch (error) {
            console.error('Error creating Razorpay order:', error);
            res.status(500).json({ message: 'Server error creating payment order.' });
        }
    });

    // Verify a checkout result from the app (instant confirmation path).
    app.post('/api/razorpay/verify-payment', ensureAuthenticated, async (req, res) => {
        try {
            if (!razorpayConfigured()) return res.status(503).json({ message: 'Online payments not configured.' });
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoice_id } = req.body;
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return res.status(400).json({ message: 'Missing payment verification fields.' });
            }
            const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
            if (expected !== razorpay_signature) {
                return res.status(400).json({ message: 'Payment signature verification failed.' });
            }
            if (invoice_id) await markInvoicePaidFromRazorpay(Number(invoice_id), razorpay_payment_id, null);
            res.json({ message: 'Payment verified.', verified: true });
        } catch (error) {
            console.error('Error verifying Razorpay payment:', error);
            res.status(500).json({ message: 'Server error verifying payment.' });
        }
    });

    // Razorpay webhook — the authoritative confirmation (server-to-server).
    app.post('/api/razorpay/webhook', async (req, res) => {
        try {
            if (!RAZORPAY_WEBHOOK_SECRET) return res.status(503).end();
            const signature = req.headers['x-razorpay-signature'];
            const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
                .update(req.rawBody || Buffer.from('')).digest('hex');
            if (signature !== expected) {
                console.warn('[Razorpay] webhook signature mismatch');
                return res.status(400).end();
            }
            const event = req.body?.event;
            const entity = req.body?.payload?.payment?.entity || req.body?.payload?.order?.entity;
            if (event === 'payment.captured' || event === 'order.paid') {
                const paymentId = req.body?.payload?.payment?.entity?.id;
                const amount = req.body?.payload?.payment?.entity?.amount;
                const invoiceId = entity?.notes?.invoice_id ||
                    req.body?.payload?.order?.entity?.notes?.invoice_id;
                if (invoiceId) await markInvoicePaidFromRazorpay(Number(invoiceId), paymentId, amount);
            }
            res.status(200).json({ received: true });
        } catch (error) {
            console.error('Razorpay webhook error:', error);
            res.status(500).end();
        }
    });

    // Combined family fee summary for the logged-in parent/student: the
    // total unpaid across all their students, plus a per-student split.
    app.get('/api/parent/fee-summary', ensureAuthenticated, async (req, res) => {
        try {
            // Every student in the household (all accounts sharing the phone + children).
            const { studentIds, nameById } = await householdFor(req);
            if (studentIds.length === 0) {
                return res.json({ students: [], total_due: 0, count: 0 });
            }

            const invRes = await pool.query(
                `SELECT * FROM invoices WHERE student_id = ANY($1) AND status IN ('pending', 'overdue')
                 ORDER BY due_date NULLS LAST, id`,
                [studentIds]
            );
            const byStudent = {};
            for (const inv of invRes.rows) {
                const sid = inv.student_id;
                if (!byStudent[sid]) {
                    byStudent[sid] = { student_id: sid, student_name: nameById[sid] || 'Student', invoices: [], total: 0 };
                }
                byStudent[sid].invoices.push(inv);
                byStudent[sid].total += Number(inv.amount || 0);
            }
            const students = Object.values(byStudent).filter((s) => s.invoices.length > 0);
            const totalDue = students.reduce((sum, s) => sum + s.total, 0);
            res.json({ students, total_due: totalDue, count: students.length });
        } catch (error) {
            console.error('Error building family fee summary:', error);
            res.status(500).json({ message: 'Server error building fee summary.' });
        }
    });

    // --- Reports (admin/superadmin, filterable, CSV-downloadable) ---
    const csvEscape = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const buildCsv = (columns, rows) => {
        const header = columns.map((c) => csvEscape(c.label)).join(',');
        const body = rows
            .map((r) => columns.map((c) => csvEscape(r[c.key])).join(','))
            .join('\n');
        return header + '\n' + body;
    };
    const sendReport = (res, filename, columns, rows, extra, format) => {
        if (String(format || '').toLowerCase() === 'csv') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
            return res.send(buildCsv(columns, rows));
        }
        res.json({ rows, count: rows.length, ...extra });
    };

    // Fee collections (approved payments) in a date range.
    app.get('/api/reports/collections', ensureAdmin, async (req, res) => {
        try {
            const { from, to, method, format } = req.query;
            const params = [];
            let where = "WHERE ip.status = 'approved'";
            if (from) { params.push(from); where += ` AND ip.payment_date >= $${params.length}`; }
            if (to) { params.push(to); where += ` AND ip.payment_date <= $${params.length}`; }
            if (method) { params.push(method); where += ` AND ip.payment_method = $${params.length}`; }
            const result = await pool.query(
                `SELECT to_char(ip.payment_date, 'YYYY-MM-DD') AS date, u.name AS student, i.course_name AS course,
                        ip.amount, ip.payment_method AS method, ip.transaction_id AS txn
                 FROM invoice_payments ip
                 LEFT JOIN invoices i ON ip.invoice_id = i.id
                 LEFT JOIN users u ON ip.student_id = u.id
                 ${where} ORDER BY ip.payment_date DESC NULLS LAST, ip.id DESC`, params
            );
            const total = result.rows.reduce((s, r) => s + Number(r.amount || 0), 0);
            const columns = [
                { key: 'date', label: 'Date' }, { key: 'student', label: 'Student' },
                { key: 'course', label: 'Course/Grade' }, { key: 'amount', label: 'Amount' },
                { key: 'method', label: 'Method' }, { key: 'txn', label: 'Transaction ID' },
            ];
            sendReport(res, `collections_${from || 'all'}_${to || 'all'}`, columns, result.rows, { total }, format);
        } catch (error) {
            console.error('Error building collections report:', error);
            res.status(500).json({ message: 'Server error building report.' });
        }
    });

    // Outstanding fees (unpaid/overdue invoices).
    app.get('/api/reports/outstanding', ensureAdmin, async (req, res) => {
        try {
            const { status, billing_period, format } = req.query;
            const params = [];
            let where = "WHERE i.status IN ('pending', 'overdue')";
            if (status) { params.push(status); where += ` AND i.status = $${params.length}`; }
            if (billing_period) { params.push(billing_period); where += ` AND i.billing_period = $${params.length}`; }
            const result = await pool.query(
                `SELECT u.name AS student, u.contact_number AS phone, i.course_name AS course,
                        i.amount, i.status, i.billing_period, to_char(i.due_date, 'YYYY-MM-DD') AS due
                 FROM invoices i LEFT JOIN users u ON i.student_id = u.id
                 ${where} ORDER BY i.due_date NULLS LAST, u.name`, params
            );
            const total = result.rows.reduce((s, r) => s + Number(r.amount || 0), 0);
            const columns = [
                { key: 'student', label: 'Student' }, { key: 'phone', label: 'Phone' },
                { key: 'course', label: 'Course/Grade' }, { key: 'amount', label: 'Amount' },
                { key: 'status', label: 'Status' }, { key: 'billing_period', label: 'Period' },
                { key: 'due', label: 'Due Date' },
            ];
            sendReport(res, 'outstanding_fees', columns, result.rows, { total }, format);
        } catch (error) {
            console.error('Error building outstanding report:', error);
            res.status(500).json({ message: 'Server error building report.' });
        }
    });

    // Student roster with grade + courses.
    app.get('/api/reports/students', ensureAdmin, async (req, res) => {
        try {
            const { status, format } = req.query;
            const params = [];
            let where = "WHERE LOWER(u.role) = 'student' AND u.is_deleted = false";
            if (status) { params.push(status); where += ` AND u.status = $${params.length}`; }
            const result = await pool.query(
                `SELECT u.name AS student, u.email, u.contact_number AS phone, u.courses,
                        COALESCE(string_agg(DISTINCT c.name || ' - ' || g.name, ', '), '') AS grades,
                        to_char(u.created_at, 'YYYY-MM-DD') AS joined, u.status
                 FROM users u
                 LEFT JOIN student_course_grades scg ON scg.student_id = u.id
                 LEFT JOIN courses c ON scg.course_id = c.id
                 LEFT JOIN grades g ON scg.grade_id = g.id
                 ${where}
                 GROUP BY u.id ORDER BY u.name`, params
            );
            const rows = result.rows.map((r) => ({
                ...r,
                courses: Array.isArray(safeJsonArray(r.courses)) ? safeJsonArray(r.courses).join(', ') : '',
            }));
            const columns = [
                { key: 'student', label: 'Student' }, { key: 'email', label: 'Email' },
                { key: 'phone', label: 'Phone' }, { key: 'courses', label: 'Courses' },
                { key: 'grades', label: 'Grades' }, { key: 'joined', label: 'Joined' },
                { key: 'status', label: 'Status' },
            ];
            sendReport(res, 'student_roster', columns, rows, {}, format);
        } catch (error) {
            console.error('Error building students report:', error);
            res.status(500).json({ message: 'Server error building report.' });
        }
    });

    // Send payment reminders for a set of unpaid invoices. Creates an in-app
    // notification for each student and returns a WhatsApp deep-link (wa.me) per
    // invoice so the admin can send the reminder to the parent with one tap.
    app.post('/api/invoices/send-reminders', ensureAdmin, async (req, res) => {
        try {
            const { invoice_ids } = req.body;
            if (!Array.isArray(invoice_ids) || invoice_ids.length === 0) {
                return res.status(400).json({ message: 'invoice_ids required' });
            }
            const rows = (await pool.query(
                `SELECT i.id, i.amount, i.currency, i.billing_period, i.due_date, i.status,
                        u.id AS student_id, u.name AS student_name, u.contact_number AS phone
                 FROM invoices i LEFT JOIN users u ON i.student_id = u.id
                 WHERE i.id = ANY($1) AND LOWER(i.status) <> 'paid'`,
                [invoice_ids]
            )).rows;
            const results = rows.map((r) => {
                const amt = Number(r.amount || 0).toFixed(0);
                const msg = `Dear Parent, a gentle reminder from Nadanaloga Academy: ${r.student_name}'s fee of INR ${amt} for ${r.billing_period || 'this month'} is pending${r.due_date ? ` (due ${String(r.due_date).split('T')[0]})` : ''}. Kindly pay at your earliest. Thank you.`;
                // Normalise Indian numbers to wa.me format (91XXXXXXXXXX).
                let digits = String(r.phone || '').replace(/\D/g, '');
                if (digits.length === 10) digits = '91' + digits;
                const waLink = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}` : null;
                // In-app reminder too.
                try {
                    if (r.student_id) createNotificationForUser(r.student_id, 'Fee Reminder',
                        `Your fee of INR ${amt} for ${r.billing_period || 'this month'} is pending. Please pay soon.`, 'Warning');
                } catch (_) {}
                return { invoice_id: r.id, student_name: r.student_name, phone: r.phone || null, amount: amt, message: msg, wa_link: waLink };
            });
            res.json({ count: results.length, reminders: results });
        } catch (error) {
            console.error('Error sending reminders:', error);
            res.status(500).json({ message: 'Server error sending reminders.' });
        }
    });

    // --- Invoice API Endpoints ---
    app.get('/api/invoices', async (req, res) => {
        try {
            const { course_id, batch_id, grade_id, status, billing_period, student_id, search } = req.query;
            const params = [];
            const where = [];
            if (course_id) { params.push(course_id); where.push(`i.course_id = $${params.length}`); }
            if (batch_id) { params.push(batch_id); where.push(`i.batch_id = $${params.length}`); }
            if (grade_id) { params.push(grade_id); where.push(`i.grade_id = $${params.length}`); }
            if (status) { params.push(String(status).toLowerCase()); where.push(`LOWER(i.status) = $${params.length}`); }
            if (billing_period) { params.push(billing_period); where.push(`i.billing_period = $${params.length}`); }
            if (student_id) { params.push(student_id); where.push(`i.student_id = $${params.length}`); }
            if (search) { params.push(`%${search}%`); where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.user_id ILIKE $${params.length})`); }
            const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
            const result = await pool.query(`
                SELECT i.*, u.id as student_id, u.name as student_name, u.email as student_email,
                    u.contact_number as student_phone,
                    (SELECT ip.status FROM invoice_payments ip
                     WHERE ip.invoice_id = i.id ORDER BY ip.submitted_at DESC LIMIT 1) as payment_status,
                    lp.receipt_number, lp.payment_method AS paid_method, lp.paid_at, lp.collected_by_name
                FROM invoices i
                LEFT JOIN users u ON i.student_id = u.id
                LEFT JOIN LATERAL (
                    SELECT receipt_number, payment_method, paid_at, collected_by_name FROM invoice_payments
                    WHERE invoice_id = i.id AND status = 'approved' ORDER BY id DESC LIMIT 1
                ) lp ON true
                ${whereSql}
                ORDER BY i.created_at DESC
            `, params);
            const invoices = result.rows.map(row => ({
                ...row,
                student: row.student_id ? {
                    id: row.student_id,
                    name: row.student_name,
                    email: row.student_email,
                    phone: row.student_phone
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

            // Calculate discount if applicable
            let original_amount = amount;
            let discount_percentage = null;
            let discount_amount = null;
            let final_amount = amount;

            if (student_id && fee_structure_id) {
                // Get fee structure to find course_id and batch_ids
                const feeStructureResult = await pool.query('SELECT course_id, batch_ids FROM fee_structures WHERE id = $1', [fee_structure_id]);
                if (feeStructureResult.rows.length > 0) {
                    const { course_id, batch_ids } = feeStructureResult.rows[0];

                    // Query for applicable discounts (batch-level takes precedence)
                    let discountQuery = `
                        SELECT discount_percentage, discount_type
                        FROM student_discounts
                        WHERE student_id = $1
                          AND course_id = $2
                          AND is_active = TRUE
                        ORDER BY
                          CASE WHEN discount_type = 'batch' THEN 1 ELSE 2 END,
                          discount_percentage DESC
                        LIMIT 1
                    `;

                    const discountResult = await pool.query(discountQuery, [student_id, course_id]);

                    if (discountResult.rows.length > 0) {
                        discount_percentage = parseFloat(discountResult.rows[0].discount_percentage);
                        discount_amount = (amount * discount_percentage) / 100;
                        final_amount = amount - discount_amount;
                    }
                }
            }

            const result = await pool.query(
                `INSERT INTO invoices (student_id, fee_structure_id, course_name, amount, currency, issue_date, due_date, billing_period, status, payment_details, original_amount, discount_percentage, discount_amount)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
                [student_id, fee_structure_id, course_name, final_amount, currency, issue_date, due_date, billing_period, status || 'pending', payment_details, original_amount, discount_percentage, discount_amount]
            );
            res.status(201).json(result.rows[0]);

            // Send invoice email to student (fire-and-forget)
            if (student_id) {
                (async () => {
                    try {
                        const students = await getUsersByIds([student_id]);
                        if (students.length > 0) {
                            const student = students[0];
                            const discountInfo = discount_percentage ? `\n🎁 Discount: ${discount_percentage}% off (₹${discount_amount?.toFixed(0)} saved!)` : '';
                            const amountInfo = discount_percentage ? `Original: ${currency || 'INR'} ${original_amount}\n💰 Final Amount: ${currency || 'INR'} ${final_amount}` : `💰 Amount: ${currency || 'INR'} ${final_amount}`;
                            const msg = `A new fee invoice has been generated for you.\n\n📋 Invoice #${result.rows[0].id}\n📚 Course: ${course_name || 'Not specified'}\n${amountInfo}${discountInfo}\n📅 Issue Date: ${issue_date || 'Today'}\n⏰ Due Date: ${due_date || 'Not specified'}\n📊 Status: ${status || 'Pending'}\n\nPlease log in to your portal to view and pay your invoice.\n\nBest regards,\nNadanaloga Academy Team`;
                            sendEmailBackground(student.email, student.name, `Fee Invoice - ${course_name || 'Nadanaloga Academy'}`, msg);
                            const notifMsg = discount_percentage
                                ? `Invoice of ${currency || 'INR'} ${final_amount} (${discount_percentage}% discount applied!) for ${course_name || 'fees'} is due by ${due_date || 'TBA'}.`
                                : `Invoice of ${currency || 'INR'} ${final_amount} for ${course_name || 'fees'} is due by ${due_date || 'TBA'}.`;
                            createNotificationForUser(student.id, 'New Invoice', notifMsg, 'Info');
                        }
                    } catch (e) {
                        console.error('[Invoice] Error sending email:', e.message);
                    }
                })();
            }
        } catch (error) {
            console.error('Error creating invoice:', error);
            res.status(500).json({ message: 'Server error creating invoice.' });
        }
    });

    app.put('/api/invoices/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { status, payment_details } = req.body;
            const current = (await pool.query('SELECT * FROM invoices WHERE id = $1', [id])).rows[0];
            if (!current) return res.status(404).json({ message: 'Invoice not found' });
            const want = String(status || '').toLowerCase();
            const isPaid = String(current.status || '').toLowerCase() === 'paid';

            if (want === 'paid') {
                // Old "Mark paid" buttons (and older app builds) land here. Route them
                // through the ledger so they get a receipt, a collector and a family
                // notification — status is never flipped by hand any more.
                if (isPaid) return res.json(current); // idempotent for repeat taps
                let pd = payment_details || {};
                if (typeof pd === 'string') { try { pd = JSON.parse(pd); } catch (_) { pd = {}; } }
                const raw = String(pd.payment_method || '').trim();
                const method = !raw || /^(offline|cash)$/i.test(raw) ? 'Cash' : raw;
                const receipt = await recordPayments({
                    invoiceIds: [Number(id)], method, transactionId: pd.transaction_id || null,
                    collectedBy: { id: req.session.user.id, name: req.session.user.name },
                });
                const updated = (await pool.query('SELECT * FROM invoices WHERE id = $1', [id])).rows[0];
                return res.json({ ...updated, receipt_number: receipt.receiptNumber });
            }
            if (isPaid) {
                return res.status(409).json({
                    message: 'This bill is paid. To undo a payment, reverse its receipt — that keeps an audit trail and tells the family.',
                });
            }
            const result = await pool.query(
                `UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
                [want || current.status, id]
            );
            res.json(result.rows[0]);
        } catch (error) {
            sendLedgerError(res, error, 'Server error updating invoice.');
        }
    });

    // --- Invoice Payment Proof API Endpoints ---
    app.post('/api/invoices/:id/payment-proof', ensureAuthenticated, uploadPaymentProof.single('proof'), async (req, res) => {
        try {
            const { id } = req.params;
            if (!req.file) {
                return res.status(400).json({ message: 'Payment proof image is required.' });
            }

            const invoiceResult = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
            if (invoiceResult.rows.length === 0) {
                return res.status(404).json({ message: 'Invoice not found' });
            }
            const invoice = invoiceResult.rows[0];

            const user = req.session.user;
            const isAdminUser = (user?.role && user.role.toLowerCase() === 'admin') || user?.is_super_admin === true;
            // Anyone in the household may submit proof for any of its students.
            const { studentIds: householdStudentIds } = await householdFor(req);
            if (!isAdminUser && !householdStudentIds.map(Number).includes(Number(invoice.student_id))) {
                return res.status(403).json({ message: 'Forbidden: You can only submit proof for a student in your household.' });
            }

            const { transaction_id, payment_date, amount, payment_method } = req.body;
            const proofUrl = `/uploads/payments/${req.file.filename}`;
            const paymentAmount = amount || invoice.amount;
            const method = payment_method || 'UPI';

            // Record the proof as 'submitted' (pending verification). The invoice is
            // NOT auto-marked paid — an admin reviews the proof against the bank and
            // approves it (PUT /api/invoice-payments/:id), which then marks it paid.
            const result = await pool.query(
                `INSERT INTO invoice_payments (invoice_id, student_id, amount, payment_method, transaction_id, payment_date, proof_url, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted') RETURNING *`,
                [id, invoice.student_id, paymentAmount, method, transaction_id || null, payment_date || null, proofUrl]
            );

            console.log(`[InvoicePayment] Proof submitted for invoice #${id}, awaiting admin verification`);

            res.status(201).json(result.rows[0]);

            // Notify admins so they can verify (fire-and-forget)
            (async () => {
                try {
                    const admins = await getActiveAdmins();
                    const displayName = user?.name || 'Student';
                    for (const admin of admins) {
                        createNotificationForUser(
                            admin.id,
                            'Payment Awaiting Verification',
                            `${displayName} submitted payment proof for Invoice #${id}. Please verify and approve.`,
                            'Info'
                        );
                    }
                    console.log(`[InvoicePayment] Notified ${admins.length} admins for invoice #${id}`);
                } catch (e) {
                    console.error('[InvoicePayment] Error notifying admins:', e.message);
                }
            })();
        } catch (error) {
            console.error('Error submitting payment proof:', error);
            res.status(500).json({ message: 'Server error submitting payment proof.' });
        }
    });

    app.get('/api/invoices/:id/payment-proof', ensureAuthenticated, async (req, res) => {
        try {
            const { id } = req.params;
            const invoiceResult = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
            if (invoiceResult.rows.length === 0) {
                return res.status(404).json({ message: 'Invoice not found' });
            }
            const invoice = invoiceResult.rows[0];

            const user = req.session.user;
            const isAdminUser = (user?.role && user.role.toLowerCase() === 'admin') || user?.is_super_admin === true;
            if (!isAdminUser && invoice.student_id !== user?.id) {
                return res.status(403).json({ message: 'Forbidden: You can only view your own payment proof.' });
            }

            const result = await pool.query(
                `SELECT * FROM invoice_payments WHERE invoice_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
                [id]
            );
            res.json(result.rows[0] || null);
        } catch (error) {
            console.error('Error fetching payment proof:', error);
            res.status(500).json({ message: 'Server error fetching payment proof.' });
        }
    });

    app.get('/api/invoice-payments', ensureAdmin, async (req, res) => {
        try {
            const { status } = req.query;
            const params = [];
            let whereClause = '';
            if (status) {
                params.push(status);
                whereClause = `WHERE ip.status = $${params.length}`;
            }
            const result = await pool.query(
                `
                SELECT ip.*, u.name as student_name, u.email as student_email,
                       i.course_name, i.amount as invoice_amount, i.currency, i.status as invoice_status
                FROM invoice_payments ip
                LEFT JOIN users u ON ip.student_id = u.id
                LEFT JOIN invoices i ON ip.invoice_id = i.id
                ${whereClause}
                ORDER BY ip.submitted_at DESC
                `,
                params
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching invoice payments:', error);
            res.status(500).json({ message: 'Server error fetching invoice payments.' });
        }
    });

    app.put('/api/invoice-payments/:id', ensureAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;
            if (!status || !['approved', 'rejected', 'submitted'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status. Must be approved, rejected, or submitted.' });
            }
            const payment = (await pool.query('SELECT * FROM invoice_payments WHERE id = $1', [id])).rows[0];
            if (!payment) return res.status(404).json({ message: 'Invoice payment not found' });

            if (status === 'approved') {
                // Approving a proof goes through the ledger like every other payment:
                // receipt number, approving admin, bill marked paid, family notified,
                // and it refuses if the bill was already paid some other way.
                const receipt = await recordPayments({
                    invoiceIds: [payment.invoice_id], method: payment.payment_method || 'UPI',
                    transactionId: payment.transaction_id || null,
                    collectedBy: { id: req.session.user.id, name: req.session.user.name },
                    notes: notes || null, existingPaymentId: payment.id,
                });
                const updated = (await pool.query('SELECT * FROM invoice_payments WHERE id = $1', [id])).rows[0];
                return res.json({ ...updated, receipt_number: receipt.receiptNumber });
            }
            if (payment.status === 'approved') {
                return res.status(409).json({
                    message: 'This payment is already approved. To undo it, reverse its receipt instead.',
                });
            }
            const result = await pool.query(
                `UPDATE invoice_payments SET status = $1, notes = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
                [status, notes || null, id]
            );
            res.json(result.rows[0]);

            if (status === 'rejected' && payment.student_id) {
                (async () => {
                    try {
                        const c = await resolveFeeContact(payment.student_id);
                        if (c) {
                            createNotificationForUser(c.userId, 'Payment proof not accepted',
                                'Your payment proof could not be verified. Please contact the office or pay again.', 'Warning');
                        }
                    } catch (e) {
                        console.error('[InvoicePayment] Error notifying rejection:', e.message);
                    }
                })();
            }
        } catch (error) {
            sendLedgerError(res, error, 'Server error updating payment.');
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

            // Notify employee (fire-and-forget)
            if (user_id) {
                createNotificationForUser(
                    user_id,
                    'Salary Config Added',
                    'A salary configuration has been created for your account.',
                    'Info'
                );
            }
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

            // Notify employee (fire-and-forget)
            if (user_id) {
                createNotificationForUser(
                    user_id,
                    'Salary Config Updated',
                    'Your salary configuration has been updated.',
                    'Info'
                );
            }
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

            // Notify employee (fire-and-forget)
            if (user_id) {
                createNotificationForUser(
                    user_id,
                    'Salary Paid',
                    `Your salary payment of INR ${amount} has been recorded.`,
                    'Success'
                );
            }
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

            // Notify employee (fire-and-forget)
            const updated = result.rows[0];
            if (updated.user_id) {
                createNotificationForUser(
                    updated.user_id,
                    'Salary Payment Updated',
                    `Your salary payment record has been updated. Status: ${updated.status || status || 'updated'}.`,
                    'Info'
                );
            }
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

    // --- Serve the Flutter web app (mobile UI) at /app ---
    // Same codebase as the Android app, compiled for the web so iOS (and any)
    // browsers get the identical mobile UI. Served same-origin, so no CORS needed.
    // Must be registered BEFORE the React catch-all below.
    const appWebPath = path.join(__dirname, '..', 'app_web');
    if (fs.existsSync(appWebPath)) {
        // no-cache: assets must be revalidated every load (via ETag), so a new
        // deploy is picked up immediately instead of Safari/other browsers serving
        // a stale main.dart.js. Cheap (304 when unchanged); no service worker here.
        const noCache = (res) => res.setHeader('Cache-Control', 'no-cache');
        app.use('/app', express.static(appWebPath, { setHeaders: noCache }));
        // Flutter web uses client-side routing; send its index.html for /app/* deep links.
        app.get('/app/*', (req, res) => {
            noCache(res);
            res.sendFile(path.join(appWebPath, 'index.html'));
        });
        app.get('/app', (req, res) => {
            noCache(res);
            res.sendFile(path.join(appWebPath, 'index.html'));
        });
    }

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

        // Daily fee reminders. No external scheduler/cron dependency: run shortly
        // after startup, then every 6 hours. The per-invoice last_reminder_date
        // guard keeps it to at most one reminder per invoice per day regardless of
        // how often this fires (restarts, the 6-hour cadence, manual triggers).
        const SIX_HOURS = 6 * 60 * 60 * 1000;
        const safeRun = async () => {
            // Generate this month's invoices first (idempotent), then chase unpaid ones.
            await generateMonthlyInvoices().catch(e => console.error('[MonthlyInvoices] run failed:', e.message));
            await runFeeReminders().catch(e => console.error('[FeeReminders] run failed:', e.message));
        };
        setTimeout(safeRun, 60 * 1000); // 1 min after startup
        setInterval(safeRun, SIX_HOURS);
    });
}

// Start the server
startServer().catch(err => {
    console.error("FATAL: Failed to start server:", err);
    process.exit(1);
});
