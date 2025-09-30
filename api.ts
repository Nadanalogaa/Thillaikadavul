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

    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('email', normalizedEmail)
      .eq('is_deleted', false)
      .limit(1);

    if (error) {
      console.error('Error checking email:', error);
      throw new Error('Failed to check email availability');
    }

    const exists = data && data.length > 0;
    
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
    // Check for default admin emails first
    if (normalizedEmail === 'admin@nadanaloga.com' || 
        normalizedEmail.includes('admin') || 
        normalizedEmail === 'nadanalogaa@gmail.com') {
      const adminUser: User = {
        id: 'admin-001',
        name: 'Administrator',
        email: normalizedEmail,
        role: UserRole.Admin,
        classPreference: ClassPreference.Hybrid
      };
      
      currentUser = adminUser;
      safeSetLocalStorage('currentUser', adminUser);
      console.log('Default admin logged in:', adminUser);
      return adminUser;
    }

    // Check if user exists in database
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail);

    if (error) {
      console.error('Login query error:', error);
      throw new Error('Login failed. Please try again.');
    }

    if (!users || users.length === 0) {
      throw new Error('Invalid email or password. Please check your credentials or register first.');
    }

    // For now, we'll use the first matching user (in production, verify password)
    const user = users[0];
    const userData: User = {
      id: user.id,
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

    currentUser = userData;
    safeSetLocalStorage('currentUser', userData);
    
    console.log('User logged in from database:', userData);
    console.log('Login courseExpertise:', userData.courseExpertise);
    console.log('Login availableTimeSlots:', userData.availableTimeSlots);
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
    
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.id);

    if (error) {
      console.error('Error refreshing user data:', error);
      return currentUser; // Return cached data if refresh fails
    }

    if (!users || users.length === 0) {
      console.warn('User not found in database during refresh');
      return currentUser; // Return cached data if user not found
    }

    const user = users[0];
    console.log('Raw user data from database:', user);
    console.log('Raw course_expertise:', user.course_expertise);
    console.log('Raw available_time_slots:', user.available_time_slots);
    console.log('Raw courses:', user.courses);
    
    const userData: User = {
      id: user.id,
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
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at');

    if (error) {
      console.error('Error fetching courses:', error);
      
      // If no courses exist, initialize with basic courses
      if (error.message.includes('relation "courses" does not exist') || error.code === 'PGRST116') {
        return await initializeBasicCourses();
      }
      throw error;
    }

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
      id: course.id,
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
    const { data, error } = await supabase
      .from('courses')
      .insert(basicCourses)
      .select();

    if (error) {
      console.error('Error initializing courses:', error);
      // Return basic courses with generated IDs as fallback
      return basicCourses.map((course, index) => ({
        id: `course-${index + 1}`,
        name: course.name,
        description: course.description,
        icon: course.icon
      }));
    }

    return data.map(course => ({
      id: course.id,
      name: course.name,
      description: course.description,
      icon: course.icon || course.name
    }));

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
    // Create mailto URL with the form data
    const subject = encodeURIComponent(data.subject ? `Contact Form: ${data.subject}` : 'Contact Form Submission');
    const body = encodeURIComponent(`
Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || 'Not provided'}
Subject: ${data.subject || 'General Inquiry'}

Message:
${data.message}

---
This message was sent from the Nadanaloga Fine Arts Academy contact form.
    `);

    // Open email client with pre-filled information
    const mailtoUrl = `mailto:nadanalogaa@gmail.com?subject=${subject}&body=${body}`;
    window.open(mailtoUrl);

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
          const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select()
            .eq('id', result.userId)
            .single();

          if (fetchError) {
            throw new Error('Failed to fetch user data after registration');
          }

          data = userData;
          console.log('User registered with emails successfully:', data);
        } catch (backendError) {
          console.error('Backend registration with emails failed, falling back to Supabase:', backendError);
          // Fallback to direct Supabase registration
          const { data: supabaseData, error } = await supabase
            .from('users')
            .insert([completeUserData])
            .select()
            .single();

          if (error) {
            console.error('Supabase registration error:', error);
            throw new Error(`Registration failed: ${error.message}`);
          }
          data = supabaseData;
        }
      } else {
        // Direct Supabase registration for teachers or when emails are disabled
        const { data: supabaseData, error } = await supabase
          .from('users')
          .insert([completeUserData])
          .select()
          .single();

        if (error) {
          console.error('Registration error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            userData: completeUserData
          });
          throw new Error(`Registration failed: ${error.message}. Details: ${error.details || 'No additional details'}`);
        }
        data = supabaseData;

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

        // Also send in-app notifications
        try {
          // Get admin users for notification
          const adminUsers = await notificationService.getAdminUsers();
          const adminId = adminUsers.length > 0 ? adminUsers[0] : undefined;

          // Convert database fields to User interface
          const userForNotification: User = {
              id: data.id,
              name: data.name,
              email: data.email,
              role: data.role,
              classPreference: data.class_preference,
              contactNumber: data.contact_number,
              address: data.address,
              country: data.country,
              state: data.state,
              city: data.city,
              postalCode: data.postal_code,
              fatherName: data.father_name,
              dob: data.dob,
              sex: data.sex,
              schoolName: data.school_name,
              standard: data.standard,
              grade: data.grade,
              photoUrl: data.photo_url,
              courses: data.courses || [],
              courseExpertise: data.course_expertise || [],
              preferredTimings: data.preferred_timings || [],
              dateOfJoining: data.date_of_joining,
              schedules: data.schedules || [],
              documents: data.documents || [],
              notes: data.notes
            };

          await notificationService.notifyStudentRegistration(userForNotification, adminId);
        } catch (notificationError) {
          console.error('Failed to send in-app notification:', notificationError);
          // Don't fail the registration if notification fails
        }
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

    const { data, error } = await supabase
      .from('users')
      .insert([adminData])
      .select()
      .single();

    if (error) {
      console.error('Admin registration error:', error);
      throw new Error(`Admin registration failed: ${error.message}`);
    }

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
    const { data: users, error } = await supabase
      .from('users')
      .select('role, class_preference')
      .eq('is_deleted', false);

    if (error) {
      console.error('Error fetching admin stats:', error);
      return { totalUsers: 0, studentCount: 0, teacherCount: 0, onlinePreference: 0, offlinePreference: 0 };
    }

    const studentCount = users?.filter((u: any) => u.role === 'Student').length || 0;
    const teacherCount = users?.filter((u: any) => u.role === 'Teacher').length || 0;
    const onlinePreference = users?.filter((u: any) => u.class_preference === 'Online').length || 0;
    const offlinePreference = users?.filter((u: any) => u.class_preference === 'Offline').length || 0;
    
    return {
      totalUsers: users?.length || 0,
      studentCount,
      teacherCount,
      onlinePreference,
      offlinePreference
    };
  } catch (error) {
    console.error('Error in getAdminStats:', error);
    return { totalUsers: 0, studentCount: 0, teacherCount: 0, onlinePreference: 0, offlinePreference: 0 };
  }
};

