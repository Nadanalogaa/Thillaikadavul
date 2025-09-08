
const express = require('express');
const mongoose = require('mongoose');
const cors =require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;

// --- Mongoose Schemas and Models (defined outside to be accessible everywhere) ---
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['Student', 'Teacher', 'Admin'] },
    classPreference: { type: String, enum: ['Online', 'Offline', 'Hybrid'] },
    
    // Common fields
    photoUrl: { type: String }, // Can store base64 data URL
    dob: { type: String },
    sex: { type: String, enum: ['Male', 'Female', 'Other'] },
    contactNumber: { type: String },
    address: { type: String },
    schedules: { type: [{ course: String, timing: String, teacherId: String, _id: false }] },
    documents: { type: [{ name: String, mimeType: String, data: String, _id: false }] },
    dateOfJoining: { type: String },

    // Student specific
    courses: { type: [String] },
    fatherName: { type: String },
    standard: { type: String },
    schoolName: { type: String },
    grade: { type: String, enum: ['Grade 1', 'Grade 2', 'Grade 3'] },
    notes: { type: String },
    
    // Teacher specific
    courseExpertise: { type: [String] },
    educationalQualifications: { type: String },
    employmentType: { type: String, enum: ['Part-time', 'Full-time'] }
});


userSchema.virtual('id').get(function(){ return this._id.toHexString(); });
userSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const User = mongoose.model('User', userSchema);

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', contactSchema);

const courseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true } // Name of the icon, e.g., 'Bharatanatyam'
});
courseSchema.virtual('id').get(function(){ return this._id.toHexString(); });
courseSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const Course = mongoose.model('Course', courseSchema);

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
notificationSchema.virtual('id').get(function(){ return this._id.toHexString(); });
notificationSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const Notification = mongoose.model('Notification', notificationSchema);

