
const express = require('express');
const mongoose = require('mongoose');
const cors =require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// CMS Models for Homepage Content Management
const mediaSchema = new mongoose.Schema({
    type: { type: String, required: true, enum: ['image', 'video', 'youtube'] },
    url: { type: String, required: true },
    altText: { type: String },
    caption: { type: String },
    fileName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    youtubeId: { type: String }
}, { _id: false });

const seoSchema = new mongoose.Schema({
    title: { type: String },
    description: { type: String },
    keywords: [{ type: String }],
    ogImage: { type: String },
    ogTitle: { type: String },
    ogDescription: { type: String }
}, { _id: false });

const contentBlockSchema = new mongoose.Schema({
    sectionId: { type: String, required: true, unique: true },
    sectionType: { type: String, required: true, enum: [
        'header', 'cta', 'hero', 'about', 'statistics', 'programs-marquee', 
        'programs', 'services', 'approach', 'gallery', 'awards', 
        'testimonials', 'partners', 'blog', 'final-cta', 'footer'
    ]},
    title: { type: String },
    subtitle: { type: String },
    description: { type: String },
    content: { type: mongoose.Schema.Types.Mixed }, // Flexible content structure
    media: [mediaSchema],
    links: [{
        label: { type: String },
        url: { type: String },
        type: { type: String, enum: ['internal', 'external', 'phone', 'email'] },
        target: { type: String, enum: ['_self', '_blank', '_parent'], default: '_self' }
    }],
    settings: {
        visible: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
        className: { type: String },
        customStyles: { type: String }
    },
    seo: seoSchema,
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    version: { type: Number, default: 1 },
    publishedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

contentBlockSchema.virtual('id').get(function(){ return this._id.toHexString(); });
contentBlockSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const ContentBlock = mongoose.model('ContentBlock', contentBlockSchema);

const siteSettingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    type: { type: String, enum: ['text', 'number', 'boolean', 'json', 'media'], default: 'text' },
    description: { type: String },
    category: { type: String },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

siteSettingsSchema.virtual('id').get(function(){ return this._id.toHexString(); });
siteSettingsSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

const templateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    sectionType: { type: String, required: true },
    template: { type: mongoose.Schema.Types.Mixed, required: true },
    thumbnail: { type: String },
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

templateSchema.virtual('id').get(function(){ return this._id.toHexString(); });
templateSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; } });
const Template = mongoose.model('Template', templateSchema);

// Multer configuration for media uploads
const createUploadDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Create uploads directory if it doesn't exist
createUploadDir('./uploads');
createUploadDir('./uploads/images');
createUploadDir('./uploads/videos');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = file.mimetype.startsWith('image/') ? './uploads/images' : './uploads/videos';
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image and video files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: fileFilter
});

