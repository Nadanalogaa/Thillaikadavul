const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Initialize Supabase with error handling
let supabase;
try {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables');
    throw new Error('Supabase credentials not configured');
  }
  
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  console.log('Supabase initialized successfully');
} catch (error) {
  console.error('Failed to initialize Supabase:', error);
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({ 
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Email setup
let mailTransporter;
try {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    mailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
} catch (error) {
  console.error('Email setup failed:', error);
}

// Helper function to create JWT token for sessions
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Auth middleware
const ensureAuthenticated = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  req.user = user;
  next();
};

const ensureAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Email template function
const createEmailTemplate = (name, subject, message) => {
  const year = new Date().getFullYear();
  const logoUrl = 'https://nadanaloga.com/static/media/nadanaloga.7f9472b3c071a833076a.png';
  
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      body { margin: 0; padding: 0; font-family: 'Poppins', Arial, sans-serif; background-color: #f4f5f7; }
      .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; }
      .header { padding: 25px; text-align: center; border-bottom: 1px solid #eee; }
      .content { padding: 30px; }
      .footer { padding: 20px; background: #333; color: white; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="${logoUrl}" alt="Nadanaloga Logo" width="200" />
      </div>
      <div class="content">
        <h1 style="color: #333; margin-bottom: 20px;">${subject}</h1>
        <p>Dear ${name},</p>
        <div style="line-height: 1.6; color: #555;">${message.replace(/\n/g, '<br>')}</div>
        <p style="margin-top: 30px;">Sincerely,<br>The Nadanaloga Team</p>
      </div>
      <div class="footer">
        <p>&copy; ${year} Nadanaloga.com | contact@nadanaloga.com</p>
      </div>
    </div>
  </body>
  </html>`;
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { password, ...userData } = req.body;
    if (!userData.email) return res.status(400).json({ message: 'Email is required.' });
    
    const normalizedEmail = userData.email.toLowerCase();
    
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .single();
      
    if (existingUser) {
      return res.status(409).json({ message: 'This email is already registered.' });
    }
    
    // Set admin role
    if (normalizedEmail === 'admin@nadanaloga.com') userData.role = 'Admin';
    
    if (!password) return res.status(400).json({ message: 'Password is required.' });
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        ...userData,
        email: normalizedEmail,
        password: hashedPassword
      })
      .select()
      .single();
      
    if (error) throw error;
    
    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
      
    if (error || !user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    
    delete user.password;
    const token = createToken(user);
    
    res.json({ user, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

app.get('/api/session', ensureAuthenticated, (req, res) => {
  res.json(req.user);
});

app.post('/api/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    const { error } = await supabase
      .from('contacts')
      .insert({ name, email, message });
      
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({ message: 'Failed to submit message.' });
  }
});

app.get('/api/courses', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Database connection not available' });
    }
    
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at');
      
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    res.json(courses || []);
  } catch (error) {
    console.error('Courses error:', error);
    res.status(500).json({ message: 'Server error fetching courses.', error: error.message });
  }
});

app.put('/api/profile', ensureAuthenticated, async (req, res) => {
  try {
    const { password, role, email, ...updateData } = req.body;
    
    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select()
      .single();
      
    if (error) throw error;
    
    delete user.password;
    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
});

// Admin Routes
app.get('/api/admin/stats', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { data: students } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'Student');
      
    const { data: teachers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'Teacher');
      
    const { data: onlineUsers } = await supabase
      .from('users')
      .select('id')
      .eq('class_preference', 'Online')
      .neq('role', 'Admin');
      
    const { data: offlineUsers } = await supabase
      .from('users')
      .select('id')
      .eq('class_preference', 'Offline')
      .neq('role', 'Admin');
    
    res.json({
      totalUsers: (students?.length || 0) + (teachers?.length || 0),
      studentCount: students?.length || 0,
      teacherCount: teachers?.length || 0,
      onlinePreference: onlineUsers?.length || 0,
      offlinePreference: offlineUsers?.length || 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error fetching stats.' });
  }
});

app.get('/api/admin/users', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .neq('role', 'Admin')
      .order('created_at');
      
    if (error) throw error;
    
    // Remove passwords
    const safeUsers = users.map(user => {
      delete user.password;
      return user;
    });
    
    res.json(safeUsers);
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

app.post('/api/admin/users', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { password, ...userData } = req.body;
    
    if (!userData.email) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    
    // Check if email exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email.toLowerCase())
      .single();
      
    if (existing) {
      return res.status(409).json({ message: 'This email is already in use.' });
    }
    
    const effectivePassword = password || 'password123';
    const hashedPassword = await bcrypt.hash(effectivePassword, 10);
    
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        ...userData,
        password: hashedPassword,
        email: userData.email.toLowerCase()
      })
      .select()
      .single();
      
    if (error) throw error;
    
    delete user.password;
    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error creating user.' });
  }
});

app.put('/api/admin/users/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    
    if (updateData.email) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', updateData.email.toLowerCase())
        .neq('id', req.params.id)
        .single();
        
      if (existing) {
        return res.status(409).json({ message: 'This email is already in use.' });
      }
    }
    
    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();
      
    if (error) throw error;
    
    delete user.password;
    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error updating user.' });
  }
});

app.delete('/api/admin/users/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);
      
    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user.' });
  }
});

app.post('/api/admin/notifications', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { userIds, subject, message } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs are required.' });
    }
    
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required.' });
    }
    
    // Get users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds);
      
    if (usersError || !users || users.length === 0) {
      return res.status(404).json({ message: 'No valid recipients found.' });
    }
    
    // Save notifications
    const notifications = users.map(user => ({
      user_id: user.id,
      subject,
      message
    }));
    
    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);
      
    if (notifError) throw notifError;
    
    // Send emails
    if (mailTransporter) {
      for (const user of users) {
        const mailDetails = {
          from: process.env.SMTP_FROM_EMAIL || '"Nadanaloga Admin" <no-reply@nadanaloga.com>',
          to: user.email,
          subject: subject,
          html: createEmailTemplate(user.name, subject, message),
        };
        
        try {
          await mailTransporter.sendMail(mailDetails);
          console.log(`Email sent to ${user.email}`);
        } catch (emailError) {
          console.error(`Email failed for ${user.email}:`, emailError);
        }
      }
    }
    
    res.json({ success: true, message: 'Notifications sent successfully.' });
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ message: 'Server error sending notifications.' });
  }
});

// Course management
app.get('/api/admin/courses', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at');
      
    if (error) throw error;
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching courses.' });
  }
});

app.post('/api/admin/courses', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    
    const { data: course, error } = await supabase
      .from('courses')
      .insert({ name, description, icon })
      .select()
      .single();
      
    if (error) throw error;
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating course.' });
  }
});

app.put('/api/admin/courses/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    
    const { data: course, error } = await supabase
      .from('courses')
      .update({ name, description, icon })
      .eq('id', req.params.id)
      .select()
      .single();
      
    if (error) throw error;
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating course.' });
  }
});

app.delete('/api/admin/courses/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', req.params.id);
      
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting course.' });
  }
});

// Batch management
app.get('/api/admin/batches', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { data: batches, error } = await supabase
      .from('batches')
      .select('*')
      .order('created_at');
      
    if (error) throw error;
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching batches.' });
  }
});

app.post('/api/admin/batches', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { data: batch, error } = await supabase
      .from('batches')
      .insert(req.body)
      .select()
      .single();
      
    if (error) throw error;
    res.status(201).json(batch);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating batch.' });
  }
});

app.put('/api/admin/batches/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { data: batch, error } = await supabase
      .from('batches')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
      
    if (error) throw error;
    res.json(batch);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating batch.' });
  }
});

app.delete('/api/admin/batches/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('id', req.params.id);
      
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting batch.' });
  }
});

// Notifications
app.get('/api/notifications', ensureAuthenticated, async (req, res) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching notifications.' });
  }
});

app.put('/api/notifications/:id/read', ensureAuthenticated, async (req, res) => {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();
      
    if (error) throw error;
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating notification.' });
  }
});

module.exports = serverless(app);
