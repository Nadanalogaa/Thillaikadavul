import type { User, ContactFormData, Course, DashboardStats, Notification, Batch, FeeStructure, Invoice, PaymentDetails, StudentEnrollment, Event, GradeExam, BookMaterial, Notice, Location, DemoBooking, EventNotification, EventImage } from './types';
import { UserRole, ClassPreference } from './types';
import { supabase } from './src/lib/supabase.js';
import { notificationService } from './services/notificationService';
// Removed local email service import - using backend SMTP

// Simple session management
let currentUser: User | null = null;
let attemptedTeacherHydration = false;

const ensureArray = <T>(input: T | T[] | null | undefined): T[] => {
  if (Array.isArray(input)) {
    return input;
  }
  if (input === null || typeof input === 'undefined') {
    return [];
  }
  return [input];
};

const buildPersistedUser = (value: User) => ({
  ...value,
  courses: ensureArray(value.courses),
  courseExpertise: ensureArray(value.courseExpertise),
  preferredTimings: ensureArray(value.preferredTimings),
  availableTimeSlots: ensureArray(value.availableTimeSlots),
});

const needsTeacherDataHydration = (user: User | null): boolean => {
  if (!user || user.role !== 'Teacher') {
    return false;
  }

  const missingCourseExpertise = typeof user.courseExpertise === 'undefined';
  const missingAvailableSlots = typeof user.availableTimeSlots === 'undefined';
  const missingPreferredTimings = typeof user.preferredTimings === 'undefined';
  const missingCourses = typeof user.courses === 'undefined';

  return missingCourseExpertise || missingAvailableSlots || missingPreferredTimings || missingCourses;
};

// Safe localStorage operations with error handling
const safeSetLocalStorage = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  
  try {
    if (key === 'currentUser' && value && typeof value === 'object') {
      const persistedUser = buildPersistedUser(value as User);
      localStorage.setItem(key, JSON.stringify(persistedUser));
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
    // Try to clear old data and retry with sanitized payload
    try {
      localStorage.clear();
      if (key === 'currentUser' && value && typeof value === 'object') {
        const persistedUser = buildPersistedUser(value as User);
        localStorage.setItem(key, JSON.stringify(persistedUser));
      }
    } catch (retryError) {
      console.error('localStorage completely full, cannot save user session:', retryError);
    }
  }
};