// --- Main application startup ---
async function startServer() {
    console.log(`[Server] Node environment (NODE_ENV): ${process.env.NODE_ENV || 'not set (defaults to development)'}`);

    // --- Database Seeding Functions ---
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

    const seedCMSContent = async () => {
        try {
            const contentCount = await ContentBlock.countDocuments();
            if (contentCount === 0) {
                console.log('[DB] No CMS content found. Seeding initial homepage content...');
                
                const initialContentBlocks = [
                    {
                        sectionId: 'header-main',
                        sectionType: 'header',
                        title: 'Nadanaloga Academy',
                        links: [
                            { label: 'Home', url: '/', type: 'internal', target: '_parent' },
                            { label: 'About Us', url: '/about', type: 'internal', target: '_parent' },
                            { label: 'Gallery', url: '/gallery', type: 'internal', target: '_parent' },
                            { label: 'FAQ', url: '/faq', type: 'internal', target: '_parent' },
                            { label: 'Contact', url: '/contact', type: 'internal', target: '_parent' }
                        ],
                        settings: { visible: true, order: 0 },
                        status: 'published',
                        publishedAt: new Date()
                    },
                    {
                        sectionId: 'hero-main',
                        sectionType: 'hero',
                        title: 'Dance, Music and Fine Arts',
                        description: 'Discover the rich heritage of Indian classical arts through expert guidance, personalized attention, and a supportive learning environment that nurtures both technique and creativity.',
                        content: {
                            marqueeItems: ['Bharatanatyam', 'Vocal', 'Drawing', 'Abacus', 'Culture', 'Performance']
                        },
                        media: [
                            { type: 'image', url: '/images/Barathanatyam.png', altText: 'Bharatanatyam' },
                            { type: 'image', url: '/images/vocal.png', altText: 'Vocal Music' },
                            { type: 'image', url: '/images/drawing.png', altText: 'Drawing & Painting' }
                        ],
                        links: [
                            { label: 'View Programs', url: '/gallery', type: 'internal', target: '_parent' }
                        ],
                        settings: { visible: true, order: 3 },
                        seo: {
                            title: 'Learn Bharatanatyam, Vocal, Drawing & Abacus - Nadanaloga Academy',
                            description: 'Premier fine arts academy offering Bharatanatyam dance, vocal music, drawing, and abacus classes.',
                            keywords: ['bharatanatyam classes', 'vocal music training', 'drawing classes', 'abacus classes']
                        },
                        status: 'published',
                        publishedAt: new Date()
                    }
                ];

                await ContentBlock.insertMany(initialContentBlocks);
                console.log('[DB] CMS content seeded successfully.');
            }
        } catch (error) {
            console.error('[DB] Error seeding CMS content:', error);
        }
    };

    const seedSiteSettings = async () => {
        try {
            const settingsCount = await SiteSettings.countDocuments();
            if (settingsCount === 0) {
                console.log('[DB] No site settings found. Seeding initial settings...');
                
                const initialSettings = [
                    {
                        key: 'siteTitle',
                        value: 'Nadanaloga Fine Arts Academy — Bharatanatyam, Vocal, Drawing, Abacus',
                        type: 'text',
                        description: 'Main site title for SEO',
                        category: 'SEO'
                    },
                    {
                        key: 'siteDescription',
                        value: 'Nadanaloga Fine Arts Academy nurtures creativity and culture through Bharatanatyam, Vocal music, Drawing and Abacus training.',
                        type: 'text',
                        description: 'Main site description for SEO',
                        category: 'SEO'
                    }
                ];

                await SiteSettings.insertMany(initialSettings);
                console.log('[DB] Site settings seeded successfully.');
            }
        } catch (error) {
            console.error('[DB] Error seeding site settings:', error);
        }
    };

    // --- MongoDB Connection ---
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('[DB] MongoDB connected successfully.');
        await seedCourses();
        await seedCMSContent();
        await seedSiteSettings();
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
    
    // Serve uploaded files statically
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

    // CMS API Endpoints
    // Get all content blocks
    app.get('/api/cms/content', async (req, res) => {
        try {
            const { status, sectionType } = req.query;
            let query = {};
            
            if (status) query.status = status;
            if (sectionType) query.sectionType = sectionType;
            
            const contentBlocks = await ContentBlock.find(query)
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .sort({ 'settings.order': 1, createdAt: -1 });
            
            res.json(contentBlocks);
        } catch (error) {
            console.error('[CMS] Error fetching content blocks:', error);
            res.status(500).json({ error: 'Failed to fetch content blocks' });
        }
    });

    // Get single content block
    app.get('/api/cms/content/:id', async (req, res) => {
        try {
            const contentBlock = await ContentBlock.findById(req.params.id)
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email');
            
            if (!contentBlock) {
                return res.status(404).json({ error: 'Content block not found' });
            }
            
            res.json(contentBlock);
        } catch (error) {
            console.error('[CMS] Error fetching content block:', error);
            res.status(500).json({ error: 'Failed to fetch content block' });
        }
    });

    // Create content block
    app.post('/api/cms/content', ensureAdmin, async (req, res) => {
        try {
            const contentBlock = new ContentBlock({
                ...req.body,
                createdBy: req.session.user.id,
                updatedBy: req.session.user.id
            });
            
            await contentBlock.save();
            await contentBlock.populate('createdBy', 'name email');
            await contentBlock.populate('updatedBy', 'name email');
            
            res.status(201).json(contentBlock);
        } catch (error) {
            console.error('[CMS] Error creating content block:', error);
            if (error.code === 11000) {
                res.status(400).json({ error: 'Section ID already exists' });
            } else {
                res.status(500).json({ error: 'Failed to create content block' });
            }
        }
    });

    // Update content block
    app.put('/api/cms/content/:id', ensureAdmin, async (req, res) => {
        try {
            const contentBlock = await ContentBlock.findByIdAndUpdate(
                req.params.id,
                { 
                    ...req.body, 
                    updatedBy: req.session.user.id,
                    updatedAt: new Date()
                },
                { new: true, runValidators: true }
            )
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');
            
            if (!contentBlock) {
                return res.status(404).json({ error: 'Content block not found' });
            }
            
            res.json(contentBlock);
        } catch (error) {
            console.error('[CMS] Error updating content block:', error);
            res.status(500).json({ error: 'Failed to update content block' });
        }
    });

    // Delete content block
    app.delete('/api/cms/content/:id', ensureAdmin, async (req, res) => {
        try {
            const contentBlock = await ContentBlock.findByIdAndDelete(req.params.id);
            
            if (!contentBlock) {
                return res.status(404).json({ error: 'Content block not found' });
            }
            
            res.json({ message: 'Content block deleted successfully' });
        } catch (error) {
            console.error('[CMS] Error deleting content block:', error);
            res.status(500).json({ error: 'Failed to delete content block' });
        }
    });

    // Bulk update content blocks order
    app.put('/api/cms/content/reorder', ensureAdmin, async (req, res) => {
        try {
            const { updates } = req.body; // [{ id, order }]
            
            const bulkOps = updates.map(update => ({
                updateOne: {
                    filter: { _id: update.id },
                    update: { 
                        'settings.order': update.order,
                        updatedBy: req.session.user.id,
                        updatedAt: new Date()
                    }
                }
            }));
            
            await ContentBlock.bulkWrite(bulkOps);
            res.json({ message: 'Content blocks reordered successfully' });
        } catch (error) {
            console.error('[CMS] Error reordering content blocks:', error);
            res.status(500).json({ error: 'Failed to reorder content blocks' });
        }
    });

    // Publish/unpublish content block
    app.put('/api/cms/content/:id/publish', ensureAdmin, async (req, res) => {
        try {
            const { status } = req.body; // 'published' or 'draft'
            const updateData = {
                status,
                updatedBy: req.session.user.id,
                updatedAt: new Date()
            };
            
            if (status === 'published') {
                updateData.publishedAt = new Date();
            }
            
            const contentBlock = await ContentBlock.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true }
            );
            
            if (!contentBlock) {
                return res.status(404).json({ error: 'Content block not found' });
            }
            
            res.json(contentBlock);
        } catch (error) {
            console.error('[CMS] Error updating publish status:', error);
            res.status(500).json({ error: 'Failed to update publish status' });
        }
    });

    // Get site settings
    app.get('/api/cms/settings', async (req, res) => {
        try {
            const settings = await SiteSettings.find({})
                .populate('updatedBy', 'name email')
                .sort({ category: 1, key: 1 });
            
            res.json(settings);
        } catch (error) {
            console.error('[CMS] Error fetching site settings:', error);
            res.status(500).json({ error: 'Failed to fetch site settings' });
        }
    });

    // Update site settings
    app.put('/api/cms/settings/:key', ensureAdmin, async (req, res) => {
        try {
            const setting = await SiteSettings.findOneAndUpdate(
                { key: req.params.key },
                {
                    ...req.body,
                    updatedBy: req.session.user.id,
                    updatedAt: new Date()
                },
                { new: true, upsert: true, runValidators: true }
            ).populate('updatedBy', 'name email');
            
            res.json(setting);
        } catch (error) {
            console.error('[CMS] Error updating site setting:', error);
            res.status(500).json({ error: 'Failed to update site setting' });
        }
    });

    // Media upload endpoints
    app.post('/api/cms/media/upload', ensureAdmin, upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            
            const media = {
                type: req.file.mimetype.startsWith('image/') ? 'image' : 'video',
                url: `/uploads/${req.file.mimetype.startsWith('image/') ? 'images' : 'videos'}/${req.file.filename}`,
                altText: req.body.altText || '',
                fileName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                uploadedAt: new Date()
            };
            
            res.json(media);
        } catch (error) {
            console.error('[CMS] Error uploading media:', error);
            res.status(500).json({ error: 'Failed to upload media' });
        }
    });

    // Multiple media upload
    app.post('/api/cms/media/upload-multiple', ensureAdmin, upload.array('files', 10), async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: 'No files uploaded' });
            }
            
            const mediaFiles = req.files.map(file => ({
                type: file.mimetype.startsWith('image/') ? 'image' : 'video',
                url: `/uploads/${file.mimetype.startsWith('image/') ? 'images' : 'videos'}/${file.filename}`,
                altText: '',
                fileName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                uploadedAt: new Date()
            }));
            
            res.json({ files: mediaFiles });
        } catch (error) {
            console.error('[CMS] Error uploading media:', error);
            res.status(500).json({ error: 'Failed to upload media files' });
        }
    });

    // YouTube URL processing
    app.post('/api/cms/media/youtube', ensureAdmin, async (req, res) => {
        try {
            const { url, altText, caption } = req.body;
            
            // Extract YouTube video ID from URL
            const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const match = url.match(youtubeRegex);
            
            if (!match) {
                return res.status(400).json({ error: 'Invalid YouTube URL' });
            }
            
            const youtubeId = match[1];
            const media = {
                type: 'youtube',
                url: url,
                altText: altText || '',
                caption: caption || '',
                youtubeId: youtubeId,
                thumbnail: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
                uploadedAt: new Date()
            };
            
            res.json(media);
        } catch (error) {
            console.error('[CMS] Error processing YouTube URL:', error);
            res.status(500).json({ error: 'Failed to process YouTube URL' });
        }
    });

    // Delete media file
    app.delete('/api/cms/media/:filename', ensureAdmin, async (req, res) => {
        try {
            const filename = req.params.filename;
            const imagePath = path.join(__dirname, 'uploads', 'images', filename);
            const videoPath = path.join(__dirname, 'uploads', 'videos', filename);
            
            let filePath = null;
            if (fs.existsSync(imagePath)) {
                filePath = imagePath;
            } else if (fs.existsSync(videoPath)) {
                filePath = videoPath;
            }
            
            if (filePath) {
                fs.unlinkSync(filePath);
                res.json({ message: 'Media file deleted successfully' });
            } else {
                res.status(404).json({ error: 'Media file not found' });
            }
        } catch (error) {
            console.error('[CMS] Error deleting media:', error);
            res.status(500).json({ error: 'Failed to delete media file' });
        }
    });

    // Get published homepage content (public endpoint)
    app.get('/api/homepage', async (req, res) => {
        try {
            const contentBlocks = await ContentBlock.find({ 
                status: 'published',
                'settings.visible': true 
            })
            .sort({ 'settings.order': 1 })
            .select('-createdBy -updatedBy -version -__v');
            
            // Get global site settings
            const siteSettings = await SiteSettings.find({})
                .select('key value type category -_id');
            
            const settingsMap = {};
            siteSettings.forEach(setting => {
                settingsMap[setting.key] = setting.value;
            });
            
            res.json({
                content: contentBlocks,
                settings: settingsMap
            });
        } catch (error) {
            console.error('[CMS] Error fetching homepage content:', error);
            res.status(500).json({ error: 'Failed to fetch homepage content' });
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