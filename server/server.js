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