// Email validation cache to avoid duplicate API calls
const emailCache = new Map<string, { exists: boolean; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

// Core working functions
export const checkEmailExists = async (email: string): Promise<{ exists: boolean }> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Check cache first
    const cached = emailCache.get(normalizedEmail);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return { exists: cached.exists };
    }

    // Use backend API instead of Supabase directly
    const response = await fetch('/api/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: normalizedEmail })
    });

    if (!response.ok) {
      throw new Error('Failed to check email availability');
    }

    const { exists } = await response.json();

    // Cache the result
    emailCache.set(normalizedEmail, { exists, timestamp: Date.now() });

    return { exists };
  } catch (error) {
    console.error('Error in checkEmailExists:', error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Use actual login endpoint with password verification
    const response = await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        password: password
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Login error:', errorData);
      throw new Error(errorData.message || 'Invalid email or password.');
    }

    const user = await response.json();

    if (!user || !user.id) {
      throw new Error('Login failed. Invalid response from server.');
    }

    // Convert database format to frontend format
    const userData: User = {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      classPreference: user.class_preference || 'Online',
      contactNumber: user.contact_number,
      address: user.address,
      country: user.country,
      state: user.state,
      city: user.city,
      postalCode: user.postal_code,
      fatherName: user.father_name,
      dob: user.dob,
      sex: user.sex,
      schoolName: user.school_name,
      standard: user.standard,
      grade: user.grade,
      photoUrl: user.photo_url,
      courses: Array.isArray(user.courses) ? user.courses : [],
      courseExpertise: Array.isArray(user.course_expertise) ? user.course_expertise : [],
      preferredTimings: Array.isArray(user.preferred_timings) ? user.preferred_timings : [],
      availableTimeSlots: Array.isArray(user.available_time_slots) ? user.available_time_slots : [],
      educationalQualifications: user.educational_qualifications,
      employmentType: user.employment_type,
      yearsOfExperience: user.years_of_experience,
      dateOfJoining: user.date_of_joining,
      schedules: user.schedules || [],
      documents: user.documents || [],
      notes: user.notes
    };

    currentUser = userData;
    safeSetLocalStorage('currentUser', userData);

    console.log('User logged in successfully:', userData);
    return userData;

  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Login failed. Please try again.');
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  // Try to restore from localStorage if currentUser is null
  if (!currentUser && typeof window !== 'undefined') {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        currentUser = JSON.parse(storedUser);
        console.log('User restored from localStorage:', currentUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }

  if (!attemptedTeacherHydration && needsTeacherDataHydration(currentUser)) {
    attemptedTeacherHydration = true;
    try {
      const refreshedUser = await refreshCurrentUser();
      if (refreshedUser) {
        attemptedTeacherHydration = false;
        return refreshedUser;
      }
    } catch (error) {
      console.error('Auto-refresh of teacher data failed:', error);
    }
  }

  return currentUser;
};

// Function to refresh current user data from database
export const refreshCurrentUser = async (): Promise<User | null> => {
  if (!currentUser?.id) {
    console.log('No current user to refresh');
    return null;
  }

  try {
    console.log('Refreshing user data from database for:', currentUser.email);

    const response = await fetch(`/api/users/${currentUser.id}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error refreshing user data:', response.statusText);
      return currentUser; // Return cached data if refresh fails
    }

    const user = await response.json();

    if (!user) {
      console.warn('User not found in database during refresh');
      return currentUser; // Return cached data if user not found
    }
    console.log('Raw user data from database:', user);
    console.log('Raw course_expertise:', user.course_expertise);
    console.log('Raw available_time_slots:', user.available_time_slots);
    console.log('Raw courses:', user.courses);
    
    const userData: User = {
      id: String(user.id),
      userId: user.user_id || null,
      name: user.name,
      email: user.email,
      role: user.role,
      classPreference: user.class_preference || 'Online',
      contactNumber: user.contact_number,
      address: user.address,
      country: user.country,
      state: user.state,
      city: user.city,
      postalCode: user.postal_code,
      fatherName: user.father_name,
      dob: user.dob,
      sex: user.sex,
      schoolName: user.school_name,
      standard: user.standard,
      grade: user.grade,
      photoUrl: user.photo_url,
      courses: Array.isArray(user.courses) ? user.courses : (user.courses ? [user.courses] : []),
      courseExpertise: Array.isArray(user.course_expertise) ? user.course_expertise : (user.course_expertise ? [user.course_expertise] : []),
      preferredTimings: Array.isArray(user.preferred_timings) ? user.preferred_timings : (user.preferred_timings ? [user.preferred_timings] : []),
      availableTimeSlots: Array.isArray(user.available_time_slots) ? user.available_time_slots : (user.available_time_slots ? [user.available_time_slots] : []),
      educationalQualifications: user.educational_qualifications,
      employmentType: user.employment_type,
      yearsOfExperience: user.years_of_experience,
      dateOfJoining: user.date_of_joining
    };

    console.log('Mapped user data:', userData);
    console.log('Final courseExpertise:', userData.courseExpertise);
    console.log('Final availableTimeSlots:', userData.availableTimeSlots);
    
    currentUser = userData;
    attemptedTeacherHydration = false;
    safeSetLocalStorage('currentUser', userData);
    
    console.log('User data refreshed successfully:', userData);
    return userData;

  } catch (error) {
    console.error('Error refreshing current user:', error);
    return currentUser; // Return cached data if refresh fails
  }
};

export const logout = async (): Promise<void> => {
  currentUser = null;
  attemptedTeacherHydration = false;
  // Clear localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentUser');
  }
  console.log('User logged out');
};

export const getCourses = async (): Promise<Course[]> => {
  try {
    // Use Express API instead of Supabase
    const response = await fetch('/api/courses', { credentials: 'include' });

    if (!response.ok) {
      console.error('Error fetching courses:', response.statusText);
      // If API fails, try to initialize basic courses
      return await initializeBasicCourses();
    }

    const data = await response.json();

    // If no courses in database, initialize basic ones
    if (!data || data.length === 0) {
      return await initializeBasicCourses();
    }

    // Deduplicate courses by name, keeping the one with image if available
    const uniqueCourses = data.reduce((acc, course) => {
      const existing = acc.find(c => c.name === course.name);
      if (!existing) {
        acc.push(course);
      } else if (course.image && !existing.image) {
        // Replace existing with one that has image
        const index = acc.findIndex(c => c.name === course.name);
        acc[index] = course;
      }
      return acc;
    }, []);

    return uniqueCourses.map(course => ({
      id: String(course.id),
      name: course.name,
      description: course.description,
      icon: course.icon || course.name,
      image: course.image,
      icon_url: course.icon_url
    }));

  } catch (error) {
    console.error('Error in getCourses:', error);
    // Fallback to basic courses if database fails
    return await initializeBasicCourses();
  }
};

// Helper function to initialize basic courses in database
const initializeBasicCourses = async (): Promise<Course[]> => {
  const basicCourses = [
    {
      name: 'Bharatanatyam',
      description: 'Classical Indian dance form',
      icon: 'Bharatanatyam',
      created_at: new Date().toISOString()
    },
    {
      name: 'Vocal',
      description: 'Carnatic vocal music',
      icon: 'Vocal',
      created_at: new Date().toISOString()
    },
    {
      name: 'Drawing',
      description: 'Art and drawing classes',
      icon: 'Drawing',
      created_at: new Date().toISOString()
    },
    {
      name: 'Abacus',
      description: 'Mental arithmetic training',
      icon: 'Abacus',
      created_at: new Date().toISOString()
    }
  ];

  try {
    const response = await fetch('/api/courses', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basicCourses)
    });

    if (!response.ok) {
      console.error('Error initializing courses:', response.statusText);
      // Return basic courses with generated IDs as fallback
      return basicCourses.map((course, index) => ({
        id: `course-${index + 1}`,
        name: course.name,
        description: course.description,
        icon: course.icon
      }));
    }

    const data = await response.json();

    return Array.isArray(data) ? data.map(course => ({
      id: String(course.id),
      name: course.name,
      description: course.description,
      icon: course.icon || course.name
    })) : [{
      id: String(data.id),
      name: data.name,
      description: data.description,
      icon: data.icon || data.name
    }];

  } catch (error) {
    console.error('Error in initializeBasicCourses:', error);
    // Return basic courses with generated IDs as fallback
    return basicCourses.map((course, index) => ({
      id: `course-${index + 1}`,
      name: course.name,
      description: course.description,
      icon: course.icon
    }));
  }
};

export const submitContactForm = async (data: ContactFormData): Promise<{success: boolean}> => {
  try {
    const emailBody = `
New Contact Form Submission

Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || 'Not provided'}
Subject: ${data.subject || 'General Inquiry'}

Message:
${data.message}

---
This message was sent from the Nadanaloga Fine Arts Academy contact form.
    `;

    // Send email to admin via backend SMTP
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'nadanalogaa@gmail.com',
        subject: data.subject ? `Contact Form: ${data.subject}` : 'Contact Form Submission',
        body: emailBody,
        recipientName: 'Admin'
      })
    });

    if (!response.ok) {
      console.error('Failed to send contact form email');
      throw new Error('Failed to send message. Please try again.');
    }

    // Send confirmation email to the user
    try {
      const confirmationBody = `
Dear ${data.name},

Thank you for contacting Nadanaloga Fine Arts Academy!

We have received your message and will get back to you within 24 hours.

Your Message:
${data.message}

Best regards,
Nadanaloga Fine Arts Academy Team
      `;

      const confirmationResponse = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: data.email,
          subject: 'We received your message - Nadanaloga Fine Arts Academy',
          body: confirmationBody,
          recipientName: data.name
        })
      });

      if (confirmationResponse.ok) {
        console.log('Confirmation email sent to user');
      }
    } catch (confirmationError) {
      console.error('Error sending confirmation email:', confirmationError);
    }

    console.log('Contact form submitted:', data);
    return { success: true };
  } catch (error) {
    console.error('Failed to submit contact form:', error);
    throw new Error('Failed to send message. Please try again.');
  }
};

// All other functions as placeholders to prevent errors
export const registerUser = async (userData: Partial<User>[], sendEmails: boolean = true): Promise<any> => {
  try {
    const finalUsersData = [];
    
    // Process each user individually to avoid conflicts
    for (const user of userData) {
      // Prepare complete user data in one go to avoid two-step process issues
      const completeUserData: any = {
        name: user.name || 'Student',
        email: user.email,
        password: user.password || '123456',
        role: user.role || 'Student'
      };
      
      // Add all optional fields if they exist
      if (user.classPreference) completeUserData.class_preference = user.classPreference;
      if (user.photoUrl) completeUserData.photo_url = user.photoUrl;
      if (user.dob) {
        // Ensure DOB is in correct format
        const dobDate = new Date(user.dob);
        completeUserData.dob = dobDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      if (user.sex) completeUserData.sex = user.sex;
      if (user.contactNumber) completeUserData.contact_number = user.contactNumber;
      if (user.address) completeUserData.address = user.address;
      if (user.country) completeUserData.country = user.country;
      if (user.state) completeUserData.state = user.state;
      if (user.city) completeUserData.city = user.city;
      if (user.postalCode) completeUserData.postal_code = user.postalCode;
      if (user.fatherName) completeUserData.father_name = user.fatherName;
      if (user.standard) completeUserData.standard = user.standard;
      if (user.schoolName) completeUserData.school_name = user.schoolName;
      if (user.grade) completeUserData.grade = user.grade;
      if (user.notes) completeUserData.notes = user.notes;
      if (user.educationalQualifications) completeUserData.educational_qualifications = user.educationalQualifications;
      if (user.employmentType) completeUserData.employment_type = user.employmentType;
      if (user.courses && user.courses.length > 0) completeUserData.courses = user.courses;
      if (user.schedules) completeUserData.schedules = user.schedules;
      if (user.documents) completeUserData.documents = user.documents;
      if (user.preferredTimings && user.preferredTimings.length > 0) {
        completeUserData.preferred_timings = user.preferredTimings;
      }
      
      // Teacher-specific fields
      if (user.courseExpertise && user.courseExpertise.length > 0) {
        completeUserData.course_expertise = user.courseExpertise;
      }
      if (user.availableTimeSlots && user.availableTimeSlots.length > 0) {
        completeUserData.available_time_slots = user.availableTimeSlots;
      }
      if (user.yearsOfExperience !== undefined) {
        completeUserData.years_of_experience = user.yearsOfExperience;
      }
      if (user.dateOfJoining) {
        const joinDate = new Date(user.dateOfJoining);
        completeUserData.date_of_joining = joinDate.toISOString().split('T')[0];
      } else {
        completeUserData.date_of_joining = new Date().toISOString().split('T')[0];
      }

      console.log('Registering user with data:', completeUserData);

      // Debug teacher-specific fields
      if (user.role === 'Teacher') {
        console.log('Teacher specific data:');
        console.log('- courseExpertise:', user.courseExpertise);
        console.log('- availableTimeSlots:', user.availableTimeSlots);
        console.log('- Will save as course_expertise:', completeUserData.course_expertise);
        console.log('- Will save as available_time_slots:', completeUserData.available_time_slots);
      }

      let data;
      // Skip backend registration for now due to missing users table in PostgreSQL
      // Use backend registration endpoint with email notifications for students
      if (false && sendEmails && user.role === 'Student') {
        try {
          const response = await fetch('/api/register-with-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(completeUserData)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Registration failed');
          }

          const result = await response.json();
          // Since backend returns userId, we need to fetch the complete user data
          const userResponse = await fetch(`/api/users/${result.userId}`, {
            method: 'GET',
            credentials: 'include'
          });

          if (!userResponse.ok) {
            throw new Error('Failed to fetch user data after registration');
          }

          data = await userResponse.json();
          console.log('User registered with emails successfully:', data);
        } catch (backendError) {
          console.error('Backend registration with emails failed, falling back to Express API:', backendError);
          // Fallback to direct Express API registration
          const fallbackResponse = await fetch('/api/register', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(completeUserData)
          });

          if (!fallbackResponse.ok) {
            const errorText = await fallbackResponse.text();
            console.error('Express API registration error:', errorText);
            throw new Error(`Registration failed: ${errorText}`);
          }
          data = await fallbackResponse.json();
        }
      } else {
        // Direct Express API registration for teachers or when emails are disabled
        const registerResponse = await fetch('/api/register', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(completeUserData)
        });

        if (!registerResponse.ok) {
          const errorText = await registerResponse.text();
          console.error('Registration error details:', {
            statusText: registerResponse.statusText,
            errorText,
            userData: completeUserData
          });
          throw new Error(`Registration failed: ${errorText || registerResponse.statusText}`);
        }
        data = await registerResponse.json();

        // Send registration emails for students via backend SMTP
        if (sendEmails && data.role === 'Student') {
          try {
            const response = await fetch('/api/send-registration-emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userName: data.name,
                userEmail: data.email,
                courses: data.courses || [],
                contactNumber: data.contact_number,
                fatherName: data.father_name,
                standard: data.standard,
                schoolName: data.school_name,
                address: data.address,
                dateOfJoining: data.date_of_joining,
                notes: data.notes
              })
            });

            if (response.ok) {
              console.log('Registration emails sent successfully');
            } else {
              console.error('Failed to send registration emails:', response.statusText);
            }
          } catch (emailError) {
            console.error('Failed to send registration emails:', emailError);
            // Don't fail the registration if emails fail
          }
        }

        // In-app notifications are now created server-side during registration
        // (no need for frontend notification service call here)
      }

      console.log('User registered successfully:', data);
      finalUsersData.push(data);
    }

    return { message: 'Registration successful', users: finalUsersData };
  } catch (error) {
    console.error('Registration process error:', error);
    throw error;
  }
};
export const registerAdmin = async (userData: Partial<User>): Promise<any> => {
  try {
    const adminData = {
      name: userData.name ? String(userData.name).substring(0, 20) : null,
      email: userData.email ? String(userData.email).substring(0, 20) : null,
      password: userData.password ? String(userData.password).substring(0, 20) : null,
      role: 'Admin',
      class_preference: 'Hybrid',
      contact_number: userData.contactNumber ? String(userData.contactNumber).substring(0, 20) : null,
      date_of_joining: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    const response = await fetch('/api/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Admin registration error:', errorText);
      throw new Error(`Admin registration failed: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log('Admin registered successfully:', data);
    return { message: 'Admin registration successful', admin: data };
  } catch (error) {
    console.error('Admin registration error:', error);
    throw error;
  }
};
export const updateUserProfile = async (userData: Partial<User>): Promise<User> => {
  if (currentUser) {
    currentUser = { ...currentUser, ...userData };
    return currentUser;
  }
  throw new Error('No user logged in');
};

// Admin functions
export const getAdminStats = async (): Promise<DashboardStats> => {
  try {
    const response = await fetch('/api/stats/admin', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching admin stats:', response.statusText);
      return { totalUsers: 0, studentCount: 0, teacherCount: 0, onlinePreference: 0, offlinePreference: 0 };
    }

    const data = await response.json();

    const studentCount = data.students || 0;
    const teacherCount = data.teachers || 0;

    return {
      totalUsers: studentCount + teacherCount + (data.admins || 0),
      studentCount,
      teacherCount,
      onlinePreference: 0,
      offlinePreference: 0
    };
  } catch (error) {
    console.error('Error in getAdminStats:', error);
    return { totalUsers: 0, studentCount: 0, teacherCount: 0, onlinePreference: 0, offlinePreference: 0 };
  }
};

export const getAdminUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch('/api/users', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching admin users:', response.statusText);
      return [];
    }

    const data = await response.json();

    return (data || []).map((user: any) => ({
      id: String(user.id),
      userId: user.user_id || null,
      name: user.name,
      email: user.email,
      role: user.role,
      classPreference: user.class_preference,
      contactNumber: user.contact_number,
      address: user.address,
      country: user.country,
      state: user.state,
      city: user.city,
      postalCode: user.postal_code,
      fatherName: user.father_name,
      dob: user.dob,
      sex: user.sex,
      schoolName: user.school_name,
      standard: user.standard,
      grade: user.grade,
      photoUrl: user.photo_url,
      dateOfJoining: user.date_of_joining,
      courses: user.courses || [],
      courseExpertise: user.course_expertise || []
    }));
  } catch (error) {
    console.error('Error in getAdminUsers:', error);
    return [];
  }
};
export const getAdminUserById = async (userId: string): Promise<User> => {
  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching user by ID:', response.statusText);
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data) {
      throw new Error('User not found');
    }

    // Map database fields to User interface
    return {
      id: String(data.id),
      name: data.name,
      email: data.email,
      role: data.role,
      classPreference: data.class_preference,
      contactNumber: data.contact_number,
      alternateContactNumber: data.alternate_contact_number,
      address: data.address,
      country: data.country,
      state: data.state,
      city: data.city,
      postalCode: data.postal_code,
      timezone: data.timezone,
      preferredTimings: data.preferred_timings || [],
      status: data.status,
      locationId: data.location_id,
      
      // Student specific fields
      courses: data.courses || [],
      fatherName: data.father_name,
      standard: data.standard,
      schoolName: data.school_name,
      grade: data.grade,
      notes: data.notes,
      schedules: data.schedules || [],
      documents: data.documents || [],
      
      // Teacher specific fields
      courseExpertise: data.course_expertise || [],
      educationalQualifications: data.educational_qualifications,
      employmentType: data.employment_type,
      yearsOfExperience: data.years_of_experience,
      availableTimeSlots: data.available_time_slots || [],
      
      // Common fields
      photoUrl: data.photo_url,
      dob: data.dob,
      sex: data.sex,
      dateOfJoining: data.date_of_joining,
      
      // Soft delete fields
      isDeleted: data.is_deleted,
      deletedAt: data.deleted_at
    };
  } catch (error) {
    console.error('Error in getAdminUserById:', error);
    throw error;
  }
};
export const addStudentByAdmin = async (userData: Partial<User>): Promise<User> => {
  try {
    // Call the registerUser function with the student data as an array
    const result = await registerUser([userData]);
    
    if (result && result.users && result.users.length > 0) {
      // Return the first (and only) user from the result
      const savedUser = result.users[0];
      
      // Map database fields to User interface
      return {
        id: String(savedUser.id),
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        classPreference: savedUser.class_preference,
        contactNumber: savedUser.contact_number,
        address: savedUser.address,
        country: savedUser.country,
        state: savedUser.state,
        city: savedUser.city,
        postalCode: savedUser.postal_code,
        fatherName: savedUser.father_name,
        dob: savedUser.dob,
        sex: savedUser.sex,
        schoolName: savedUser.school_name,
        standard: savedUser.standard,
        grade: savedUser.grade,
        photoUrl: savedUser.photo_url,
        courses: savedUser.courses || [],
        courseExpertise: savedUser.course_expertise || [],
        preferredTimings: savedUser.preferred_timings || [],
        dateOfJoining: savedUser.date_of_joining,
        schedules: savedUser.schedules || [],
        documents: savedUser.documents || [],
        notes: savedUser.notes
      };
    } else {
      throw new Error('Failed to add student - no user returned');
    }
  } catch (error) {
    console.error('Error in addStudentByAdmin:', error);
    throw error;
  }
};
export const updateUserByAdmin = async (userId: string, userData: Partial<User>): Promise<User> => {
  try {
    // Get the current user data to compare for schedule changes
    let currentUser: User | null = null;
    if (userData.schedules !== undefined) {
      const userResponse = await fetch(`/api/users/${userId}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (userResponse.ok) {
        const currentUserData = await userResponse.json();
        currentUser = {
          id: userId,
          name: currentUserData.name,
          email: currentUserData.email,
          role: currentUserData.role as UserRole,
          schedules: currentUserData.schedules || []
        } as User;
      }
    }

    const updateData: any = {};

    // Map User interface fields to database fields
    if (userData.name !== undefined) updateData.name = userData.name;
    if (userData.email !== undefined) updateData.email = userData.email;
    if (userData.role !== undefined) updateData.role = userData.role;
    if (userData.classPreference !== undefined) updateData.class_preference = userData.classPreference;
    if (userData.contactNumber !== undefined) updateData.contact_number = userData.contactNumber;
    if (userData.alternateContactNumber !== undefined) updateData.alternate_contact_number = userData.alternateContactNumber;
    if (userData.address !== undefined) updateData.address = userData.address;
    if (userData.country !== undefined) updateData.country = userData.country;
    if (userData.state !== undefined) updateData.state = userData.state;
    if (userData.city !== undefined) updateData.city = userData.city;
    if (userData.postalCode !== undefined) updateData.postal_code = userData.postalCode;
    if (userData.timezone !== undefined) updateData.timezone = userData.timezone;
    if (userData.preferredTimings !== undefined) updateData.preferred_timings = userData.preferredTimings;
    if (userData.status !== undefined) updateData.status = userData.status;
    if (userData.locationId !== undefined) updateData.location_id = userData.locationId;

    // Student specific fields
    if (userData.courses !== undefined) updateData.courses = userData.courses;
    if (userData.fatherName !== undefined) updateData.father_name = userData.fatherName;
    if (userData.standard !== undefined) updateData.standard = userData.standard;
    if (userData.schoolName !== undefined) updateData.school_name = userData.schoolName;
    if (userData.grade !== undefined) updateData.grade = userData.grade;
    if (userData.notes !== undefined) updateData.notes = userData.notes;
    if (userData.schedules !== undefined) updateData.schedules = userData.schedules;
    if (userData.documents !== undefined) updateData.documents = userData.documents;
    
    // Teacher specific fields
    if (userData.courseExpertise !== undefined) updateData.course_expertise = userData.courseExpertise;
    if (userData.educationalQualifications !== undefined) updateData.educational_qualifications = userData.educationalQualifications;
    if (userData.employmentType !== undefined) updateData.employment_type = userData.employmentType;
    if (userData.yearsOfExperience !== undefined) updateData.years_of_experience = userData.yearsOfExperience;
    if (userData.availableTimeSlots !== undefined) updateData.available_time_slots = userData.availableTimeSlots;
    
    // Common fields
    if (userData.photoUrl !== undefined) updateData.photo_url = userData.photoUrl;
    if (userData.dob !== undefined) updateData.dob = userData.dob;
    if (userData.sex !== undefined) updateData.sex = userData.sex;
    if (userData.dateOfJoining !== undefined) updateData.date_of_joining = userData.dateOfJoining;
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const response = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error updating user:', errorText);
      throw new Error(`Failed to update user: ${errorText || response.statusText}`);
    }

    const data = await response.json();

    // Map database fields back to User interface
    const userResult = {
      id: String(data.id),
      name: data.name,
      email: data.email,
      role: data.role,
      classPreference: data.class_preference,
      contactNumber: data.contact_number,
      alternateContactNumber: data.alternate_contact_number,
      address: data.address,
      country: data.country,
      state: data.state,
      city: data.city,
      postalCode: data.postal_code,
      timezone: data.timezone,
      preferredTimings: data.preferred_timings || [],
      status: data.status,
      locationId: data.location_id,
      
      // Student specific fields
      courses: data.courses || [],
      fatherName: data.father_name,
      standard: data.standard,
      schoolName: data.school_name,
      grade: data.grade,
      notes: data.notes,
      schedules: data.schedules || [],
      documents: data.documents || [],
      
      // Teacher specific fields
      courseExpertise: data.course_expertise || [],
      educationalQualifications: data.educational_qualifications,
      employmentType: data.employment_type,
      yearsOfExperience: data.years_of_experience,
      availableTimeSlots: data.available_time_slots || [],
      
      // Common fields
      photoUrl: data.photo_url,
      dob: data.dob,
      sex: data.sex,
      dateOfJoining: data.date_of_joining,
      
      // Soft delete fields
      isDeleted: data.is_deleted,
      deletedAt: data.deleted_at
    };

    // Send schedule/assignment change notifications
    if (currentUser && userData.schedules !== undefined && data.role === 'Student') {
      try {
        const oldSchedules = currentUser.schedules || [];
        const newSchedules = userData.schedules || [];

        // Compare schedules to detect teacher assignments/changes
        for (const newSchedule of newSchedules) {
          const oldSchedule = oldSchedules.find(s => s.course === newSchedule.course);

          // New teacher assignment
          if (newSchedule.teacherId && (!oldSchedule || oldSchedule.teacherId !== newSchedule.teacherId)) {
            // Get teacher name for notification
            const teacherResponse = await fetch(`/api/users/${newSchedule.teacherId}`, {
              method: 'GET',
              credentials: 'include'
            });

            const teacherData = teacherResponse.ok ? await teacherResponse.json() : null;
            const teacherName = teacherData?.name || 'Unknown Teacher';

            await notificationService.notifyBatchAllocation(
              userId,
              `${newSchedule.course} Class`,
              newSchedule.course,
              teacherName,
              newSchedule.timing || 'Schedule to be confirmed',
              newSchedule.teacherId
            );
          }

          // Teacher unassignment (when teacherId is removed)
          if (oldSchedule?.teacherId && !newSchedule.teacherId) {
            // Notify about unassignment
            const oldTeacherResponse = await fetch(`/api/users/${oldSchedule.teacherId}`, {
              method: 'GET',
              credentials: 'include'
            });

            const oldTeacherData = oldTeacherResponse.ok ? await oldTeacherResponse.json() : null;
            const oldTeacherName = oldTeacherData?.name || 'Previous Teacher';

            // Send unassignment notification to admin and old teacher
            const adminIds = await notificationService.getAdminUsers();

            // Notify admin
            for (const adminId of adminIds) {
              await notificationService.sendNotification({
                type: 'modification',
                title: 'Student Assignment Removed',
                message: `${currentUser.name} has been unassigned from ${oldTeacherName} for ${newSchedule.course}`,
                recipientId: adminId,
                emailRequired: true,
                priority: 'medium'
              });
            }

            // Notify old teacher
            if (oldSchedule.teacherId) {
              await notificationService.sendNotification({
                type: 'modification',
                title: 'Student Assignment Removed',
                message: `${currentUser.name} has been unassigned from your ${newSchedule.course} class`,
                recipientId: oldSchedule.teacherId,
                emailRequired: true,
                priority: 'medium'
              });
            }
          }
        }

        // Check for removed courses (courses that existed but are no longer in the schedule)
        for (const oldSchedule of oldSchedules) {
          if (!newSchedules.find(s => s.course === oldSchedule.course) && oldSchedule.teacherId) {
            // Course completely removed - notify teacher and admin
            const teacherResponse = await fetch(`/api/users/${oldSchedule.teacherId}`, {
              method: 'GET',
              credentials: 'include'
            });

            const teacherData = teacherResponse.ok ? await teacherResponse.json() : null;
            const teacherName = teacherData?.name || 'Unknown Teacher';
            const adminIds = await notificationService.getAdminUsers();

            // Notify admin
            for (const adminId of adminIds) {
              await notificationService.sendNotification({
                type: 'modification',
                title: 'Student Course Removed',
                message: `${currentUser.name} has been removed from ${oldSchedule.course} (was assigned to ${teacherName})`,
                recipientId: adminId,
                emailRequired: true,
                priority: 'medium'
              });
            }

            // Notify teacher
            await notificationService.sendNotification({
              type: 'modification',
              title: 'Student Course Removed',
              message: `${currentUser.name} has been removed from your ${oldSchedule.course} class`,
              recipientId: oldSchedule.teacherId,
              emailRequired: true,
              priority: 'medium'
            });
          }
        }
      } catch (notificationError) {
        console.error('Failed to send schedule change notification:', notificationError);
        // Don't fail the update if notification fails
      }
    }

    // Send profile modification notification for students (for other changes)
    if (data.role === 'Student' && userData.schedules === undefined) {
      try {
        // Determine what was modified
        const modificationType = Object.keys(userData).length === 1 ?
          Object.keys(userData)[0] : 'profile information';

        const modificationDetails = Object.keys(userData).length > 3 ?
          'Multiple fields have been updated.' :
          `Modified: ${Object.keys(userData).join(', ')}`;

        await notificationService.notifyProfileModification(
          userId,
          modificationType,
          modificationDetails
        );
      } catch (notificationError) {
        console.error('Failed to send profile modification notification:', notificationError);
        // Don't fail the update if notification fails
      }
    }

    return userResult;
  } catch (error) {
    console.error('Error in updateUserByAdmin:', error);
    throw error;
  }
};
export const deleteUserByAdmin = async (userId: string): Promise<void> => {
  try {
    // Soft delete - mark as deleted instead of hard delete
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error soft deleting user:', errorText);
      throw new Error(`Failed to delete user: ${errorText || response.statusText}`);
    }

    console.log('User soft deleted successfully:', userId);
  } catch (error) {
    console.error('Error in deleteUserByAdmin:', error);
    throw error;
  }
};
export const sendNotification = async (userIds: string[], subject: string, message: string): Promise<{success: boolean}> => ({ success: true });
export const getAdminCourses = async (): Promise<Course[]> => getCourses();
export const addCourseByAdmin = async (courseData: Omit<Course, 'id'>): Promise<Course> => {
  try {
    const response = await fetch('/api/courses', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: courseData.name,
        description: courseData.description,
        icon: courseData.icon,
        image: courseData.image,
        icon_url: courseData.icon_url,
        created_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error adding course:', errorText);
      throw new Error(`Failed to add course: ${errorText || response.statusText}`);
    }

    const data = await response.json();

    const newCourse = {
      id: String(data.id),
      name: data.name,
      description: data.description,
      icon: data.icon,
      image: data.image,
      icon_url: data.icon_url
    };

    // Send notifications about new course to all users
    try {
      const adminIds = await notificationService.getAdminUsers();
      const allStudents = await notificationService.getAllStudents();

      // Get all teachers
      const teachersResponse = await fetch('/api/users', {
        method: 'GET',
        credentials: 'include'
      });

      const teachersData = teachersResponse.ok ? await teachersResponse.json() : [];
      const teacherIds = teachersData.filter(t => t.role === 'Teacher').map(t => t.id) || [];

      // Notify all users about new course
      const allUserIds = [...adminIds, ...allStudents, ...teacherIds];

      for (const userId of allUserIds) {
        await notificationService.sendNotification({
          type: 'general',
          title: 'New Course Available',
          message: `A new course "${courseData.name}" has been added to our offerings. ${courseData.description}`,
          recipientId: userId,
          emailRequired: true,
          priority: 'medium'
        });
      }
    } catch (notificationError) {
      console.error('Failed to send course addition notification:', notificationError);
      // Don't fail the course creation if notification fails
    }

    return newCourse;
  } catch (error) {
    console.error('Error in addCourseByAdmin:', error);
    throw error;
  }
};
export const updateCourseByAdmin = async (courseId: string, courseData: Partial<Omit<Course, 'id'>>): Promise<Course> => {
  try {
    const updateData: any = {};
    if (courseData.name !== undefined) updateData.name = courseData.name;
    if (courseData.description !== undefined) updateData.description = courseData.description;
    if (courseData.icon !== undefined) updateData.icon = courseData.icon;
    if (courseData.image !== undefined) updateData.image = courseData.image;
    if (courseData.icon_url !== undefined) updateData.icon_url = courseData.icon_url;
    updateData.updated_at = new Date().toISOString();

    const response = await fetch(`/api/courses/${courseId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error updating course:', errorText);
      throw new Error(`Failed to update course: ${errorText || response.statusText}`);
    }

    const data = await response.json();

    const updatedCourse = {
      id: String(data.id),
      name: data.name,
      description: data.description,
      icon: data.icon,
      image: data.image,
      icon_url: data.icon_url
    };

    // Send notifications about course update to all users who are enrolled in this course
    try {
      // Get all users who have this course in their courses array
      const usersResponse = await fetch('/api/users', {
        method: 'GET',
        credentials: 'include'
      });

      const allUsers = usersResponse.ok ? await usersResponse.json() : [];
      const enrolledUsers = allUsers.filter(u => u.courses && u.courses.includes(data.name));
      const enrolledUserIds = enrolledUsers.map(u => u.id) || [];

      // Also notify admin
      const adminIds = await notificationService.getAdminUsers();
      const allRelevantUsers = [...new Set([...enrolledUserIds, ...adminIds])];

      for (const userId of allRelevantUsers) {
        await notificationService.sendNotification({
          type: 'modification',
          title: 'Course Updated',
          message: `The course "${data.name}" has been updated. ${Object.keys(courseData).join(', ')} modified.`,
          recipientId: userId,
          emailRequired: false,
          priority: 'medium'
        });
      }
    } catch (notificationError) {
      console.error('Failed to send course update notification:', notificationError);
      // Don't fail the course update if notification fails
    }

    return updatedCourse;
  } catch (error) {
    console.error('Error in updateCourseByAdmin:', error);
    throw error;
  }
};
export const deleteCourseByAdmin = async (courseId: string): Promise<void> => {
  try {
    // Get course details before deletion for notification
    const courseResponse = await fetch(`/api/courses/${courseId}`, {
      method: 'GET',
      credentials: 'include'
    });

    const courseData = courseResponse.ok ? await courseResponse.json() : null;

    const response = await fetch(`/api/courses/${courseId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error deleting course:', errorText);
      throw new Error(`Failed to delete course: ${errorText || response.statusText}`);
    }

    // Send notifications about course deletion
    if (courseData?.name) {
      try {
        // Get all users who had this course in their courses array
        const usersResponse = await fetch('/api/users', {
          method: 'GET',
          credentials: 'include'
        });

        const allUsers = usersResponse.ok ? await usersResponse.json() : [];
        const affectedUsers = allUsers.filter(u => u.courses && u.courses.includes(courseData.name));
        const affectedUserIds = affectedUsers.map(u => u.id) || [];

        // Also notify admin
        const adminIds = await notificationService.getAdminUsers();
        const allRelevantUsers = [...new Set([...affectedUserIds, ...adminIds])];

        for (const userId of allRelevantUsers) {
          await notificationService.sendNotification({
            type: 'modification',
            title: 'Course Discontinued',
            message: `The course "${courseData.name}" has been discontinued. Please contact administration for further information about alternative options.`,
            recipientId: userId,
            emailRequired: true,
            priority: 'high'
          });
        }
      } catch (notificationError) {
        console.error('Failed to send course deletion notification:', notificationError);
        // Don't fail the course deletion if notification fails
      }
    }
  } catch (error) {
    console.error('Error in deleteCourseByAdmin:', error);
    throw error;
  }
};

// Batch functions
export const getBatches = async (): Promise<Batch[]> => {
  try {
    // First get the basic batch data
    const batchResponse = await fetch('/api/batches', {
      method: 'GET',
      credentials: 'include'
    });

    if (!batchResponse.ok) {
      console.error('Error fetching batches:', batchResponse.statusText);
      return [];
    }

    const data = await batchResponse.json();

    // Get courses and teachers for mapping names
    const [coursesResponse, teachersResponse] = await Promise.allSettled([
      fetch('/api/courses', { method: 'GET', credentials: 'include' }),
      fetch('/api/users?role=Teacher', { method: 'GET', credentials: 'include' })
    ]);

    let courses: any[] = [];
    let teachers: any[] = [];

    if (coursesResponse.status === 'fulfilled' && coursesResponse.value.ok) {
      courses = await coursesResponse.value.json();
    }

    if (teachersResponse.status === 'fulfilled' && teachersResponse.value.ok) {
      const allTeachers = await teachersResponse.value.json();
      teachers = allTeachers.filter((u: any) => u.role === 'Teacher' && !u.is_deleted);
    }

    return (data || []).map((batch: any) => ({
      id: String(batch.id),
      name: batch.name,
      description: batch.description,
      courseId: batch.course_id,
      courseName: courses.find((c: any) => c.id === batch.course_id)?.name || 'Unknown Course',
      teacherId: batch.teacher_id,
      teacherName: teachers.find((t: any) => t.id === batch.teacher_id)?.name || 'Unassigned',
      schedule: batch.schedule || [],
      capacity: batch.capacity,
      enrolled: batch.enrolled || 0,
      mode: batch.mode,
      locationId: batch.location_id,
      startDate: batch.start_date,
      endDate: batch.end_date,
      isActive: batch.is_active !== false
    }));
  } catch (error) {
    console.error('Error in getBatches:', error);
    return [];
  }
};

export const getUsersByIds = async (ids: string[]): Promise<User[]> => {
  if (!ids || ids.length === 0) {
    return [];
  }

  try {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return [];
    }

    const response = await fetch('/api/users/by-ids', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: uniqueIds })
    });

    if (!response.ok) {
      console.error('Error fetching users by IDs:', response.statusText);
      return [];
    }

    const data = await response.json();

    return (data || []).map(user => ({
      id: String(user.id),
      userId: user.user_id || null,
      name: user.name,
      email: user.email,
      role: user.role,
      classPreference: user.class_preference || 'Online',
      contactNumber: user.contact_number,
      address: user.address,
      country: user.country,
      state: user.state,
      city: user.city,
      postalCode: user.postal_code,
      fatherName: user.father_name,
      dob: user.dob,
      sex: user.sex,
      schoolName: user.school_name,
      standard: user.standard,
      grade: user.grade,
      photoUrl: user.photo_url,
      courses: ensureArray<string>(user.courses as string[] | string | null | undefined),
      courseExpertise: ensureArray<string>(user.course_expertise as string[] | string | null | undefined),
      preferredTimings: ensureArray<User['preferredTimings'][number]>(user.preferred_timings as any),
      availableTimeSlots: ensureArray<User['availableTimeSlots'][number]>(user.available_time_slots as any),
      educationalQualifications: user.educational_qualifications,
      employmentType: user.employment_type,
      yearsOfExperience: user.years_of_experience,
      dateOfJoining: user.date_of_joining,
      schedules: user.schedules || [],
      documents: user.documents || [],
      isDeleted: user.is_deleted,
      notes: user.notes
    }));
  } catch (error) {
    console.error('Error in getUsersByIds:', error);
    return [];
  }
};

export const addBatch = async (batchData: Partial<Batch>): Promise<Batch> => {
  try {
    const insertData: any = {
      batch_name: batchData.name,
      schedule: batchData.schedule || [],
      max_students: batchData.capacity,
      mode: batchData.mode,
      student_ids: []
    };

    // Only add course_id if courseId is provided and not empty
    if (batchData.courseId && batchData.courseId.trim() !== '') {
      insertData.course_id = batchData.courseId;
    }

    // Only add teacher_id if teacherId is provided and not empty
    if (batchData.teacherId && typeof batchData.teacherId === 'string' && batchData.teacherId.trim() !== '') {
      insertData.teacher_id = batchData.teacherId;
    }

    // Add dates if provided
    if (batchData.startDate) {
      insertData.start_date = batchData.startDate;
    }

    if (batchData.endDate) {
      insertData.end_date = batchData.endDate;
    }

    const response = await fetch('/api/batches', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(insertData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error adding batch:', errorText);
      throw new Error(`Failed to add batch: ${errorText || response.statusText}`);
    }

    const data = await response.json();

    return {
      id: String(data.id),
      name: data.name,
      description: data.description,
      courseId: data.course_id,
      courseName: '',
      teacherId: data.teacher_id,
      schedule: data.schedule || [],
      capacity: data.capacity,
      enrolled: 0,
      mode: data.mode,
      locationId: data.location_id,
      startDate: data.start_date,
      endDate: data.end_date,
      isActive: data.is_active !== false
    };
  } catch (error) {
    console.error('Error in addBatch:', error);
    throw error;
  }
};

export const updateBatch = async (batchId: string, batchData: Partial<Batch>): Promise<Batch> => {
  try {
    // Get the current batch data to compare changes
    const batchResponse = await fetch(`/api/batches/${batchId}`, {
      method: 'GET',
      credentials: 'include'
    });

    const currentBatch = batchResponse.ok ? await batchResponse.json() : null;

    // Extract all student IDs from schedule for server-side notifications
    const allStudentIds: string[] = [];
    if (Array.isArray(batchData.schedule)) {
      batchData.schedule.forEach((scheduleItem: any) => {
        if (scheduleItem.studentIds && Array.isArray(scheduleItem.studentIds)) {
          allStudentIds.push(...scheduleItem.studentIds);
        }
      });
    }
    const uniqueStudentIds = [...new Set(allStudentIds)].map(id => parseInt(id, 10)).filter(id => !isNaN(id));

    const response = await fetch(`/api/batches/${batchId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_name: batchData.name,
        description: batchData.description,
        course_id: batchData.courseId,
        teacher_id: batchData.teacherId,
        schedule: batchData.schedule,
        max_students: batchData.capacity,
        student_ids: uniqueStudentIds,
        mode: batchData.mode,
        location_id: batchData.locationId,
        start_date: batchData.startDate,
        end_date: batchData.endDate,
        is_active: batchData.isActive,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error updating batch:', errorText);
      throw new Error(`Failed to update batch: ${errorText || response.statusText}`);
    }

    const data = await response.json();

    // Send batch allocation notifications for newly added students
    if (batchData.schedule && currentBatch) {
      try {
        const currentStudentIds = new Set<string>();
        const newStudentIds = new Set<string>();

        // Get current student IDs
        if (currentBatch.schedule && Array.isArray(currentBatch.schedule)) {
          currentBatch.schedule.forEach((scheduleItem: any) => {
            if (scheduleItem.studentIds) {
              scheduleItem.studentIds.forEach((id: string) => currentStudentIds.add(id));
            }
          });
        }

        // Get new student IDs
        if (Array.isArray(batchData.schedule)) {
          batchData.schedule.forEach((scheduleItem: any) => {
            if (scheduleItem.studentIds) {
              scheduleItem.studentIds.forEach((id: string) => newStudentIds.add(id));
            }
          });
        }

        // Find newly added students
        const newlyAddedStudents = Array.from(newStudentIds).filter(id => !currentStudentIds.has(id));

        // Send notifications for newly added students
        for (const studentId of newlyAddedStudents) {
          const courseName = data.courses?.name || 'Course';
          const teacherName = data.users?.name || 'Teacher';
          const batchName = data.name || 'Batch';
          
          // Create timing string from schedule
          let timing = 'Schedule not set';
          if (Array.isArray(batchData.schedule)) {
            const studentSchedule = batchData.schedule.find((scheduleItem: any) => 
              scheduleItem.studentIds && scheduleItem.studentIds.includes(studentId)
            );
            if (studentSchedule?.timing) {
              timing = studentSchedule.timing;
            }
          }

          await notificationService.notifyBatchAllocation(
            studentId,
            batchName,
            courseName,
            teacherName,
            timing,
            data.teacher_id
          );
        }
      } catch (notificationError) {
        console.error('Failed to send batch allocation notification:', notificationError);
        // Don't fail the batch update if notification fails
      }
    }

    return {
      id: String(data.id),
      name: data.name,
      description: data.description,
      courseId: data.course_id,
      courseName: data.courses?.name || '',
      teacherId: data.teacher_id,
      schedule: data.schedule || [],
      capacity: data.capacity,
      enrolled: data.enrolled || 0,
      mode: data.mode,
      locationId: data.location_id,
      startDate: data.start_date,
      endDate: data.end_date,
      isActive: data.is_active !== false
    };
  } catch (error) {
    console.error('Error in updateBatch:', error);
    throw error;
  }
};

export const deleteBatch = async (batchId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/batches/${batchId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error deleting batch:', errorText);
      throw new Error(`Failed to delete batch: ${errorText || response.statusText}`);
    }
  } catch (error) {
    console.error('Error in deleteBatch:', error);
    throw error;
  }
};

// Notification functions
export const getNotifications = async (): Promise<Notification[]> => {
  try {
    const currentUserData = await getCurrentUser();
    if (!currentUserData) {
      return [];
    }

    const response = await fetch(`/api/notifications/${currentUserData.id}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching notifications:', response.statusText);
      return [];
    }

    const data = await response.json();

    return (data || []).map(notification => ({
      id: String(notification.id),
      userId: notification.user_id,
      subject: notification.subject,
      message: notification.message,
      read: notification.read,
      createdAt: notification.created_at,
      link: notification.link
    }));
  } catch (error) {
    console.error('Error in getNotifications:', error);
    return [];
  }
};
export const markNotificationAsRead = async (notificationId: string): Promise<Notification> => {
  try {
    const response = await fetch(`/api/notifications/${notificationId}/mark-read`, {
      method: 'PUT',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error marking notification as read:', errorText);
      throw new Error(`Failed to mark notification as read: ${errorText || response.statusText}`);
    }

    const data = await response.json();

    return {
      id: String(data.id),
      userId: data.user_id,
      subject: data.subject,
      message: data.message,
      read: data.read,
      createdAt: data.created_at,
      link: data.link
    };
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    throw error;
  }
};

// Fee management functions
export const getFeeStructures = async (): Promise<FeeStructure[]> => {
  try {
    const response = await fetch('/api/fee-structures', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching fee structures:', response.statusText);
      return [];
    }

    const data = await response.json();

    return (data || []).map((fee: any) => ({
      id: String(fee.id),
      courseId: fee.course_id,
      courseName: fee.course_name,
      amount: fee.amount,
      currency: fee.currency,
      billingCycle: fee.billing_cycle
    }));
  } catch (error) {
    console.error('Error in getFeeStructures:', error);
    return [];
  }
};
export const addFeeStructure = async (structureData: Omit<FeeStructure, 'id'>): Promise<FeeStructure> => {
  try {
    const response = await fetch('/api/fee-structures', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: structureData.courseId,
        mode: null,
        monthly_fee: structureData.billingCycle === 'Monthly' ? structureData.amount : null,
        quarterly_fee: structureData.billingCycle === 'Quarterly' ? structureData.amount : null,
        half_yearly_fee: structureData.billingCycle === 'Half-Yearly' ? structureData.amount : null,
        annual_fee: structureData.billingCycle === 'Annual' ? structureData.amount : null
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error adding fee structure:', errorText);
      throw new Error(`Failed to add fee structure: ${errorText || response.statusText}`);
    }

    const data = await response.json();

    return {
      id: String(data.id),
      courseId: data.course_id,
      courseName: data.course_name,
      amount: data.amount,
      currency: data.currency,
      billingCycle: data.billing_cycle
    };
  } catch (error) {
    console.error('Error in addFeeStructure:', error);
    throw error;
  }
};
export const updateFeeStructure = async (structureId: string, structureData: Partial<FeeStructure>): Promise<FeeStructure> => {
  try {
    const updateData: any = {};
    if (structureData.courseId !== undefined) updateData.course_id = structureData.courseId;
    if (structureData.courseName !== undefined) updateData.course_name = structureData.courseName;
    if (structureData.amount !== undefined) updateData.amount = structureData.amount;
    if (structureData.currency !== undefined) updateData.currency = structureData.currency;
    if (structureData.billingCycle !== undefined) updateData.billing_cycle = structureData.billingCycle;
    updateData.updated_at = new Date().toISOString();

    const response = await fetch(`/api/fee-structures/${structureId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error updating fee structure:', errorText);
      throw new Error(`Failed to update fee structure: ${errorText || response.statusText}`);
    }

    const data = await response.json();

    return {
      id: String(data.id),
      courseId: data.course_id,
      courseName: data.course_name,
      amount: data.amount,
      currency: data.currency,
      billingCycle: data.billing_cycle
    };
  } catch (error) {
    console.error('Error in updateFeeStructure:', error);
    throw error;
  }
};
export const deleteFeeStructure = async (structureId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/fee-structures/${structureId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error deleting fee structure:', errorText);
      throw new Error(`Failed to delete fee structure: ${errorText || response.statusText}`);
    }
  } catch (error) {
    console.error('Error in deleteFeeStructure:', error);
    throw error;
  }
};
export const getAdminInvoices = async (): Promise<Invoice[]> => {
  try {
    const response = await fetch('/api/invoices', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching invoices:', response.statusText);
      return [];
    }

    const data = await response.json();

    return (data || []).map((invoice: any) => ({
      id: String(invoice.id),
      studentId: invoice.student_id,
      student: invoice.student ? {
        id: invoice.student.id,
        name: invoice.student.name,
        email: invoice.student.email
      } : null,
      feeStructureId: invoice.fee_structure_id,
      courseName: invoice.course_name,
      amount: invoice.amount,
      currency: invoice.currency,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      billingPeriod: invoice.billing_period,
      status: invoice.status,
      paymentDetails: invoice.payment_details
    }));
  } catch (error) {
    console.error('Error in getAdminInvoices:', error);
    return [];
  }
};
export const generateInvoices = async (): Promise<{ message: string }> => ({ message: 'Invoices generated' });
export const recordPayment = async (invoiceId: string, paymentData: PaymentDetails): Promise<Invoice> => ({ id: invoiceId } as Invoice);

// Student functions
export const getStudentInvoices = async (): Promise<Invoice[]> => {
  if (typeof window !== 'undefined') {
    const currentUserData = localStorage.getItem('currentUser');
    if (currentUserData) {
      const currentUser = JSON.parse(currentUserData);
      const invoices = localStorage.getItem('invoices');
      if (invoices) {
        const allInvoices = JSON.parse(invoices);
        return allInvoices.filter((inv: Invoice) => inv.studentId === currentUser.id);
      }
    }
  }
  return [];
};
export const getStudentEnrollments = async (): Promise<StudentEnrollment[]> => {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return [];
    }

    // Use the family function for the current user
    return await getStudentEnrollmentsForFamily(currentUser.id);
  } catch (error) {
    console.error('Error getting student enrollments:', error);
    
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const currentUserData = localStorage.getItem('currentUser');
      if (currentUserData) {
        const currentUser = JSON.parse(currentUserData);
        const enrollments = localStorage.getItem('enrollments');
        if (enrollments) {
          const allEnrollments = JSON.parse(enrollments);
          return allEnrollments.filter((enr: StudentEnrollment) => enr.studentId === currentUser.id);
        }
      }
    }
    return [];
  }
};