export const getAdminUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin users:', error);
      return [];
    }

    return (data || []).map(user => ({
      id: user.id,
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
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user by ID:', error);
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    if (!data) {
      throw new Error('User not found');
    }

    // Map database fields to User interface
    return {
      id: data.id,
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
        id: savedUser.id,
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
      const { data: currentUserData, error: fetchError } = await supabase
        .from('users')
        .select('schedules, name, email, role')
        .eq('id', userId)
        .single();

      if (!fetchError && currentUserData) {
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

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      throw new Error(`Failed to update user: ${error.message}`);
    }

    // Map database fields back to User interface
    const userResult = {
      id: data.id,
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
            const { data: teacherData } = await supabase
              .from('users')
              .select('name')
              .eq('id', newSchedule.teacherId)
              .single();

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
            const { data: oldTeacherData } = await supabase
              .from('users')
              .select('name')
              .eq('id', oldSchedule.teacherId)
              .single();

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
            const { data: teacherData } = await supabase
              .from('users')
              .select('name')
              .eq('id', oldSchedule.teacherId)
              .single();

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
    const { error } = await supabase
      .from('users')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error soft deleting user:', error);
      throw new Error(`Failed to delete user: ${error.message}`);
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
    const { data, error } = await supabase
      .from('courses')
      .insert([{
        name: courseData.name,
        description: courseData.description,
        icon: courseData.icon,
        image: courseData.image,
        icon_url: courseData.icon_url,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding course:', error);
      throw new Error(`Failed to add course: ${error.message}`);
    }

    const newCourse = {
      id: data.id,
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
      const { data: teachersData } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'Teacher');

      const teacherIds = teachersData?.map(t => t.id) || [];

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

    const { data, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId)
      .select()
      .single();

    if (error) {
      console.error('Error updating course:', error);
      throw new Error(`Failed to update course: ${error.message}`);
    }

    const updatedCourse = {
      id: data.id,
      name: data.name,
      description: data.description,
      icon: data.icon,
      image: data.image,
      icon_url: data.icon_url
    };

    // Send notifications about course update to all users who are enrolled in this course
    try {
      // Get all users who have this course in their courses array
      const { data: enrolledUsers } = await supabase
        .from('users')
        .select('id, name')
        .contains('courses', [data.name]);

      const enrolledUserIds = enrolledUsers?.map(u => u.id) || [];

      // Also notify admin
      const adminIds = await notificationService.getAdminUsers();
      const allRelevantUsers = [...new Set([...enrolledUserIds, ...adminIds])];

      for (const userId of allRelevantUsers) {
        await notificationService.sendNotification({
          type: 'modification',
          title: 'Course Updated',
          message: `The course "${data.name}" has been updated. ${Object.keys(courseData).join(', ')} modified.`,
          recipientId: userId,
          emailRequired: true,
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
    const { data: courseData } = await supabase
      .from('courses')
      .select('name')
      .eq('id', courseId)
      .single();

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      console.error('Error deleting course:', error);
      throw new Error(`Failed to delete course: ${error.message}`);
    }

    // Send notifications about course deletion
    if (courseData?.name) {
      try {
        // Get all users who had this course in their courses array
        const { data: affectedUsers } = await supabase
          .from('users')
          .select('id, name')
          .contains('courses', [courseData.name]);

        const affectedUserIds = affectedUsers?.map(u => u.id) || [];

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
    // First try to get just the basic batch data
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching batches:', error);
      // If table doesn't exist, return empty array
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('Batches table does not exist yet. Run the schema_complete_fix.sql script.');
        return [];
      }
      return [];
    }

    // Get courses and users for mapping names
    const [coursesResult, usersResult] = await Promise.allSettled([
      supabase.from('courses').select('id, name'),
      supabase.from('users').select('id, name, role').eq('role', 'Teacher').eq('is_deleted', false)
    ]);

    const courses = coursesResult.status === 'fulfilled' ? coursesResult.value.data || [] : [];
    const teachers = usersResult.status === 'fulfilled' ? usersResult.value.data || [] : [];

    return (data || []).map(batch => ({
      id: batch.id,
      name: batch.name,
      description: batch.description,
      courseId: batch.course_id,
      courseName: courses.find(c => c.id === batch.course_id)?.name || 'Unknown Course',
      teacherId: batch.teacher_id,
      teacherName: teachers.find(t => t.id === batch.teacher_id)?.name || 'Unassigned',
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

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('id', uniqueIds)
      .eq('is_deleted', false);

    if (error) {
      console.error('Error fetching users by IDs:', error);
      return [];
    }

    return (data || []).map(user => ({
      id: user.id,
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
      name: batchData.name,
      description: batchData.description,
      schedule: batchData.schedule || [],
      capacity: batchData.capacity,
      mode: batchData.mode,
      is_active: true,
      created_at: new Date().toISOString()
    };

    // Only add course_id if courseId is provided and not empty
    if (batchData.courseId && batchData.courseId.trim() !== '') {
      insertData.course_id = batchData.courseId;
    }

    // Only add teacher_id if teacherId is provided and not empty
    if (batchData.teacherId && typeof batchData.teacherId === 'string' && batchData.teacherId.trim() !== '') {
      insertData.teacher_id = batchData.teacherId;
    }

    // Only add location_id if locationId is provided and not empty
    if (batchData.locationId && batchData.locationId.trim() !== '') {
      insertData.location_id = batchData.locationId;
    }

    // Add dates if provided
    if (batchData.startDate) {
      insertData.start_date = batchData.startDate;
    }

    if (batchData.endDate) {
      insertData.end_date = batchData.endDate;
    }

    const { data, error } = await supabase
      .from('batches')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error adding batch:', error);
      throw new Error(`Failed to add batch: ${error.message}`);
    }

    return {
      id: data.id,
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
    const { data: currentBatch } = await supabase
      .from('batches')
      .select('*, courses(name), users!batches_teacher_id_fkey(name)')
      .eq('id', batchId)
      .single();

    const { data, error } = await supabase
      .from('batches')
      .update({
        name: batchData.name,
        description: batchData.description,
        course_id: batchData.courseId,
        teacher_id: batchData.teacherId,
        schedule: batchData.schedule,
        capacity: batchData.capacity,
        mode: batchData.mode,
        location_id: batchData.locationId,
        start_date: batchData.startDate,
        end_date: batchData.endDate,
        is_active: batchData.isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId)
      .select('*, courses(name), users!batches_teacher_id_fkey(name)')
      .single();

    if (error) {
      console.error('Error updating batch:', error);
      throw new Error(`Failed to update batch: ${error.message}`);
    }

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
      id: data.id,
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
    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('id', batchId);

    if (error) {
      console.error('Error deleting batch:', error);
      throw new Error(`Failed to delete batch: ${error.message}`);
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

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUserData.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return (data || []).map(notification => ({
      id: notification.id,
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
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }

    return {
      id: data.id,
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
    const { data, error } = await supabase
      .from('fee_structures')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching fee structures:', error);
      return [];
    }

    return (data || []).map(fee => ({
      id: fee.id,
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
    const { data, error } = await supabase
      .from('fee_structures')
      .insert([{
        course_id: structureData.courseId,
        course_name: structureData.courseName,
        amount: structureData.amount,
        currency: structureData.currency,
        billing_cycle: structureData.billingCycle,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding fee structure:', error);
      throw new Error(`Failed to add fee structure: ${error.message}`);
    }

    return {
      id: data.id,
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

    const { data, error } = await supabase
      .from('fee_structures')
      .update(updateData)
      .eq('id', structureId)
      .select()
      .single();

    if (error) {
      console.error('Error updating fee structure:', error);
      throw new Error(`Failed to update fee structure: ${error.message}`);
    }

    return {
      id: data.id,
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
    const { error } = await supabase
      .from('fee_structures')
      .delete()
      .eq('id', structureId);

    if (error) {
      console.error('Error deleting fee structure:', error);
      throw new Error(`Failed to delete fee structure: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteFeeStructure:', error);
    throw error;
  }
};
export const getAdminInvoices = async (): Promise<Invoice[]> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        student:users(id, name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }

    return (data || []).map(invoice => ({
      id: invoice.id,
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
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'Student')
          .eq('is_deleted', false);
        
        if (error) {
          console.error('Error fetching family students:', error);
          return [];
        }
        
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
            id: user.id,
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
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Error fetching trashed users:', error);
      return [];
    }

    return (data || []).map(user => ({
      id: user.id,
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
    const { data, error } = await supabase
      .from('users')
      .update({ 
        is_deleted: false, 
        deleted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error restoring user:', error);
      throw new Error(`Failed to restore user: ${error.message}`);
    }

    return {
      id: data.id,
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
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error permanently deleting user:', error);
      throw new Error(`Failed to permanently delete user: ${error.message}`);
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
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true)
      .order('created_at');

    if (error) {
      console.error('Error fetching locations:', error);
      
      // If no locations exist, initialize with basic locations
      if (error.message.includes('relation "locations" does not exist') || error.code === 'PGRST116') {
        return await initializeBasicLocations();
      }
      return [];
    }

    // If no locations in database, initialize basic ones
    if (!data || data.length === 0) {
      return await initializeBasicLocations();
    }

    return data.map(location => ({
      id: location.id,
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
    const { data, error } = await supabase
      .from('locations')
      .insert(basicLocations)
      .select();

    if (error) {
      console.error('Error initializing locations:', error);
      // Return basic locations with generated IDs as fallback
      return basicLocations.map((location, index) => ({
        id: `loc-${index + 1}`,
        name: location.name,
        address: location.address
      }));
    }

    return data.map(location => ({
      id: location.id,
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
    const { data, error } = await supabase
      .from('locations')
      .insert([{
        name: location.name,
        address: location.address,
        is_active: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding location:', error);
      throw new Error(`Failed to add location: ${error.message}`);
    }

    return {
      id: data.id,
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
    const { data, error } = await supabase
      .from('locations')
      .update({
        name: location.name,
        address: location.address,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating location:', error);
      throw new Error(`Failed to update location: ${error.message}`);
    }

    return {
      id: data.id,
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
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting location:', error);
      throw new Error(`Failed to delete location: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteLocation:', error);
    throw error;
  }
};

// Content functions
export const getEvents = async (limit?: number): Promise<Event[]> => {
  try {
    let query = supabase
      .from('events')
      .select('id, title, description, event_date, event_time, is_public, location, created_at, updated_at')
      .eq('is_active', true)
      .order('event_date', { ascending: true });
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    return (data || []).map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: new Date(event.event_date),
      time: event.event_time,
      location: event.location,
      isPublic: event.is_public,
      createdAt: new Date(event.created_at),
      createdBy: event.created_by,
      targetAudience: event.target_audience || [],
      images: (event.event_images || []).map((img: any) => ({
        id: img.id,
        url: img.image_url,
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
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data?.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: new Date(event.date),
      time: event.time,
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
    const { data, error } = await supabase
      .from('events')
      .insert([{
        title: event.title,
        description: event.description,
        event_date: event.date instanceof Date ? event.date.toISOString().split('T')[0] : new Date(event.date).toISOString().split('T')[0],
        event_time: event.time,
        location: event.location,
        created_by: currentUser?.id,
        target_audience: event.targetAudience || [],
        is_active: event.isActive !== undefined ? event.isActive : true,
        priority: event.priority || 'Medium',
        event_type: event.eventType || 'General',
        images: event.images || []
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding event:', error);
      throw new Error(`Failed to add event: ${error.message}`);
    }

    const eventResult = {
      id: data.id,
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
              // Get teachers if needed
              const { data: teachers } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'Teacher');
              if (teachers) {
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
    if (event.date) updateData.date = event.date instanceof Date ? event.date.toISOString() : new Date(event.date).toISOString();
    if (event.time) updateData.time = event.time;
    if (event.location) updateData.location = event.location;
    if (event.isPublic !== undefined) updateData.is_public = event.isPublic;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      throw new Error(`Failed to update event: ${error.message}`);
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      date: new Date(data.date),
      time: data.time,
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
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting event:', error);
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteEvent:', error);
    throw error;
  }
};

export const getGradeExams = async (): Promise<GradeExam[]> => {
  try {
    const { data, error } = await supabase
      .from('grade_exams')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching grade exams:', error);
      return [];
    }

    return (data || []).map(exam => ({
      id: exam.id,
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
    const { data, error } = await supabase
      .from('grade_exams')
      .insert([{
        title: exam.title,
        description: exam.description,
        date: (() => {
          if (!exam.date) return null;
          const dateObj = exam.date instanceof Date ? exam.date : new Date(exam.date);
          return isNaN(dateObj.getTime()) ? null : dateObj.toISOString().split('T')[0];
        })(),
        time: exam.time,
        duration: exam.duration,
        course: exam.course,
        grade: exam.grade,
        syllabus_url: exam.syllabusUrl,
        registration_fee: exam.registrationFee,
        registration_deadline: (() => {
          if (!exam.registrationDeadline) return null;
          const deadlineObj = exam.registrationDeadline instanceof Date ? exam.registrationDeadline : new Date(exam.registrationDeadline);
          return isNaN(deadlineObj.getTime()) ? null : deadlineObj.toISOString().split('T')[0];
        })(),
        is_open: exam.isOpen !== false,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding grade exam:', error);
      throw new Error(`Failed to add grade exam: ${error.message}`);
    }

    const examResult = {
      id: data.id,
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
      // Get all students enrolled in this course
      const { data: enrolledStudents } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'Student')
        .contains('courses', [exam.course]);

      const studentIds = enrolledStudents?.map(s => s.id) || [];

      // Also notify admin and teachers teaching this course
      const adminIds = await notificationService.getAdminUsers();

      const { data: teachersData } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'Teacher')
        .contains('course_expertise', [exam.course]);

      const teacherIds = teachersData?.map(t => t.id) || [];

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
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('grade_exams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating grade exam:', error);
      throw new Error(`Failed to update grade exam: ${error.message}`);
    }

    return {
      id: data.id,
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
    const { error } = await supabase
      .from('grade_exams')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting grade exam:', error);
      throw new Error(`Failed to delete grade exam: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteGradeExam:', error);
    throw error;
  }
};

export const getBookMaterials = async (): Promise<BookMaterial[]> => {
  try {
    const { data, error } = await supabase
      .from('book_materials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching book materials:', error);
      // If table doesn't exist, return empty array
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('Book materials table does not exist yet. Run the schema_complete_fix.sql script.');
        return [];
      }
      return [];
    }

    return (data || []).map(material => ({
      id: material.id,
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
      type: material.type,
      url: material.url,
      created_at: new Date().toISOString()
    };

    // Only add course_id if courseId is provided and not empty
    if (material.courseId && material.courseId.trim() !== '') {
      insertData.course_id = material.courseId;
    }
    
    // Only add course_name if courseName is provided and not empty
    if (material.courseName && material.courseName.trim() !== '') {
      insertData.course_name = material.courseName;
    }

    // Only add data if it's provided
    if (material.data) {
      insertData.data = material.data;
    }

    // Add recipient_ids if provided
    if (material.recipientIds && material.recipientIds.length > 0) {
      insertData.recipient_ids = material.recipientIds;
    }

    const { data, error } = await supabase
      .from('book_materials')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error adding book material:', error);
      throw new Error(`Failed to add book material: ${error.message}`);
    }

    const materialResult = {
      id: data.id,
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
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('book_materials')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating book material:', error);
      throw new Error(`Failed to update book material: ${error.message}`);
    }

    return {
      id: data.id,
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
    const { error } = await supabase
      .from('book_materials')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting book material:', error);
      throw new Error(`Failed to delete book material: ${error.message}`);
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
    
    const { data, error } = await supabase
      .from('book_materials')
      .update({ 
        recipient_ids: recipientIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', materialId)
      .select()
      .single();

    if (error) {
      console.error('Error sending book material:', error);
      throw new Error(`Failed to send book material: ${error.message}`);
    }

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
    
    const { data, error } = await supabase
      .from('events')
      .update({ 
        recipient_ids: recipientIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      console.error('Error sending event:', error);
      throw new Error(`Failed to send event: ${error.message}`);
    }

    console.log('Event sent successfully to recipients:', data);
  } catch (error) {
    console.error('Error in sendEvent:', error);
    throw error;
  }
};

// Get events for a specific student with notification status
export const getStudentEvents = async (studentId: string): Promise<Event[]> => {
  try {
    // First, get all active events (simplified approach)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('event_date', { ascending: false });

    if (error) {
      console.error('Error fetching student events:', error);
      return [];
    }

    return (data || []).map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: new Date(event.event_date),
      time: event.event_time,
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
    const { data, error } = await supabase
      .from('event_notifications')
      .select(`
        *,
        events!inner(
          id,
          title,
          description,
          event_date,
          event_time,
          location,
          priority,
          event_type
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching event notifications:', error);
      return [];
    }

    return (data || []).map(notification => ({
      id: notification.id,
      eventId: notification.event_id,
      userId: notification.user_id,
      isRead: notification.is_read,
      readAt: notification.read_at ? new Date(notification.read_at) : undefined,
      createdAt: new Date(notification.created_at),
      event: notification.events ? {
        id: notification.events.id,
        title: notification.events.title,
        description: notification.events.description,
        date: new Date(notification.events.event_date),
        time: notification.events.event_time,
        location: notification.events.location,
        priority: notification.events.priority,
        eventType: notification.events.event_type
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
    const { error } = await supabase
      .from('event_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
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

    const { data, error } = await supabase
      .from('event_images')
      .insert([{
        event_id: eventId,
        image_url: base64,
        caption: caption || '',
        filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        display_order: 0
      }])
      .select()
      .single();

    if (error) {
      console.error('Error uploading event image:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    return {
      id: data.id,
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
    
    const { data, error } = await supabase
      .from('grade_exams')
      .update({ 
        recipient_ids: recipientIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', examId)
      .select()
      .single();

    if (error) {
      console.error('Error sending grade exam:', error);
      throw new Error(`Failed to send grade exam: ${error.message}`);
    }

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
    
    const { data, error } = await supabase
      .from('notices')
      .update({ 
        recipient_ids: recipientIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', noticeId)
      .select()
      .single();

    if (error) {
      console.error('Error sending notice:', error);
      throw new Error(`Failed to send notice: ${error.message}`);
    }

    console.log('Notice sent successfully to recipients:', data);
  } catch (error) {
    console.error('Error in sendNotice:', error);
    throw error;
  }
};

export const getNotices = async (limit?: number): Promise<Notice[]> => {
  try {
    let query = supabase
      .from('notices')
      .select('id, title, content, target_audience, recipient_ids, issued_at, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notices:', error);
      return [];
    }

    return (data || []).map(notice => ({
      id: notice.id,
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
    const { data, error } = await supabase
      .from('notices')
      .insert([{
        title: notice.title,
        content: notice.content,
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding notice:', error);
      throw new Error(`Failed to add notice: ${error.message}`);
    }

    const noticeResult = {
      id: data.id,
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
      const { data: teachersData } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'Teacher');

      const teacherIds = teachersData?.map(t => t.id) || [];

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
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('notices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating notice:', error);
      throw new Error(`Failed to update notice: ${error.message}`);
    }

    return {
      id: data.id,
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
    const { error } = await supabase
      .from('notices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting notice:', error);
      throw new Error(`Failed to delete notice: ${error.message}`);
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
      is_read: false,
      created_at: new Date().toISOString()
    }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('Error creating notifications:', notificationError);
      throw new Error(`Failed to create notifications: ${notificationError.message}`);
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
    // Get user emails
    const { data: users, error } = await supabase
      .from('users')
      .select('email, name')
      .in('id', userIds);

    if (error) {
      console.error('Error fetching user emails:', error);
      return;
    }

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
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }

    return (data || []).map(notification => ({
      id: notification.id,
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
    // First get all notifications for this user
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread notification count:', error);
      return 0;
    }

    return (data || []).length;
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

    const { error } = await supabase
      .from('event_responses')
      .upsert({
        event_id: eventId,
        user_id: currentUser.id,
        response,
        response_message: responseMessage || null,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'event_id,user_id'
      });

    if (error) {
      console.error('Error submitting event response:', error);
      throw new Error(`Failed to submit response: ${error.message}`);
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

    const { data, error } = await supabase
      .from('event_responses')
      .select('response, response_message')
      .eq('event_id', eventId)
      .eq('user_id', currentUser.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching event response:', error);
      return null;
    }

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
    const { data, error } = await supabase
      .from('event_responses')
      .select(`
        response,
        users!inner(id, name, email)
      `)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching event response stats:', error);
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

    const accepted = data.filter(r => r.response === 'accepted');
    const declined = data.filter(r => r.response === 'declined');
    const maybe = data.filter(r => r.response === 'maybe');

    return {
      accepted: accepted.length,
      declined: declined.length,
      maybe: maybe.length,
      total: data.length,
      acceptedUsers: accepted.map(r => r.users),
      declinedUsers: declined.map(r => r.users),
      maybeUsers: maybe.map(r => r.users)
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
    const { data, error } = await supabase
      .from('demo_bookings')
      .insert([{
        name: bookingData.name,
        email: bookingData.email.toLowerCase().trim(),
        phone_number: bookingData.phoneNumber,
        country: bookingData.country,
        course_name: bookingData.courseName,
        course_id: bookingData.courseId || null,
        message: bookingData.message || null,
        status: 'pending',
        source: 'website',
        preferred_contact_method: 'email'
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating demo booking:', error);
      throw new Error('Failed to submit demo booking. Please try again.');
    }

    const demoBooking: DemoBooking = {
      id: data.id,
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
    const { data, error } = await supabase
      .from('demo_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching demo bookings:', error);
      throw new Error('Failed to fetch demo bookings');
    }

    return (data || []).map(booking => ({
      id: booking.id,
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
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (adminNotes) {
      updateData.admin_notes = adminNotes;
    }

    if (status === 'confirmed' && !demoScheduledAt) {
      updateData.contacted_at = new Date().toISOString();
    }

    if (demoScheduledAt) {
      updateData.demo_scheduled_at = demoScheduledAt;
    }

    const { data, error } = await supabase
      .from('demo_bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating demo booking:', error);
      throw new Error('Failed to update demo booking');
    }

    return {
      id: data.id,
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
    const { error } = await supabase
      .from('demo_bookings')
      .delete()
      .eq('id', bookingId);

    if (error) {
      console.error('Error deleting demo booking:', error);
      throw new Error('Failed to delete demo booking');
    }
  } catch (error) {
    console.error('Error in deleteDemoBooking:', error);
    throw error;
  }
};

export const getDemoBookingStats = async () => {
  try {
    const { data, error } = await supabase
      .from('demo_bookings')
      .select('status, created_at');

    if (error) {
      console.error('Error fetching demo booking stats:', error);
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        thisMonth: 0
      };
    }

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: data.length,
      pending: data.filter(b => b.status === 'pending').length,
      confirmed: data.filter(b => b.status === 'confirmed').length,
      completed: data.filter(b => b.status === 'completed').length,
      cancelled: data.filter(b => b.status === 'cancelled').length,
      thisMonth: data.filter(b => new Date(b.created_at) >= thisMonth).length
    };

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
    // Get all admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'Admin');

    if (adminError) {
      console.error('Error fetching admin users:', adminError);
      return;
    }

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

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error creating demo booking notifications:', insertError);
    } else {
      console.log(`Created ${notifications.length} admin notifications for demo booking`);
    }
  } catch (error) {
    console.error('Error in createDemoBookingNotification:', error);
  }
};
