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
                console.log('📧 Email in test mode - would send registration emails to:', userEmail);
                return res.status(200).json({
                    success: true,
                    message: 'Registration emails sent successfully (test mode)'
                });
            }

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
            } catch (emailError) {
                console.error('Error sending welcome email:', emailError);
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
            } catch (emailError) {
                console.error('Error sending admin notification email:', emailError);
            }

            res.status(200).json({
                success: true,
                message: 'Registration emails sent successfully'
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
    // Get all non-deleted users
    app.get('/api/users', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM users WHERE is_deleted = false ORDER BY created_at DESC');
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ message: 'Server error fetching users.' });
        }
    });

    // Get user by ID
    app.get('/api/users/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({ message: 'Server error fetching user.' });
        }
    });

    // Get user by email
    app.post('/api/users/by-email', async (req, res) => {
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
    app.put('/api/users/:id', async (req, res) => {
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
    app.delete('/api/users/:id', async (req, res) => {
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
    app.get('/api/users/trashed/all', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM users WHERE is_deleted = true ORDER BY updated_at DESC');
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching trashed users:', error);
            res.status(500).json({ message: 'Server error fetching trashed users.' });
        }
    });

    // Restore user
    app.post('/api/users/:id/restore', async (req, res) => {
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
    app.delete('/api/users/:id/permanent', async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json({ message: 'User permanently deleted' });
        } catch (error) {
            console.error('Error permanently deleting user:', error);
            res.status(500).json({ message: 'Server error permanently deleting user.' });
        }
    });

    // Get admin stats
    app.get('/api/stats/admin', async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT role, class_preference FROM users WHERE is_deleted = false'
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching admin stats:', error);
            res.status(500).json({ message: 'Server error fetching stats.' });
        }
    });

    // Get users by IDs
    app.post('/api/users/by-ids', async (req, res) => {
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
    app.get('/api/batches', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM batches ORDER BY created_at DESC');
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching batches:', error);
            res.status(500).json({ message: 'Server error fetching batches.' });
        }
    });

    app.post('/api/batches', async (req, res) => {
        try {
            const batchData = req.body;
            const { batch_name, course_id, teacher_id, schedule, start_date, end_date, max_students, student_ids, mode } = batchData;

            const result = await pool.query(
                `INSERT INTO batches (batch_name, course_id, teacher_id, schedule, start_date, end_date, max_students, student_ids, mode)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                [batch_name, course_id, teacher_id, JSON.stringify(schedule), start_date, end_date, max_students, student_ids || [], mode]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating batch:', error);
            res.status(500).json({ message: 'Server error creating batch.' });
        }
    });

    app.put('/api/batches/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { batch_name, course_id, teacher_id, schedule, start_date, end_date, max_students, student_ids, mode } = req.body;

            const result = await pool.query(
                `UPDATE batches SET
                    batch_name = $1, course_id = $2, teacher_id = $3, schedule = $4,
                    start_date = $5, end_date = $6, max_students = $7, student_ids = $8, mode = $9,
                    updated_at = NOW()
                 WHERE id = $10 RETURNING *`,
                [batch_name, course_id, teacher_id, JSON.stringify(schedule), start_date, end_date, max_students, student_ids || [], mode, id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Batch not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating batch:', error);
            res.status(500).json({ message: 'Server error updating batch.' });
        }
    });

    app.delete('/api/batches/:id', async (req, res) => {
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

    // --- Course Management API Endpoints ---
    app.post('/api/courses', async (req, res) => {
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

    app.put('/api/courses/:id', async (req, res) => {
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

    app.delete('/api/courses/:id', async (req, res) => {
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
                'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
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
                'UPDATE notifications SET read = true WHERE id = $1 RETURNING *',
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

    app.post('/api/notifications', async (req, res) => {
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

    app.post('/api/fee-structures', async (req, res) => {
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

    app.put('/api/fee-structures/:id', async (req, res) => {
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

    app.delete('/api/fee-structures/:id', async (req, res) => {
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

    app.put('/api/demo-bookings/:id', async (req, res) => {
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

    app.delete('/api/demo-bookings/:id', async (req, res) => {
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

    app.post('/api/events', async (req, res) => {
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

    app.put('/api/events/:id', async (req, res) => {
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

    app.delete('/api/events/:id', async (req, res) => {
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

    app.post('/api/grade-exams', async (req, res) => {
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

    app.put('/api/grade-exams/:id', async (req, res) => {
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

    app.delete('/api/grade-exams/:id', async (req, res) => {
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

    app.post('/api/book-materials', async (req, res) => {
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

    app.put('/api/book-materials/:id', async (req, res) => {
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

    app.delete('/api/book-materials/:id', async (req, res) => {
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

    app.post('/api/notices', async (req, res) => {
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

    app.put('/api/notices/:id', async (req, res) => {
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

    app.delete('/api/notices/:id', async (req, res) => {
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
    app.post('/api/locations', async (req, res) => {
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

    app.put('/api/locations/:id', async (req, res) => {
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

    app.delete('/api/locations/:id', async (req, res) => {
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

    app.post('/api/invoices', async (req, res) => {
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

    app.put('/api/invoices/:id', async (req, res) => {
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

    // --- Serve Static Files (React Frontend) ---
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));

    // Catch-all handler: send back React's index.html file for any non-API routes
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
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