// Family functions
export const getFamilyStudents = async (): Promise<User[]> => {
  try {
    if (typeof window !== 'undefined') {
      const currentUserData = localStorage.getItem('currentUser');
      if (currentUserData) {
        const currentUser = JSON.parse(currentUserData);
        
        // Query database for family students
        const response = await fetch('/api/users', {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          console.error('Error fetching family students:', response.statusText);
          return [];
        }

        const data = await response.json();
        
        // Find students that belong to this family
        const familyStudents = (data || []).filter((user: any) => {
          // Skip temp emails from failed registrations
          if (user.email?.startsWith('temp')) {
            return false;
          }
          
          // Check if this student belongs to current user's family
          const studentEmailBase = user.email?.split('+')[0]?.split('@')[0]; 
          const currentUserEmailBase = currentUser.email?.split('+')[0]?.split('@')[0]; 
          
          return studentEmailBase === currentUserEmailBase || user.email === currentUser.email;
        });
        
        // Map database fields to User interface
        return familyStudents.map((user: any) => {
          console.log('Raw user data from database:', user);
          const mappedUser = {
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: user.role,
            classPreference: user.class_preference,
            contactNumber: user.contact_number,
            address: user.address,
            country: user.country,
            state: user.state,
            city: user.city,
            postalCode: user.postal_code,
            fatherName: user.father_name,
            dob: user.dob,
            sex: user.sex,
            schoolName: user.school_name,
            standard: user.standard,
            grade: user.grade,
            photoUrl: user.photo_url,
            courses: user.courses || [],
            courseExpertise: user.course_expertise || [],
            preferredTimings: user.preferred_timings || [], // correct field mapping
            dateOfJoining: user.date_of_joining,
            notes: user.notes,
            educationalQualifications: user.educational_qualifications,
            employmentType: user.employment_type,
            schedules: user.schedules || [],
            documents: user.documents || []
          };
          console.log('Mapped user data:', mappedUser);
          return mappedUser;
        });
      }
    }
    return [];
  } catch (error) {
    console.error('Error in getFamilyStudents:', error);
    return [];
  }
};

export const getStudentInvoicesForFamily = async (studentId: string): Promise<Invoice[]> => {
  if (typeof window !== 'undefined') {
    const invoices = localStorage.getItem('invoices');
    if (invoices) {
      const allInvoices = JSON.parse(invoices);
      return allInvoices.filter((inv: Invoice) => inv.studentId === studentId);
    }
  }
  return [];
};

export const getStudentEnrollmentsForFamily = async (studentId: string): Promise<StudentEnrollment[]> => {
  try {
    // Get all batches from Supabase
    const batches = await getBatches();
    const enrollments: StudentEnrollment[] = [];
    
    // Find batches where this student is enrolled
    for (const batch of batches) {
      if (batch.schedule && Array.isArray(batch.schedule)) {
        // Check if student is in ANY schedule of this batch
        const studentSchedules = batch.schedule.filter(scheduleItem => 
          scheduleItem.studentIds && scheduleItem.studentIds.includes(studentId)
        );
        
        // If student is in this batch, create ONE enrollment with all timings
        if (studentSchedules.length > 0) {
          console.log('DEBUG: Batch name:', batch.name);
          console.log('DEBUG: Batch schedule data:', batch.schedule);
          console.log('DEBUG: Student schedules found:', studentSchedules);
          
          const timings = studentSchedules.map(scheduleItem => {
            console.log('DEBUG: Processing schedule item:', scheduleItem);
            // Use the timing property directly if it exists, otherwise try legacy day:timeSlot format
            if (scheduleItem.timing) {
              return scheduleItem.timing;
            } else if ((scheduleItem as any).day && (scheduleItem as any).timeSlot) {
              return `${(scheduleItem as any).day}: ${(scheduleItem as any).timeSlot}`;
            } else {
              return null;
            }
          }).filter(timing => timing && !timing.includes('undefined'));
          
          console.log('DEBUG: Final timings:', timings);
          
          enrollments.push({
            studentId: studentId,
            batchName: batch.name,
            courseName: batch.courseName,
            timings: timings.length > 0 ? timings : ['Schedule not set'],
            teacher: batch.teacherId ? {
              id: typeof batch.teacherId === 'string' ? batch.teacherId : (batch.teacherId as any)?.id || 'unknown',
              name: batch.teacherName || 'Unknown Teacher'
            } : null,
            mode: batch.mode
          });
        }
      }
    }
    
    return enrollments;
  } catch (error) {
    console.error('Error getting student enrollments:', error);
    
    // Fallback to localStorage if Supabase fails
    if (typeof window !== 'undefined') {
      const enrollments = localStorage.getItem('enrollments');
      if (enrollments) {
        const allEnrollments = JSON.parse(enrollments);
        return allEnrollments.filter((enr: StudentEnrollment) => enr.studentId === studentId);
      }
    }
    return [];
  }
};

// Trash functions
export const getTrashedUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch('/api/users/trashed/all', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching trashed users:', response.statusText);
      return [];
    }

    const data = await response.json();

    return (data || []).map(user => ({
      id: String(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      classPreference: user.class_preference,
      photoUrl: user.photo_url,
      dob: user.dob ? new Date(user.dob) : undefined,
      sex: user.sex,
      contactNumber: user.contact_number,
      alternateContactNumber: user.alternate_contact_number,
      address: user.address,
      country: user.country,
      state: user.state,
      city: user.city,
      postalCode: user.postal_code,
      timezone: user.timezone,
      preferredTimings: user.preferred_timings || [],
      status: user.status,
      locationId: user.location_id,
      courses: user.courses || [],
      fatherName: user.father_name,
      standard: user.standard,
      schoolName: user.school_name,
      grade: user.grade,
      notes: user.notes,
      schedules: user.schedules || [],
      documents: user.documents || [],
      courseExpertise: user.course_expertise || [],
      educationalQualifications: user.educational_qualifications,
      employmentType: user.employment_type,
      yearsOfExperience: user.years_of_experience,
      availableTimeSlots: user.available_time_slots || [],
      dateOfJoining: user.date_of_joining ? new Date(user.date_of_joining) : undefined,
      createdAt: new Date(user.created_at),
      updatedAt: user.updated_at ? new Date(user.updated_at) : undefined
    }));
  } catch (error) {
    console.error('Error in getTrashedUsers:', error);
    return [];
  }
};