const batchScheduleSchema = new mongoose.Schema({
    timing: { type: String, required: true },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const batchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    courseName: { type: String, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    schedule: [batchScheduleSchema],
});
batchSchema.virtual('id').get(function(){ return this._id.toHexString(); });
batchSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const Batch = mongoose.model('Batch', batchSchema);


// --- Main application startup ---
async function startServer() {
    console.log(`[Server] Node environment (NODE_ENV): ${process.env.NODE_ENV || 'not set (defaults to development)'}`);

    // --- Database Seeding Function ---
    const seedCourses = async () => {
        try {
            const courseCount = await Course.countDocuments();
            if (courseCount === 0) {
                console.log('[DB] No courses found. Seeding initial courses...');
                const initialCourses = [
                    { name: 'Bharatanatyam', description: 'Explore the grace and storytelling of classical Indian dance.', icon: 'Bharatanatyam' },
                    { name: 'Vocal', description: 'Develop your singing voice with professional training techniques.', icon: 'Vocal' },
                    { name: 'Drawing', description: 'Learn to express your creativity through sketching and painting.', icon: 'Drawing' },
                    { name: 'Abacus', description: 'Enhance mental math skills and concentration with our abacus program.', icon: 'Abacus' }
                ];
                await Course.insertMany(initialCourses);
                console.log('[DB] Courses seeded successfully.');
            }
        } catch (error) {
            console.error('[DB] Error seeding courses:', error);
        }
    };

    // --- MongoDB Connection ---
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('[DB] MongoDB connected successfully.');
        await seedCourses();
    } catch (err) {
        console.error('[DB] MongoDB connection error:', err);
        process.exit(1);
    }
    
    // --- Email Template ---
    const createEmailTemplate = (name, subject, message) => {
        const year = new Date().getFullYear();
        // A publicly hosted logo URL is used here. You can replace this with your own.
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
                        <!-- Header -->
                        <tr>
                            <td align="center" style="padding:25px 0;border-bottom: 1px solid #eeeeee;">
                                <img src="${logoUrl}" alt="Nadanaloga Logo" width="250" style="height:auto;display:block;" />
                            </td>
                        </tr>
                        <!-- Content -->
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
                        <!-- Footer -->
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

    // --- Universal SMTP Configuration ---
    const createUniversalSMTPConfig = (host, user, pass, port) => {
        const smtpPort = parseInt(port || '587', 10);
        const isSecure = smtpPort === 465;
        
        return {
            host: host,
            port: smtpPort,
            secure: isSecure, // true for 465 (SSL), false for 587/25 (TLS)
            auth: { user: user, pass: pass },
            // Universal compatibility options
            tls: {
                rejectUnauthorized: false, // Accept self-signed certificates (for VPS)
                ciphers: 'SSLv3' // Compatibility with older servers
            },
            connectionTimeout: 60000, // 60 seconds timeout
            greetingTimeout: 30000,    // 30 seconds greeting timeout  
            socketTimeout: 60000,      // 60 seconds socket timeout
            // Connection pooling for better performance
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            rateDelta: 1000,           // 1 second between emails
            rateLimit: 5               // Max 5 emails per rateDelta
        };
    };

    // Email provider configurations for auto-detection
    const getProviderConfig = (email) => {
        const domain = email.split('@')[1]?.toLowerCase();
        
        const providers = {
            'gmail.com': { host: 'smtp.gmail.com', port: 587, name: 'Gmail' },
            'outlook.com': { host: 'smtp-mail.outlook.com', port: 587, name: 'Outlook' },
            'hotmail.com': { host: 'smtp-mail.outlook.com', port: 587, name: 'Hotmail' },
            'yahoo.com': { host: 'smtp.mail.yahoo.com', port: 587, name: 'Yahoo' },
            'icloud.com': { host: 'smtp.mail.me.com', port: 587, name: 'iCloud' },
            // Business email providers
            'zoho.com': { host: 'smtp.zoho.com', port: 587, name: 'Zoho' },
            // Custom domain support  
            'default': { host: process.env.SMTP_HOST, port: process.env.SMTP_PORT || 587, name: 'Custom' }
        };
        
        return providers[domain] || providers['default'];
    };

    let mailTransporter;
    let isEtherealMode = false;
    let emailProvider = 'Unknown';

    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            // Test mode with Ethereal
            isEtherealMode = true;
            console.log('\n--- ❗ EMAIL IS IN TEST MODE ❗ ---');
            console.log('[Email] Missing SMTP credentials. Using test mode.');
            console.log('[Email] Set SMTP_USER and SMTP_PASS for production emails.');
            console.log('-------------------------------------\n');

            const testAccount = await nodemailer.createTestAccount();
            mailTransporter = nodemailer.createTransporter({
                ...createUniversalSMTPConfig(
                    testAccount.smtp.host, 
                    testAccount.user, 
                    testAccount.pass, 
                    testAccount.smtp.port
                ),
                secure: testAccount.smtp.secure
            });
            emailProvider = 'Ethereal (Test)';
        } else {
            // Production mode with auto-detection
            console.log('\n--- 📧 UNIVERSAL SMTP CONFIGURATION ---');
            
            const detectedProvider = getProviderConfig(process.env.SMTP_USER);
            emailProvider = detectedProvider.name;
            
            const smtpHost = process.env.SMTP_HOST || detectedProvider.host;
            const smtpPort = process.env.SMTP_PORT || detectedProvider.port;
            
            console.log(`[Email] Provider: ${emailProvider}`);
            console.log(`[Email] Host: ${smtpHost}:${smtpPort}`);
            console.log(`[Email] User: ${process.env.SMTP_USER}`);
            console.log(`[Email] Testing connection...`);

            const smtpConfig = createUniversalSMTPConfig(
                smtpHost,
                process.env.SMTP_USER, 
                process.env.SMTP_PASS,
                smtpPort
            );

            mailTransporter = nodemailer.createTransporter(smtpConfig);

            // Test connection with retry logic
            let connectionAttempts = 0;
            const maxAttempts = 3;
            
            while (connectionAttempts < maxAttempts) {
                try {
                    await mailTransporter.verify();
                    console.log(`[Email] ✅ Connection verified with ${emailProvider}`);
                    console.log(`[Email] Server ready to send emails from ${process.env.SMTP_USER}`);
                    console.log('--------------------------------------------\n');
                    break;
                } catch (retryError) {
                    connectionAttempts++;
                    console.log(`[Email] ⚠️ Connection attempt ${connectionAttempts}/${maxAttempts} failed: ${retryError.message}`);
                    
                    if (connectionAttempts >= maxAttempts) {
                        throw retryError;
                    }
                    
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
    } catch (error) {
        console.error('\n--- 🚨 EMAIL CONFIGURATION FAILED ---');
        console.error(`[Email] Provider: ${emailProvider}`);
        console.error(`[Email] Error: ${error.message}`);
        
        // Provide helpful error messages
        if (error.code === 'EAUTH') {
            console.error('[Email] ❌ Authentication failed. Check email and app-password.');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            console.error('[Email] ❌ Connection failed. Check internet and SMTP host.');
        } else if (error.code === 'ESOCKET') {
            console.error('[Email] ❌ Socket error. Server may block SMTP ports.');
        }
        
        console.error('[Email] 💡 Troubleshooting:');
        console.error('[Email]    • Gmail: Use app-password, not regular password'); 
        console.error('[Email]    • VPS: Ensure ports 587/465 are open');
        console.error('[Email]    • Firewall: Allow outbound SMTP connections');
        console.error('[Email] Server continues, but emails will fail.');
        console.error('-----------------------------------------------\n');
        
        mailTransporter = null;
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
      'https://thillaikadavul.vercel.app',
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
        store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
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

    // --- API Routes ---
    app.post('/api/register', async (req, res) => {
        try {
            const { password, ...userData } = req.body;
            if (!userData.email) return res.status(400).json({ message: 'Email is required.' });
            const normalizedEmail = userData.email.toLowerCase();
            const existingUser = await User.findOne({ email: normalizedEmail });
            if (existingUser) return res.status(409).json({ message: 'This email is already registered. Please try logging in.' });
            if (normalizedEmail === 'admin@nadanaloga.com') userData.role = 'Admin';
            if (!password) return res.status(400).json({ message: 'Password is required.' });
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = new User({ ...userData, email: normalizedEmail, password: hashedPassword });
            await user.save();
            res.status(201).json({ message: 'Registration successful' });
        } catch (error) {
            if (error.code === 11000) return res.status(409).json({ message: 'This email is already registered. Please try logging in.' });
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Server error during registration.' });
        }
    });

    app.post('/api/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            const userDoc = await User.findOne({ email: email.toLowerCase() });
            if (!userDoc) return res.status(401).json({ message: 'Invalid email or password.' });
            const isMatch = await bcrypt.compare(password, userDoc.password);
            if (!isMatch) return res.status(401).json({ message: 'Invalid email or password.' });
            const user = userDoc.toJSON();
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
            await new Contact({ name, email, message }).save();
            res.status(200).json({ success: true });
        } catch (error) {
            res.status(500).json({ message: 'Failed to submit message.' });
        }
    });

    app.get('/api/courses', async (req, res) => {
        try {
            const courses = await Course.find();
            res.json(courses);
        } catch (error) {
            res.status(500).json({ message: 'Server error fetching courses.' });
        }
    });

    app.put('/api/profile', ensureAuthenticated, async (req, res) => {
        try {
            const userId = req.session.user.id;
            const { password, role, email, ...updateData } = req.body;
            const updatedUserDoc = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
            if (!updatedUserDoc) return res.status(404).json({ message: 'User not found.' });
            const updatedUser = updatedUserDoc.toJSON();
            delete updatedUser.password;
            req.session.user = updatedUser;
            res.json(updatedUser);
        } catch (error) {
            console.error('Profile update error:', error);
            res.status(500).json({ message: 'Server error updating profile.' });
        }
    });

    // --- Admin Routes ---
    app.get('/api/admin/stats', ensureAdmin, async(req, res) => {
        try {
            const studentCount = await User.countDocuments({ role: 'Student' });
            const teacherCount = await User.countDocuments({ role: 'Teacher' });
            const onlinePreference = await User.countDocuments({ role: { $ne: 'Admin' }, classPreference: 'Online' });
            const offlinePreference = await User.countDocuments({ role: { $ne: 'Admin' }, classPreference: 'Offline' });
            res.json({ totalUsers: studentCount + teacherCount, studentCount, teacherCount, onlinePreference, offlinePreference });
        } catch(error) {
            res.status(500).json({ message: 'Server error fetching stats.'});
        }
    });

    app.get('/api/admin/users', ensureAdmin, async (req, res) => {
        try {
            const users = await User.find({ role: { $ne: 'Admin' } }).select('-password');
            res.json(users);
        } catch (error) {
            res.status(500).json({ message: 'Server error fetching users.' });
        }
    });

    app.post('/api/admin/users', ensureAdmin, async (req, res) => {
        try {
            const { password, ...userData } = req.body;
            if (!userData.email) return res.status(400).json({ message: 'Email is required.' });
            const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
            if (existingUser) return res.status(409).json({ message: 'This email is already in use.' });
            const effectivePassword = password || 'password123';
            const hashedPassword = await bcrypt.hash(effectivePassword, 10);
            const user = new User({ ...userData, password: hashedPassword });
            await user.save();
            const newUserDoc = await User.findById(user._id).select('-password');
            res.status(201).json(newUserDoc.toJSON());
        } catch (error) {
             if (error.code === 11000) return res.status(409).json({ message: 'This email is already in use.' });
            console.error('Admin create user error:', error);
            res.status(500).json({ message: 'Server error during user creation.' });
        }
    });

    app.put('/api/admin/users/:id', ensureAdmin, async (req, res) => {
        try {
            const { password, ...updateData } = req.body;
            if (updateData.email) {
                const existingUser = await User.findOne({ email: updateData.email.toLowerCase(), _id: { $ne: req.params.id } });
                if (existingUser) return res.status(409).json({ message: 'This email is already in use by another account.' });
            }
            const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).select('-password');
            if (!user) return res.status(404).json({ message: 'User not found.' });
            res.json(user);
        } catch (error) {
            if (error.code === 11000) return res.status(409).json({ message: 'This email is already in use by another account.' });
            res.status(500).json({ message: 'Server error updating user.' });
        }
    });

    app.delete('/api/admin/users/:id', ensureAdmin, async (req, res) => {
        try {
            const user = await User.findByIdAndDelete(req.params.id);
            if (!user) return res.status(404).json({ message: 'User not found.' });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: 'Server error deleting user.' });
        }
    });

    app.post('/api/admin/notifications', ensureAdmin, async (req, res) => {
        const { userIds, subject, message } = req.body;
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ message: 'User IDs are required.' });
        if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required.' });
        try {
            const users = await User.find({ '_id': { $in: userIds } }).select('email name');
            if (users.length === 0) return res.status(404).json({ message: 'No valid recipient users found.' });
            const notificationsToSave = users.map(user => ({ userId: user._id, subject, message }));
            await Notification.insertMany(notificationsToSave);
            if (mailTransporter) {
                for (const user of users) {
                    const mailDetails = {
                        from: process.env.SMTP_FROM_EMAIL || '"Nadanaloga Admin" <no-reply@nadanaloga.com>',
                        to: user.email,
                        subject: subject,
                        html: createEmailTemplate(user.name, subject, message),
                    };
                    mailTransporter.sendMail(mailDetails, (err, info) => {
                        if (err) {
                            console.error(`[Email] Error sending to ${user.email}:`, err);
                        } else {
                            if (isEtherealMode) {
                                console.log(`[Email] ❗ TEST MODE: Email for ${user.email} was INTERCEPTED. View it here: ${nodemailer.getTestMessageUrl(info)}`);
                            } else {
                                console.log(`[Email] Notification sent to ${user.email}. Message ID: ${info.messageId}`);
                            }
                        }
                    });
                }
            } else {
                console.warn('[Email] Notification stored in DB, but email not sent because mail transporter is not configured.');
            }
            res.status(200).json({ success: true, message: 'Notification sent and stored successfully.' });
        } catch (error) {
            console.error('Notification error:', error);
            res.status(500).json({ message: 'Server error sending notification.' });
        }
    });

    app.get('/api/admin/courses', ensureAdmin, async (req, res) => {
        try {
            const courses = await Course.find();
            res.json(courses);
        } catch (error) {
            res.status(500).json({ message: 'Server error fetching courses.' });
        }
    });

    app.post('/api/admin/courses', ensureAdmin, async (req, res) => {
        try {
            const { name, description, icon } = req.body;
            const newCourse = new Course({ name, description, icon });
            await newCourse.save();
            res.status(201).json(newCourse);
        } catch (error) {
            res.status(500).json({ message: 'Server error creating course.' });
        }
    });

    app.put('/api/admin/courses/:id', ensureAdmin, async (req, res) => {
        try {
            const { name, description, icon } = req.body;
            const updatedCourse = await Course.findByIdAndUpdate(req.params.id, { name, description, icon }, { new: true, runValidators: true });
            if (!updatedCourse) return res.status(404).json({ message: 'Course not found.' });
            res.json(updatedCourse);
        } catch (error) {
            res.status(500).json({ message: 'Server error updating course.' });
        }
    });

    app.delete('/api/admin/courses/:id', ensureAdmin, async (req, res) => {
        try {
            const course = await Course.findByIdAndDelete(req.params.id);
            if (!course) return res.status(404).json({ message: 'Course not found.' });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: 'Server error deleting course.' });
        }
    });
    
    // --- Batch Routes ---
    app.get('/api/admin/batches', ensureAdmin, async (req, res) => {
        try {
            const batches = await Batch.find();
            res.json(batches);
        } catch (error) {
            res.status(500).json({ message: 'Server error fetching batches.' });
        }
    });

    app.post('/api/admin/batches', ensureAdmin, async (req, res) => {
        try {
            const newBatch = new Batch(req.body);
            await newBatch.save();
            res.status(201).json(newBatch);
        } catch (error) {
            console.error('Batch creation error:', error);
            res.status(500).json({ message: 'Server error creating batch.' });
        }
    });
    
    app.put('/api/admin/batches/:id', ensureAdmin, async (req, res) => {
        try {
            const updatedBatch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
            if (!updatedBatch) return res.status(404).json({ message: 'Batch not found.' });
            res.json(updatedBatch);
        } catch (error) {
            res.status(500).json({ message: 'Server error updating batch.' });
        }
    });

    app.delete('/api/admin/batches/:id', ensureAdmin, async (req, res) => {
        try {
            const batch = await Batch.findByIdAndDelete(req.params.id);
            if (!batch) return res.status(404).json({ message: 'Batch not found.' });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: 'Server error deleting batch.' });
        }
    });

    // --- Email API Route for Frontend ---
    app.post('/api/send-email', async (req, res) => {
        try {
            const { to, name, subject, message } = req.body;
            
            if (!to || !subject || !message) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Missing required fields: to, subject, message' 
                });
            }

            if (!mailTransporter) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'Mail transporter not configured' 
                });
            }

            const mailDetails = {
                from: process.env.SMTP_FROM_EMAIL || '"Nadanaloga Team" <nadanalogaa@gmail.com>',
                to: to,
                subject: subject,
                html: createEmailTemplate(name || 'User', subject, message),
            };

            const info = await mailTransporter.sendMail(mailDetails);
            
            if (isEtherealMode) {
                console.log(`[Email] ❗ TEST MODE: Email for ${to} was INTERCEPTED. View it here: ${nodemailer.getTestMessageUrl(info)}`);
                return res.json({ 
                    success: true, 
                    messageId: info.messageId,
                    previewUrl: nodemailer.getTestMessageUrl(info),
                    mode: 'test'
                });
            } else {
                console.log(`[Email] Email sent successfully to ${to}. Message ID: ${info.messageId}`);
                return res.json({ 
                    success: true, 
                    messageId: info.messageId,
                    mode: 'live'
                });
            }
        } catch (error) {
            console.error('[Email] Error sending email:', error);
            return res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    // --- User Notification Routes ---
    app.get('/api/notifications', ensureAuthenticated, async (req, res) => {
        try {
            const notifications = await Notification.find({ userId: req.session.user.id }).sort({ createdAt: -1 });
            res.json(notifications);
        } catch (error) {
            res.status(500).json({ message: 'Server error fetching notifications.' });
        }
    });

    app.put('/api/notifications/:id/read', ensureAuthenticated, async (req, res) => {
        try {
            const notification = await Notification.findOneAndUpdate(
                { _id: req.params.id, userId: req.session.user.id },
                { read: true },
                { new: true }
            );
            if (!notification) return res.status(404).json({ message: 'Notification not found or access denied.' });
            res.json(notification);
        } catch (error) {
            res.status(500).json({ message: 'Server error updating notification.' });
        }
    });

    // Health check endpoint for Railway deployment
    app.get('/api/health', (req, res) => {
        res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // --- Start Server ---
    app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[Server] CORS is configured to allow requests from: ${whitelist.join(', ')}`);
    });
}

// Start the server by calling the async function
startServer().catch(err => {
    console.error("FATAL: Failed to start server:", err);
    process.exit(1);
});