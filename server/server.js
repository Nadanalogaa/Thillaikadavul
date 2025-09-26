const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

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
    try {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            isEtherealMode = true;
            console.log('\\n--- ❗ EMAIL IS IN TEST MODE ❗ ---');
            console.log('[Email] WARNING: SMTP environment variables are missing');
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
            console.log('\\n--- 📧 EMAIL CONFIGURATION ---');
            console.log(`[Email] Live SMTP config found. Connecting to ${process.env.SMTP_HOST}...`);
            mailTransporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587', 10),
                secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });

            await mailTransporter.verify();
            console.log('[Email] ✅ SMTP connection verified.');
            console.log('-----------------------------\\n');
        }
    } catch (error) {
        console.error('\\n--- 🚨 EMAIL CONFIGURATION FAILED ---');
        console.error('[Email] Could not connect to SMTP server.');
        console.error(`[Email] Error: ${error.message}`);
        console.error('--------------------------------------\\n');
    }

    const app = express();
    
    // --- Middleware ---
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
            tableName: 'session'
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
        if (req.session.user.role === 'Admin') {
            return next();
        }
        res.status(403).json({ message: 'Forbidden: Administrative privileges required.' });
    };

    // Health check endpoint
    app.get('/api/health', (req, res) => {
        res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
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
            
            if (normalizedEmail === 'admin@nadanaloga.com') userData.role = 'Admin';
            if (!password) return res.status(400).json({ message: 'Password is required.' });
            
            const hashedPassword = await bcrypt.hash(password, 10);
            
            await pool.query(
                'INSERT INTO users (name, email, password, role, class_preference, photo_url, dob, sex, contact_number, address, date_of_joining, courses, father_name, standard, school_name, grade, notes, course_expertise, educational_qualifications, employment_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)',
                [
                    userData.name, normalizedEmail, hashedPassword, userData.role || 'Student',
                    userData.classPreference, userData.photoUrl, userData.dob, userData.sex,
                    userData.contactNumber, userData.address, userData.dateOfJoining,
                    JSON.stringify(userData.courses || []), userData.fatherName, userData.standard,
                    userData.schoolName, userData.grade, userData.notes,
                    JSON.stringify(userData.courseExpertise || []), userData.educationalQualifications,
                    userData.employmentType
                ]
            );
            
            res.status(201).json({ message: 'Registration successful' });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Server error during registration.' });
        }
    });

    app.post('/api/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
            
            if (result.rows.length === 0) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }
            
            const user = result.rows[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ message: 'Invalid email or password.' });
            
            delete user.password;
            req.session.user = user;
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: 'Server error during login.' });
        }
    });

    app.get('/api/session', (req, res) => {
        if (req.session.user) res.json(req.session.user);
        else res.status(401).json(null);
    });

    app.post('/api/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) return res.status(500).json({ message: 'Could not log out.' });
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

    // --- Start Server ---
    app.listen(PORT, () => {
        console.log(`[Server] Running on http://localhost:${PORT}`);
        console.log(`[Server] CORS is configured to allow requests from: ${whitelist.join(', ')}`);
    });
}

// Start the server
startServer().catch(err => {
    console.error("FATAL: Failed to start server:", err);
    process.exit(1);
});