export const restoreUser = async (userId: string): Promise<User> => {
  try {
    const response = await fetch(`/api/users/${userId}/restore`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error restoring user:', errorText);
      throw new Error(`Failed to restore user: ${errorText || response.statusText}`);
    }

    const data = await response.json();

    return {
      id: String(data.id),
      name: data.name,
      email: data.email,
      role: data.role,
      classPreference: data.class_preference,
      photoUrl: data.photo_url,
      dob: data.dob ? new Date(data.dob) : undefined,
      sex: data.sex,
      contactNumber: data.contact_number,
      alternateContactNumber: data.alternate_contact_number,
      address: data.address,
      country: data.country,
      state: data.state,
      city: data.city,
      postalCode: data.postal_code,
      timezone: data.timezone,
      preferredTimings: data.preferred_timings || [],
      status: data.status,
      locationId: data.location_id,
      courses: data.courses || [],
      fatherName: data.father_name,
      standard: data.standard,
      schoolName: data.school_name,
      grade: data.grade,
      notes: data.notes,
      schedules: data.schedules || [],
      documents: data.documents || [],
      courseExpertise: data.course_expertise || [],
      educationalQualifications: data.educational_qualifications,
      employmentType: data.employment_type,
      yearsOfExperience: data.years_of_experience,
      availableTimeSlots: data.available_time_slots || [],
      dateOfJoining: data.date_of_joining ? new Date(data.date_of_joining) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
    };
  } catch (error) {
    console.error('Error in restoreUser:', error);
    throw error;
  }
};

export const deleteUserPermanently = async (userId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/users/${userId}/permanent`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error permanently deleting user:', errorText);
      throw new Error(`Failed to permanently delete user: ${errorText || response.statusText}`);
    }

    console.log('User permanently deleted:', userId);
  } catch (error) {
    console.error('Error in deleteUserPermanently:', error);
    throw error;
  }
};

// Location functions
export const getPublicLocations = async (): Promise<Location[]> => {
  try {
    // Use Express API instead of Supabase
    const response = await fetch('/api/locations');

    if (!response.ok) {
      console.error('Error fetching locations:', response.statusText);
      // If API fails, try to initialize basic locations
      return await initializeBasicLocations();
    }

    const data = await response.json();

    // If no locations in database, initialize basic ones
    if (!data || data.length === 0) {
      return await initializeBasicLocations();
    }

    return data.map(location => ({
      id: String(location.id),
      name: location.name,
      address: location.address
    }));

  } catch (error) {
    console.error('Error in getPublicLocations:', error);
    return await initializeBasicLocations();
  }
};

// Helper function to initialize basic locations in database
const initializeBasicLocations = async (): Promise<Location[]> => {
  const basicLocations = [
    {
      name: 'Main Center',
      address: 'Enter your main location address',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      name: 'Branch 1', 
      address: 'Enter branch location address',
      is_active: true,
      created_at: new Date().toISOString()
    }
  ];

  try {
    const response = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ locations: basicLocations })
    });

    if (!response.ok) {
      console.error('Error initializing locations');
      // Return basic locations with generated IDs as fallback
      return basicLocations.map((location, index) => ({
        id: `loc-${index + 1}`,
        name: location.name,
        address: location.address
      }));
    }

    const data = await response.json();
    return data.map(location => ({
      id: String(location.id),
      name: location.name,
      address: location.address
    }));

  } catch (error) {
    console.error('Error in initializeBasicLocations:', error);
    // Return basic locations with generated IDs as fallback
    return basicLocations.map((location, index) => ({
      id: `loc-${index + 1}`,
      name: location.name,
      address: location.address
    }));
  }
};

export const getLocations = async (): Promise<Location[]> => getPublicLocations();

export const addLocation = async (location: Omit<Location, 'id'>): Promise<Location> => {
  try {
    const response = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: location.name,
        address: location.address,
        city: null,
        state: null,
        postal_code: null,
        country: null,
        phone: null,
        email: null,
        is_active: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to add location: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return {
      id: String(data.id),
      name: data.name,
      address: data.address
    };
  } catch (error) {
    console.error('Error in addLocation:', error);
    throw error;
  }
};

export const updateLocation = async (id: string, location: Partial<Location>): Promise<Location> => {
  try {
    const response = await fetch(`/api/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: location.name,
        address: location.address
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to update location: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return {
      id: String(data.id),
      name: data.name,
      address: data.address
    };
  } catch (error) {
    console.error('Error in updateLocation:', error);
    throw error;
  }
};

export const deleteLocation = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/locations/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to delete location: ${errorData.error || response.statusText}`);
    }
  } catch (error) {
    console.error('Error in deleteLocation:', error);
    throw error;
  }
};

// Content functions
export const getEvents = async (limit?: number): Promise<Event[]> => {
  try {
    const url = limit ? `/api/events?limit=${limit}` : '/api/events';
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching events');
      return [];
    }

    const data = await response.json();
    return (data || []).map(event => ({
      id: String(event.id),
      title: event.title,
      description: event.description,
      date: new Date(event.event_date || event.date),
      time: event.event_time || event.time,
      location: event.location,
      isPublic: event.is_public,
      createdAt: new Date(event.created_at),
      createdBy: event.created_by,
      targetAudience: event.target_audience || [],
      images: (event.event_images || event.images || []).map((img: any) => ({
        id: String(img.id),
        url: img.image_url || img.url,
        caption: img.caption,
        filename: img.filename,
        displayOrder: img.display_order
      })),
      isActive: event.is_active,
      priority: event.priority,
      eventType: event.event_type,
      updatedAt: event.updated_at ? new Date(event.updated_at) : undefined
    }));
  } catch (error) {
    console.error('Error in getEvents:', error);
    return [];
  }
};

export const getAdminEvents = async (): Promise<Event[]> => getEvents();

export const getPublicEvents = async (): Promise<Event[]> => {
  try {
    const response = await fetch('/api/events?public=true', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching public events');
      return [];
    }

    const data = await response.json();
    return data?.map(event => ({
      id: String(event.id),
      title: event.title,
      description: event.description,
      date: new Date(event.event_date || event.date),
      time: event.event_time || event.time,
      location: event.location,
      isPublic: event.is_public,
      createdAt: new Date(event.created_at),
      updatedAt: event.updated_at ? new Date(event.updated_at) : undefined
    })) || [];
  } catch (error) {
    console.error('Error in getPublicEvents:', error);
    return [];
  }
};

export const addEvent = async (event: Omit<Event, 'id'>): Promise<Event> => {
  try {
    const currentUser = getCurrentUser();
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: event.title,
        description: event.description,
        event_date: event.date instanceof Date ? event.date.toISOString().split('T')[0] : new Date(event.date).toISOString().split('T')[0],
        event_time: event.time,
        location: event.location,
        is_public: event.isActive !== undefined ? event.isActive : true,
        recipient_ids: event.targetAudience || [],
        image_url: event.images && event.images.length > 0 ? event.images[0] : null
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to add event: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    const eventResult = {
      id: String(data.id),
      title: data.title,
      description: data.description,
      date: new Date(data.event_date),
      time: data.event_time,
      location: data.location,
      createdBy: data.created_by,
      targetAudience: data.target_audience || [],
      images: data.images || [],
      isActive: data.is_active,
      priority: data.priority,
      eventType: data.event_type,
      createdAt: new Date(data.created_at)
    };

    // Send event notifications to target audience
    try {
      let recipientIds: string[] = [];

      // Determine recipients based on target audience
      if (event.targetAudience && event.targetAudience.length > 0) {
        for (const audience of event.targetAudience) {
          switch (audience) {
            case 'All Students':
              const allStudents = await notificationService.getAllStudents();
              recipientIds = [...recipientIds, ...allStudents];
              break;
            case 'All Teachers':
              // Get teachers via API
              const teachersResponse = await fetch('/api/users?role=Teacher', {
                method: 'GET',
                credentials: 'include'
              });
              if (teachersResponse.ok) {
                const teachers = await teachersResponse.json();
                recipientIds = [...recipientIds, ...teachers.map(t => t.id)];
              }
              break;
            default:
              // Handle specific batch/course targeting if needed
              break;
          }
        }
      } else {
        // If no specific audience, notify all students
        const allStudents = await notificationService.getAllStudents();
        recipientIds = allStudents;
      }

      // Remove duplicates
      recipientIds = Array.from(new Set(recipientIds));

      if (recipientIds.length > 0) {
        await notificationService.notifyEvent(eventResult, recipientIds);
      }
    } catch (notificationError) {
      console.error('Failed to send event notification:', notificationError);
      // Don't fail the event creation if notification fails
    }

    return eventResult;
  } catch (error) {
    console.error('Error in addEvent:', error);
    throw error;
  }
};

export const updateEvent = async (id: string, event: Partial<Event>): Promise<Event> => {
  try {
    const updateData: any = {};
    if (event.title) updateData.title = event.title;
    if (event.description) updateData.description = event.description;
    if (event.date) updateData.event_date = event.date instanceof Date ? event.date.toISOString() : new Date(event.date).toISOString();
    if (event.time) updateData.event_time = event.time;
    if (event.location) updateData.location = event.location;
    if (event.isPublic !== undefined) updateData.is_public = event.isPublic;

    const response = await fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to update event: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return {
      id: String(data.id),
      title: data.title,
      description: data.description,
      date: new Date(data.event_date || data.date),
      time: data.event_time || data.time,
      location: data.location,
      isPublic: data.is_public,
      createdAt: new Date(data.created_at)
    };
  } catch (error) {
    console.error('Error in updateEvent:', error);
    throw error;
  }
};

export const deleteEvent = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to delete event: ${errorData.error || response.statusText}`);
    }
  } catch (error) {
    console.error('Error in deleteEvent:', error);
    throw error;
  }
};

export const getGradeExams = async (): Promise<GradeExam[]> => {
  try {
    const response = await fetch('/api/grade-exams', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching grade exams');
      return [];
    }

    const data = await response.json();
    return (data || []).map(exam => ({
      id: String(exam.id),
      title: exam.title,
      description: exam.description,
      date: new Date(exam.date),
      time: exam.time,
      duration: exam.duration,
      course: exam.course,
      grade: exam.grade,
      syllabusUrl: exam.syllabus_url,
      registrationFee: exam.registration_fee,
      registrationDeadline: exam.registration_deadline ? new Date(exam.registration_deadline) : undefined,
      isOpen: exam.is_open,
      createdAt: new Date(exam.created_at)
    }));
  } catch (error) {
    console.error('Error in getGradeExams:', error);
    return [];
  }
};

export const getAdminGradeExams = async (): Promise<GradeExam[]> => getGradeExams();

export const addGradeExam = async (exam: Omit<GradeExam, 'id'>): Promise<GradeExam> => {
  try {
    const response = await fetch('/api/grade-exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        exam_name: exam.title,
        course: exam.course || '',
        exam_date: (() => {
          if (!exam.date) return null;
          const dateObj = exam.date instanceof Date ? exam.date : new Date(exam.date);
          return isNaN(dateObj.getTime()) ? null : dateObj.toISOString().split('T')[0];
        })(),
        exam_time: exam.time || null,
        location: exam.location || '',
        syllabus: exam.syllabusUrl || '',
        recipient_ids: exam.recipientIds || []
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to add grade exam: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    const examResult = {
      id: String(data.id),
      title: data.title,
      description: data.description,
      date: new Date(data.date),
      time: data.time,
      duration: data.duration,
      course: data.course,
      grade: data.grade,
      syllabusUrl: data.syllabus_url,
      registrationFee: data.registration_fee,
      registrationDeadline: data.registration_deadline ? new Date(data.registration_deadline) : undefined,
      isOpen: data.is_open,
      createdAt: new Date(data.created_at)
    };

    // Send notifications for grade exam
    try {
      // Get all students enrolled in this course via API
      const studentsResponse = await fetch(`/api/users?role=Student&course=${encodeURIComponent(exam.course)}`, {
        method: 'GET',
        credentials: 'include'
      });
      const enrolledStudents = studentsResponse.ok ? await studentsResponse.json() : [];
      const studentIds = enrolledStudents.map(s => s.id) || [];

      // Also notify admin and teachers teaching this course
      const adminIds = await notificationService.getAdminUsers();

      const teachersResponse = await fetch(`/api/users?role=Teacher&course_expertise=${encodeURIComponent(exam.course)}`, {
        method: 'GET',
        credentials: 'include'
      });
      const teachersData = teachersResponse.ok ? await teachersResponse.json() : [];
      const teacherIds = teachersData.map(t => t.id) || [];

      const allRecipients = [...studentIds, ...adminIds, ...teacherIds];

      for (const recipientId of allRecipients) {
        await notificationService.sendNotification({
          type: 'event',
          title: `New Grade Exam: ${exam.title}`,
          message: `A new grade exam "${exam.title}" has been scheduled for ${exam.course}. Date: ${exam.date}. Registration fee: ₹${exam.registrationFee}. Please register before ${exam.registrationDeadline}.`,
          recipientId,
          relatedEntityId: data.id,
          relatedEntityType: 'event',
          emailRequired: true,
          priority: 'high'
        });
      }
    } catch (notificationError) {
      console.error('Failed to send grade exam notification:', notificationError);
      // Don't fail the exam creation if notification fails
    }

    return examResult;
  } catch (error) {
    console.error('Error in addGradeExam:', error);
    throw error;
  }
};

export const updateGradeExam = async (id: string, exam: Partial<GradeExam>): Promise<GradeExam> => {
  try {
    const updateData: any = {};
    if (exam.title) updateData.title = exam.title;
    if (exam.description) updateData.description = exam.description;
    if (exam.date) updateData.date = exam.date instanceof Date ? exam.date.toISOString() : new Date(exam.date).toISOString();
    if (exam.time) updateData.time = exam.time;
    if (exam.duration) updateData.duration = exam.duration;
    if (exam.course) updateData.course = exam.course;
    if (exam.grade) updateData.grade = exam.grade;
    if (exam.syllabusUrl) updateData.syllabus_url = exam.syllabusUrl;
    if (exam.registrationFee !== undefined) updateData.registration_fee = exam.registrationFee;
    if (exam.registrationDeadline) updateData.registration_deadline = exam.registrationDeadline instanceof Date ? exam.registrationDeadline.toISOString() : new Date(exam.registrationDeadline).toISOString();
    if (exam.isOpen !== undefined) updateData.is_open = exam.isOpen;

    const response = await fetch(`/api/grade-exams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to update grade exam: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return {
      id: String(data.id),
      title: data.title,
      description: data.description,
      date: new Date(data.date),
      time: data.time,
      duration: data.duration,
      course: data.course,
      grade: data.grade,
      syllabusUrl: data.syllabus_url,
      registrationFee: data.registration_fee,
      registrationDeadline: data.registration_deadline ? new Date(data.registration_deadline) : undefined,
      isOpen: data.is_open,
      createdAt: new Date(data.created_at)
    };
  } catch (error) {
    console.error('Error in updateGradeExam:', error);
    throw error;
  }
};

export const deleteGradeExam = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/grade-exams/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to delete grade exam: ${errorData.error || response.statusText}`);
    }
  } catch (error) {
    console.error('Error in deleteGradeExam:', error);
    throw error;
  }
};

export const getBookMaterials = async (): Promise<BookMaterial[]> => {
  try {
    const response = await fetch('/api/book-materials', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching book materials');
      return [];
    }

    const data = await response.json();
    return (data || []).map(material => ({
      id: String(material.id),
      title: material.title,
      description: material.description,
      courseId: material.course_id,
      courseName: material.course_name,
      type: material.type,
      url: material.url,
      fileUrl: material.url, // Add fileUrl for compatibility
      linkUrl: material.url, // Add linkUrl for compatibility
      data: material.data,
      recipientIds: material.recipient_ids || [],
      uploadedAt: material.created_at // Add uploadedAt for compatibility
    }));
  } catch (error) {
    console.error('Error in getBookMaterials:', error);
    return [];
  }
};

export const getAdminBookMaterials = async (): Promise<BookMaterial[]> => getBookMaterials();
export const addBookMaterial = async (material: Omit<BookMaterial, 'id'>): Promise<BookMaterial> => {
  try {
    const insertData: any = {
      title: material.title,
      description: material.description,
      file_type: material.type,
      file_url: material.url,
      course: material.courseName || null
    };

    // Add recipient_ids if provided
    if (material.recipientIds && material.recipientIds.length > 0) {
      insertData.recipient_ids = material.recipientIds;
    } else {
      insertData.recipient_ids = [];
    }

    const response = await fetch('/api/book-materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(insertData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to add book material: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    const materialResult = {
      id: String(data.id),
      title: data.title,
      description: data.description,
      courseId: data.course_id,
      courseName: data.course_name,
      type: data.type,
      url: data.url,
      data: data.data,
      recipientIds: data.recipient_ids || []
    };

    // Send book material notifications
    try {
      let recipientIds: string[] = [];

      // Use specific recipient IDs if provided
      if (material.recipientIds && material.recipientIds.length > 0) {
        recipientIds = material.recipientIds;
      } else {
        // If no specific recipients, notify all students
        recipientIds = await notificationService.getAllStudents();
      }

      if (recipientIds.length > 0) {
        await notificationService.notifyBookMaterial(materialResult, recipientIds);
      }
    } catch (notificationError) {
      console.error('Failed to send book material notification:', notificationError);
      // Don't fail the material creation if notification fails
    }

    return materialResult;
  } catch (error) {
    console.error('Error in addBookMaterial:', error);
    throw error;
  }
};
export const updateBookMaterial = async (id: string, material: Partial<BookMaterial>): Promise<BookMaterial> => {
  try {
    const updateData: any = {};
    if (material.title !== undefined) updateData.title = material.title;
    if (material.description !== undefined) updateData.description = material.description;
    if (material.courseId !== undefined) updateData.course_id = material.courseId;
    if (material.courseName !== undefined) updateData.course_name = material.courseName;
    if (material.type !== undefined) updateData.type = material.type;
    if (material.url !== undefined) updateData.url = material.url;
    if (material.data !== undefined) updateData.data = material.data;
    if (material.recipientIds !== undefined) updateData.recipient_ids = material.recipientIds;

    const response = await fetch(`/api/book-materials/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to update book material: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return {
      id: String(data.id),
      title: data.title,
      description: data.description,
      courseId: data.course_id,
      courseName: data.course_name,
      type: data.type,
      url: data.url,
      data: data.data,
      recipientIds: data.recipient_ids || []
    };
  } catch (error) {
    console.error('Error in updateBookMaterial:', error);
    throw error;
  }
};

export const deleteBookMaterial = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/book-materials/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to delete book material: ${errorData.error || response.statusText}`);
    }
  } catch (error) {
    console.error('Error in deleteBookMaterial:', error);
    throw error;
  }
};

// Send book material to specific recipients (students, groups, or batches)
export const sendBookMaterial = async (materialId: string, recipientIds: string[]): Promise<void> => {
  try {
    console.log('Sending book material to recipients:', materialId, recipientIds);

    const response = await fetch(`/api/book-materials/${materialId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        recipient_ids: recipientIds
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send book material: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    console.log('Book material sent successfully to recipients:', data);
  } catch (error) {
    console.error('Error in sendBookMaterial:', error);
    throw error;
  }
};

// Send event to specific recipients
export const sendEvent = async (eventId: string, recipientIds: string[]): Promise<void> => {
  try {
    console.log('Sending event to recipients:', eventId, recipientIds);

    const response = await fetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        recipient_ids: recipientIds
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send event: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    console.log('Event sent successfully to recipients:', data);
  } catch (error) {
    console.error('Error in sendEvent:', error);
    throw error;
  }
};

// Get events for a specific student with notification status
export const getStudentEvents = async (studentId: string): Promise<Event[]> => {
  try {
    // Get all active events via API
    const response = await fetch(`/api/events?studentId=${studentId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching student events');
      return [];
    }

    const data = await response.json();
    return (data || []).map(event => ({
      id: String(event.id),
      title: event.title,
      description: event.description,
      date: new Date(event.event_date || event.date),
      time: event.event_time || event.time,
      location: event.location,
      createdBy: event.created_by,
      targetAudience: event.target_audience || [],
      images: event.images || [], // Use the JSONB images field directly
      isActive: event.is_active,
      priority: event.priority,
      eventType: event.event_type,
      createdAt: new Date(event.created_at),
      updatedAt: event.updated_at ? new Date(event.updated_at) : undefined
    }));
  } catch (error) {
    console.error('Error in getStudentEvents:', error);
    return [];
  }
};

// Get event notifications for a user
export const getEventNotifications = async (userId: string): Promise<EventNotification[]> => {
  try {
    const response = await fetch(`/api/event-notifications/${userId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching event notifications');
      return [];
    }

    const data = await response.json();
    return (data || []).map(notification => ({
      id: String(notification.id),
      eventId: notification.event_id,
      userId: notification.user_id,
      isRead: notification.is_read,
      readAt: notification.read_at ? new Date(notification.read_at) : undefined,
      createdAt: new Date(notification.created_at),
      event: notification.events || notification.event ? {
        id: (notification.events || notification.event).id,
        title: (notification.events || notification.event).title,
        description: (notification.events || notification.event).description,
        date: new Date((notification.events || notification.event).event_date || (notification.events || notification.event).date),
        time: (notification.events || notification.event).event_time || (notification.events || notification.event).time,
        location: (notification.events || notification.event).location,
        priority: (notification.events || notification.event).priority,
        eventType: (notification.events || notification.event).event_type
      } : undefined
    }));
  } catch (error) {
    console.error('Error in getEventNotifications:', error);
    return [];
  }
};

// Mark event notification as read
export const markEventNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/event-notifications/${notificationId}/mark-read`, {
      method: 'PUT',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to mark notification as read: ${errorData.error || response.statusText}`);
    }
  } catch (error) {
    console.error('Error in markEventNotificationAsRead:', error);
    throw error;
  }
};

// Upload event image
export const uploadEventImage = async (eventId: string, file: File, caption?: string): Promise<EventImage> => {
  try {
    // Convert file to base64 for simple storage
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch('/api/event-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        event_id: eventId,
        image_url: base64,
        caption: caption || '',
        filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        display_order: 0
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to upload image: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return {
      id: String(data.id),
      url: data.image_url,
      caption: data.caption,
      filename: data.filename,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      displayOrder: data.display_order
    };
  } catch (error) {
    console.error('Error in uploadEventImage:', error);
    throw error;
  }
};

// Send grade exam to specific recipients
export const sendGradeExam = async (examId: string, recipientIds: string[]): Promise<void> => {
  try {
    console.log('Sending grade exam to recipients:', examId, recipientIds);

    const response = await fetch(`/api/grade-exams/${examId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        recipient_ids: recipientIds
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send grade exam: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    console.log('Grade exam sent successfully to recipients:', data);
  } catch (error) {
    console.error('Error in sendGradeExam:', error);
    throw error;
  }
};

// Send notice to specific recipients
export const sendNotice = async (noticeId: string, recipientIds: string[]): Promise<void> => {
  try {
    console.log('Sending notice to recipients:', noticeId, recipientIds);

    const response = await fetch(`/api/notices/${noticeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        recipient_ids: recipientIds
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send notice: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    console.log('Notice sent successfully to recipients:', data);
  } catch (error) {
    console.error('Error in sendNotice:', error);
    throw error;
  }
};

export const getNotices = async (limit?: number): Promise<Notice[]> => {
  try {
    const url = limit ? `/api/notices?limit=${limit}` : '/api/notices';
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching notices');
      return [];
    }

    const data = await response.json();
    return (data || []).map(notice => ({
      id: String(notice.id),
      title: notice.title,
      content: notice.content,
      targetAudience: notice.target_audience,
      type: 'Info', // Default type for UI compatibility
      courseName: null, // Default course name for UI compatibility
      recipientIds: notice.recipient_ids || [],
      issuedAt: notice.issued_at
    }));
  } catch (error) {
    console.error('Error in getNotices:', error);
    return [];
  }
};

export const getAdminNotices = async (): Promise<Notice[]> => getNotices();
export const addNotice = async (notice: Omit<Notice, 'id'>): Promise<Notice> => {
  try {
    const response = await fetch('/api/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: notice.title,
        content: notice.content,
        priority: 'normal',
        expiry_date: null,
        recipient_ids: []
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to add notice: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    const noticeResult = {
      id: String(data.id),
      title: data.title,
      content: data.content,
      issuedAt: data.issued_at,
      recipientIds: []
    };

    // Send notifications for new notice to all users
    try {
      const adminIds = await notificationService.getAdminUsers();
      const allStudents = await notificationService.getAllStudents();

      // Get all teachers
      const teachersResponse = await fetch('/api/users', {
        method: 'GET',
        credentials: 'include'
      });

      const teachersData = teachersResponse.ok ? await teachersResponse.json() : [];
      const teacherIds = teachersData.filter(t => t.role === 'Teacher').map(t => t.id) || [];

      // Notify all users about new notice
      const allUserIds = [...adminIds, ...allStudents, ...teacherIds];

      for (const userId of allUserIds) {
        await notificationService.sendNotification({
          type: 'general',
          title: `New Notice: ${notice.title}`,
          message: notice.content,
          recipientId: userId,
          relatedEntityId: data.id,
          emailRequired: true,
          priority: 'medium'
        });
      }
    } catch (notificationError) {
      console.error('Failed to send notice notification:', notificationError);
      // Don't fail the notice creation if notification fails
    }

    return noticeResult;
  } catch (error) {
    console.error('Error in addNotice:', error);
    throw error;
  }
};
export const updateNotice = async (id: string, notice: Partial<Notice>): Promise<Notice> => {
  try {
    const updateData: any = {};
    if (notice.title !== undefined) updateData.title = notice.title;
    if (notice.content !== undefined) updateData.content = notice.content;
    if (notice.issuedAt !== undefined) updateData.issued_at = notice.issuedAt;

    const response = await fetch(`/api/notices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to update notice: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return {
      id: String(data.id),
      title: data.title,
      content: data.content,
      issuedAt: data.issued_at,
      recipientIds: []
    };
  } catch (error) {
    console.error('Error in updateNotice:', error);
    throw error;
  }
};

export const deleteNotice = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`/api/notices/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to delete notice: ${errorData.error || response.statusText}`);
    }
  } catch (error) {
    console.error('Error in deleteNotice:', error);
    throw error;
  }
};

// Enhanced content notification with email support and database notifications
export const sendContentNotification = async (payload: {
  contentId: string;
  contentType: string;
  userIds: string[];
  subject: string;
  message: string;
  sendWhatsApp?: boolean;
  sendEmail?: boolean;
}): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Sending content notifications:', payload);

    // Create notifications in database for each recipient
    const notifications = payload.userIds.map(userId => ({
      user_id: userId,
      recipient_id: userId, // For compatibility with both column names
      title: payload.subject,
      message: payload.message,
      type: 'Info' as const,
      is_read: false
    }));

    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ notifications })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create notifications: ${errorData.error || response.statusText}`);
    }

    // Send email notifications if requested
    if (payload.sendEmail) {
      await sendEmailNotifications(payload.userIds, payload.subject, payload.message);
    }

    console.log(`Successfully sent ${payload.contentType} notifications to ${payload.userIds.length} recipients`);
    return {
      success: true,
      message: `${payload.contentType} shared with ${payload.userIds.length} recipients`
    };
  } catch (error) {
    console.error('Error in sendContentNotification:', error);
    throw error;
  }
};

// Send email notifications to recipients via backend API
const sendEmailNotifications = async (userIds: string[], subject: string, message: string): Promise<void> => {
  try {
    // Get user emails via API
    const usersResponse = await fetch(`/api/users?ids=${userIds.join(',')}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!usersResponse.ok) {
      console.error('Error fetching user emails');
      return;
    }

    const users = await usersResponse.json();
    if (!users || users.length === 0) {
      console.log('No users found for email notifications');
      return;
    }

    // Send email to each user via backend SMTP
    const emailPromises = users.map(async (user) => {
      try {
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            to: user.email,
            subject: subject,
            body: message,
            recipientName: user.name
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to send email');
        }

        console.log(`📧 Email sent successfully to: ${user.email} (${user.name})`);
        return await response.json();
      } catch (emailError) {
        console.error(`Failed to send email to ${user.email}:`, emailError);
        return null;
      }
    });

    await Promise.all(emailPromises);
    console.log(`Email notifications sent to ${users.length} recipients`);
  } catch (error) {
    console.error('Error sending email notifications:', error);
  }
};

// Get notifications for a specific user (compatible with existing schema)
export const getUserNotifications = async (userId: string): Promise<any[]> => {
  try {
    const response = await fetch(`/api/notifications/${userId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching user notifications');
      return [];
    }

    const data = await response.json();
    return (data || []).map(notification => ({
      id: String(notification.id),
      subject: notification.title || notification.subject,
      message: notification.message,
      type: notification.type || 'Info',
      read: notification.is_read || notification.read || false,
      createdAt: new Date(notification.created_at),
      updatedAt: notification.updated_at ? new Date(notification.updated_at) : undefined
    }));
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    return [];
  }
};

// Get unread notification count for a user
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const response = await fetch(`/api/notifications/${userId}/unread-count`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching unread notification count');
      return 0;
    }

    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.error('Error in getUnreadNotificationCount:', error);
    return 0;
  }
};

// Event Response Functions
export const submitEventResponse = async (eventId: string, response: 'accepted' | 'declined' | 'maybe', responseMessage?: string): Promise<void> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      throw new Error('User not logged in');
    }

    const responseData = await fetch('/api/event-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        event_id: eventId,
        user_id: currentUser.id,
        response,
        response_message: responseMessage || null
      })
    });

    if (!responseData.ok) {
      const errorData = await responseData.json();
      throw new Error(`Failed to submit response: ${errorData.error || responseData.statusText}`);
    }
  } catch (error) {
    console.error('Error in submitEventResponse:', error);
    throw error;
  }
};

export const getEventResponse = async (eventId: string): Promise<{response: string; responseMessage?: string} | null> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return null;
    }

    const response = await fetch(`/api/event-responses/${eventId}?userId=${currentUser.id}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No response found
      }
      console.error('Error fetching event response');
      return null;
    }

    const data = await response.json();
    return data ? {
      response: data.response,
      responseMessage: data.response_message
    } : null;
  } catch (error) {
    console.error('Error in getEventResponse:', error);
    return null;
  }
};

export const getEventResponseStats = async (eventId: string): Promise<{
  accepted: number;
  declined: number;
  maybe: number;
  total: number;
  acceptedUsers: Array<{id: string; name: string; email: string}>;
  declinedUsers: Array<{id: string; name: string; email: string}>;
  maybeUsers: Array<{id: string; name: string; email: string}>;
}> => {
  try {
    const response = await fetch(`/api/event-responses/${eventId}/stats`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Error fetching event response stats');
      return {
        accepted: 0,
        declined: 0,
        maybe: 0,
        total: 0,
        acceptedUsers: [],
        declinedUsers: [],
        maybeUsers: []
      };
    }

    const data = await response.json();
    return {
      accepted: data.accepted || 0,
      declined: data.declined || 0,
      maybe: data.maybe || 0,
      total: data.total || 0,
      acceptedUsers: data.acceptedUsers || [],
      declinedUsers: data.declinedUsers || [],
      maybeUsers: data.maybeUsers || []
    };
  } catch (error) {
    console.error('Error in getEventResponseStats:', error);
    return {
      accepted: 0,
      declined: 0,
      maybe: 0,
      total: 0,
      acceptedUsers: [],
      declinedUsers: [],
      maybeUsers: []
    };
  }
};

// ===================================
// DEMO BOOKINGS API FUNCTIONS
// ===================================

export const createDemoBooking = async (bookingData: {
  name: string;
  email: string;
  phoneNumber: string;
  country: string;
  courseName: string;
  courseId?: string;
  message?: string;
}): Promise<DemoBooking> => {
  try {
    const response = await fetch('/api/demo-bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        student_name: bookingData.name,
        parent_name: null,
        email: bookingData.email.toLowerCase().trim(),
        phone: bookingData.phoneNumber,
        course: bookingData.courseName,
        preferred_date: null,
        preferred_time: null,
        location: null,
        notes: bookingData.message || null
      })
    });

    if (!response.ok) {
      throw new Error('Failed to submit demo booking. Please try again.');
    }

    const data = await response.json();
    const demoBooking: DemoBooking = {
      id: String(data.id),
      name: data.name,
      email: data.email,
      phoneNumber: data.phone_number,
      country: data.country,
      courseName: data.course_name,
      courseId: data.course_id,
      status: data.status,
      message: data.message,
      adminNotes: data.admin_notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      contactedAt: data.contacted_at,
      demoScheduledAt: data.demo_scheduled_at,
      preferredContactMethod: data.preferred_contact_method,
      source: data.source
    };

    // Send notifications
    await notificationService.notifyDemoBooking(demoBooking);

    // Create admin notifications in the database
    await createDemoBookingNotification(demoBooking);

    return demoBooking;
  } catch (error) {
    console.error('Error in createDemoBooking:', error);
    throw error;
  }
};

export const getDemoBookings = async (): Promise<DemoBooking[]> => {
  try {
    const response = await fetch('/api/demo-bookings', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch demo bookings');
    }

    const data = await response.json();
    return (data || []).map(booking => ({
      id: String(booking.id),
      name: booking.name,
      email: booking.email,
      phoneNumber: booking.phone_number,
      country: booking.country,
      courseName: booking.course_name,
      courseId: booking.course_id,
      status: booking.status,
      message: booking.message,
      adminNotes: booking.admin_notes,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
      contactedAt: booking.contacted_at,
      demoScheduledAt: booking.demo_scheduled_at,
      preferredContactMethod: booking.preferred_contact_method,
      source: booking.source
    }));
  } catch (error) {
    console.error('Error in getDemoBookings:', error);
    throw error;
  }
};

export const updateDemoBookingStatus = async (
  bookingId: string,
  status: DemoBooking['status'],
  adminNotes?: string,
  demoScheduledAt?: string
): Promise<DemoBooking> => {
  try {
    const updateData: any = { status };

    if (adminNotes) {
      updateData.admin_notes = adminNotes;
    }

    if (status === 'confirmed' && !demoScheduledAt) {
      updateData.contacted_at = new Date().toISOString();
    }

    if (demoScheduledAt) {
      updateData.demo_scheduled_at = demoScheduledAt;
    }

    const response = await fetch(`/api/demo-bookings/${bookingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error('Failed to update demo booking');
    }

    const data = await response.json();
    return {
      id: String(data.id),
      name: data.name,
      email: data.email,
      phoneNumber: data.phone_number,
      country: data.country,
      courseName: data.course_name,
      courseId: data.course_id,
      status: data.status,
      message: data.message,
      adminNotes: data.admin_notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      contactedAt: data.contacted_at,
      demoScheduledAt: data.demo_scheduled_at,
      preferredContactMethod: data.preferred_contact_method,
      source: data.source
    };
  } catch (error) {
    console.error('Error in updateDemoBookingStatus:', error);
    throw error;
  }
};

export const deleteDemoBooking = async (bookingId: string): Promise<void> => {
  try {
    const response = await fetch(`/api/demo-bookings/${bookingId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to delete demo booking');
    }
  } catch (error) {
    console.error('Error in deleteDemoBooking:', error);
    throw error;
  }
};

export const getDemoBookingStats = async () => {
  try {
    const response = await fetch('/api/demo-bookings/stats', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        thisMonth: 0
      };
    }

    const stats = await response.json();
    return stats;
  } catch (error) {
    console.error('Error in getDemoBookingStats:', error);
    return {
      total: 0,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      thisMonth: 0
    };
  }
};


// Create notification for admin users about new demo booking
export const createDemoBookingNotification = async (demoBooking: DemoBooking): Promise<void> => {
  try {
    // Get all admin users via API
    const adminResponse = await fetch('/api/users?role=Admin', {
      method: 'GET',
      credentials: 'include'
    });

    if (!adminResponse.ok) {
      console.error('Error fetching admin users');
      return;
    }

    const adminUsers = await adminResponse.json();
    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users found to notify');
      return;
    }

    // Create notifications for each admin
    const notifications = adminUsers.map(admin => ({
      user_id: admin.id,
      recipient_id: admin.id,
      title: 'New Demo Booking Request',
      message: `${demoBooking.name} has requested a demo class for ${demoBooking.courseName}. Contact: ${demoBooking.email}, ${demoBooking.phoneNumber}`,
      type: 'Info',
      is_read: false
    }));

    const notifResponse = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ notifications })
    });

    if (!notifResponse.ok) {
      console.error('Error creating demo booking notifications');
    } else {
      console.log(`Created ${notifications.length} admin notifications for demo booking`);
    }
  } catch (error) {
    console.error('Error in createDemoBookingNotification:', error);
  }
};
