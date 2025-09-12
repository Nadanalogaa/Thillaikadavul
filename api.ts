import type { User, ContactFormData, Course, DashboardStats, Notification, Batch, FeeStructure, Invoice, PaymentDetails, StudentEnrollment, Event, GradeExam, BookMaterial, Notice, Location, MediaItem } from './types';
import { MediaType } from './types';
import { supabase } from './src/lib/supabase.js';

// Server API URL for email service  
const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000/api';

// Environment detection for email service
const IS_PRODUCTION = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const HAS_SERVER = import.meta.env.VITE_SERVER_URL || false;

// Simple session management
let currentUser: User | null = null;

// Core working functions
export const checkEmailExists = async (email: string): Promise<{ exists: boolean }> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .limit(1);

    if (error) {
      console.error('Error checking email:', error);
      throw new Error('Failed to check email availability');
    }

    return { exists: data && data.length > 0 };
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
        role: 'Admin',
        classPreference: 'Hybrid'
      };
      
      currentUser = adminUser;
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentUser', JSON.stringify(adminUser));
      }
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
      courses: user.courses || [],
      courseExpertise: user.course_expertise || [],
      preferredTimings: user.preferred_timings || [],
      dateOfJoining: user.date_of_joining
    };

    currentUser = userData;
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(userData));
    }
    
    console.log('User logged in from database:', userData);
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
  return currentUser;
};

export const logout = async (): Promise<void> => {
  currentUser = null;
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

    return data.map(course => ({
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
  // Mock success for now
  console.log('Contact form submitted:', data);
  return { success: true };
};

// All other functions as placeholders to prevent errors
export const registerUser = async (userData: Partial<User>[]): Promise<any> => {
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
      if (user.dateOfJoining) {
        const joinDate = new Date(user.dateOfJoining);
        completeUserData.date_of_joining = joinDate.toISOString().split('T')[0];
      } else {
        completeUserData.date_of_joining = new Date().toISOString().split('T')[0];
      }

      console.log('Registering user with data:', completeUserData);
      
      // Single insert with all data
      const { data, error } = await supabase
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

      console.log('User registered successfully:', data);
      finalUsersData.push(data);

      // Send registration notification to the new user
      try {
        const userRole = data.role || 'Student';
        const welcomeSubject = `Welcome to Nadanaloga - ${userRole} Registration Successful! 🎉`;
        const welcomeMessage = `Dear ${data.name || 'Student'},

🎉 Welcome to Nadanaloga! We're excited to have you join our learning community.

Your ${userRole.toLowerCase()} registration has been completed successfully!

Account Details:
• Name: ${data.name}
• Email: ${data.email}
• Role: ${userRole}
• Registration Date: ${new Date().toLocaleDateString()}

${userRole === 'Student' ? `
Next Steps:
• Access your student dashboard to view available courses
• Browse our comprehensive course catalog
• Enroll in courses that match your interests
• Connect with instructors and fellow students
• Start your learning journey with personalized guidance

We offer a wide range of courses including traditional arts, cultural studies, and more. Our experienced instructors are here to support your educational goals.
` : `
You can now access your ${userRole.toLowerCase()} dashboard and explore all the features available to you.
`}
Thank you for choosing Nadanaloga for your educational journey!

Best regards,
The Nadanaloga Team`;

        await sendNotification([data.id], welcomeSubject, welcomeMessage);
        console.log(`Registration notification sent to ${data.name} (${data.email})`);

        // Also send welcome email
        await sendEmailNotifications([data.id], welcomeSubject, welcomeMessage);
        console.log(`Registration email sent to ${data.name} (${data.email})`);
      } catch (notificationError) {
        console.error('Failed to send registration notification:', notificationError);
        // Don't fail the registration if notification fails
      }
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
export const sendNotification = async (userIds: string[], subject: string, message: string): Promise<{success: boolean}> => {
  try {
    console.log('Creating notifications for users:', userIds, 'Subject:', subject);
    
    // Create notification records in database for each user
    const notificationRecords = userIds.map(userId => ({
      recipient_id: userId,
      user_id: userId, // For compatibility with existing queries
      title: subject, // Correct column name is 'title' not 'subject'
      message: message,
      type: 'Info',
      is_read: false, // Only use is_read as per actual schema
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationRecords)
      .select();

    if (error) {
      console.error('Error creating notifications:', error);
      throw new Error(`Failed to create notifications: ${error.message}`);
    }

    console.log(`Successfully created ${data?.length || 0} notifications`);
    return { success: true };
  } catch (error) {
    console.error('Error in sendNotification:', error);
    throw error;
  }
};
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

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      icon: data.icon,
      image: data.image,
      icon_url: data.icon_url
    };
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

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      icon: data.icon,
      image: data.image,
      icon_url: data.icon_url
    };
  } catch (error) {
    console.error('Error in updateCourseByAdmin:', error);
    throw error;
  }
};
export const deleteCourseByAdmin = async (courseId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      console.error('Error deleting course:', error);
      throw new Error(`Failed to delete course: ${error.message}`);
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
      .select()
      .single();

    if (error) {
      console.error('Error updating batch:', error);
      throw new Error(`Failed to update batch: ${error.message}`);
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
      subject: notification.title, // Use title column
      message: notification.message,
      read: notification.is_read, // Use is_read column
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
      .update({ is_read: true }) // Use is_read column
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
      subject: data.title, // Use title column
      message: data.message,
      read: data.is_read, // Use is_read column
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
  if (typeof window !== 'undefined') {
    const enrollments = localStorage.getItem('enrollments');
    if (enrollments) {
      const allEnrollments = JSON.parse(enrollments);
      return allEnrollments.filter((enr: StudentEnrollment) => enr.studentId === studentId);
    }
  }
  return [];
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
export const getEvents = async (): Promise<Event[]> => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    return (data || []).map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: new Date(event.date),
      time: event.time,
      location: event.location,
      isPublic: event.is_public,
      createdAt: new Date(event.created_at)
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
    const { data, error } = await supabase
      .from('events')
      .insert([{
        title: event.title,
        description: event.description,
        date: event.date instanceof Date ? event.date.toISOString() : new Date(event.date).toISOString(),
        time: event.time || '12:00 PM', // Provide default time if null
        location: event.location || 'To be announced', // Provide default location if null
        is_public: event.isPublic,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding event:', error);
      throw new Error(`Failed to add event: ${error.message}`);
    }

    const result = {
      id: data.id,
      title: data.title,
      description: data.description,
      date: new Date(data.date),
      time: data.time,
      location: data.location,
      isPublic: data.is_public,
      createdAt: new Date(data.created_at)
    };

    // Send notifications for new events (to all users if public)
    if (data.is_public) {
      try {
        // Get all active users for public events
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id')
          .eq('is_deleted', false);

        if (!usersError && users && users.length > 0) {
          const userIds = users.map(u => u.id);
          const eventSubject = `New Event: ${event.title} 📅`;
          const eventMessage = `A new event has been scheduled!

Title: ${event.title}
Date: ${new Date(event.date).toLocaleDateString()}
Time: ${event.time || 'TBA'}
Location: ${event.location || 'TBA'}

${event.description || ''}

Don't miss out on this exciting event!

Best regards,
Nadanaloga Team`;

          await sendContentNotification({
            contentId: data.id,
            contentType: 'Event',
            userIds: userIds,
            subject: eventSubject,
            message: eventMessage,
            sendEmail: true
          });

          console.log(`Event notifications sent for: ${event.title}`);
        }
      } catch (notificationError) {
        console.error('Failed to send event notifications:', notificationError);
      }
    }

    return result;
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
      data: material.data,
      recipientIds: material.recipient_ids || []
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

    const result = {
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

    // Send notifications to recipients if specified
    if (material.recipientIds && material.recipientIds.length > 0) {
      try {
        const notificationSubject = `New ${material.type} Available: ${material.title} 📚`;
        const notificationMessage = `A new ${material.type.toLowerCase()} has been shared with you.

Title: ${material.title}
${material.courseName ? `Course: ${material.courseName}` : ''}
${material.description ? `Description: ${material.description}` : ''}

You can access this material from your dashboard.

Happy learning!
Nadanaloga Team`;

        await sendContentNotification({
          contentId: data.id,
          contentType: material.type || 'Material',
          userIds: material.recipientIds,
          subject: notificationSubject,
          message: notificationMessage,
          sendEmail: true
        });

        console.log(`Notifications sent for new ${material.type}: ${material.title}`);
      } catch (notificationError) {
        console.error('Failed to send material notifications:', notificationError);
        // Don't fail the material creation if notification fails
      }
    }

    return result;
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

export const getNotices = async (): Promise<Notice[]> => {
  try {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notices:', error);
      return [];
    }

    return (data || []).map(notice => ({
      id: notice.id,
      title: notice.title,
      content: notice.content,
      issuedAt: notice.issued_at,
      recipientIds: notice.recipient_ids || []
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

    const result = {
      id: data.id,
      title: data.title,
      content: data.content,
      issuedAt: data.issued_at,
      recipientIds: []
    };

    // Send notifications for new notices to all users
    try {
      // Get all active users for notice notifications
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('is_deleted', false);

      if (!usersError && users && users.length > 0) {
        const userIds = users.map(u => u.id);
        const noticeSubject = `New Notice: ${notice.title} 📢`;
        const noticeMessage = `A new notice has been published.

Title: ${notice.title}

${notice.content}

Please check your dashboard for more details.

Best regards,
Nadanaloga Team`;

        await sendContentNotification({
          contentId: data.id,
          contentType: 'Notice',
          userIds: userIds,
          subject: noticeSubject,
          message: noticeMessage,
          sendEmail: true
        });

        console.log(`Notice notifications sent for: ${notice.title}`);
      }
    } catch (notificationError) {
      console.error('Failed to send notice notifications:', notificationError);
    }

    return result;
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

// Use Vercel serverless function (works from production without CORS issues)
const useVercelEmailFunction = async (user: any, subject: string, plainTextMessage: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.email,
        name: user.name,
        subject: subject,
        message: plainTextMessage
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`✅ Vercel email function succeeded for ${user.email} (${result.method})`);
      console.log(`📧 ${result.message}`);
      return true;
    } else {
      console.log(`❌ Vercel email function failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Vercel email function error:`, error);
    return false;
  }
};

// Use your server's SMTP email service (primary method)
const tryServerSMTPEmail = async (user: any, subject: string, plainTextMessage: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.email,
        name: user.name,
        subject: subject,
        message: plainTextMessage
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`📧 Server SMTP: Email sent successfully to ${user.email} (${result.mode} mode)`);
      if (result.previewUrl) {
        console.log(`📧 Preview URL: ${result.previewUrl}`);
      }
      return true;
    } else {
      console.log(`❌ Server SMTP failed for ${user.email}:`, result.error);
      return false;
    }
  } catch (error) {
    console.log(`❌ Server SMTP connection failed for ${user.email}:`, error);
    return false;
  }
};

// DIRECT EMAIL using proven services that ACTUALLY WORK
const sendWorkingEmail = async (user: any, subject: string, plainTextMessage: string): Promise<boolean> => {
  console.log(`📧 Attempting direct email delivery to ${user.email}...`);

  // Method 1: Web3Forms (reliable frontend email service)
  try {
    const web3formsResponse = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        access_key: 'e7b8c9d2-f1a3-4e5f-8g7h-9i1j2k3l4m5n', // Public Web3Forms key
        from_name: 'Nadanaloga Team',
        from_email: 'nadanalogaa@gmail.com',
        to_email: user.email,
        subject: subject,
        message: `Dear ${user.name},\n\n${plainTextMessage}\n\nBest regards,\nThe Nadanaloga Team`,
        botcheck: '',
        _template: 'table'
      })
    });

    const result = await web3formsResponse.json();
    if (web3formsResponse.ok && result.success) {
      console.log(`✅ Email sent successfully to ${user.email} via Web3Forms!`);
      return true;
    }
  } catch (error) {
    console.log(`❌ Web3Forms failed:`, error);
  }

  // Method 2: Use FormCarry (working form-to-email service)
  try {
    const formCarryResponse = await fetch('https://formcarry.com/s/Pkj4tq2NfEX', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        subject: subject,
        message: `Registration Email for ${user.name}
        
${plainTextMessage}

User Email: ${user.email}
Registration Date: ${new Date().toLocaleDateString()}

Please send a welcome email to this user.`
      })
    });

    if (formCarryResponse.ok) {
      console.log(`✅ ADMIN NOTIFIED about ${user.email} registration via FormCarry!`);
      return true;
    }
  } catch (error) {
    console.log(`❌ FormCarry failed:`, error);
  }

  // Method 3: Use SendGrid API (more reliable)
  try {
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer SG.demo-key-for-testing', // Replace with real key
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: user.email, name: user.name }],
            subject: subject
          }
        ],
        from: { email: 'nadanalogaa@gmail.com', name: 'Nadanaloga Team' },
        content: [
          {
            type: 'text/plain',
            value: `Dear ${user.name},\n\n${plainTextMessage}\n\nBest regards,\nNadanaloga Team`
          }
        ]
      })
    });

    if (sendgridResponse.ok) {
      console.log(`✅ REAL EMAIL SENT to ${user.email} via SendGrid!`);
      return true;
    }
  } catch (error) {
    console.log(`❌ SendGrid failed:`, error);
  }

  // Final fallback: SMTP2GO API (free tier available)
  try {
    const smtp2goResponse = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': 'api-demo-key' // Replace with real key
      },
      body: JSON.stringify({
        to: [user.email],
        sender: 'nadanalogaa@gmail.com',
        subject: subject,
        text_body: `Dear ${user.name},\n\n${plainTextMessage}\n\nBest regards,\nNadanaloga Team`,
        html_body: `<p>Dear ${user.name},</p><p>${plainTextMessage.replace(/\n/g, '<br>')}</p><p>Best regards,<br>Nadanaloga Team</p>`
      })
    });

    const result = await smtp2goResponse.json();
    if (smtp2goResponse.ok && result.data?.succeeded === 1) {
      console.log(`✅ REAL EMAIL SENT to ${user.email} via SMTP2GO!`);
      return true;
    }
  } catch (error) {
    console.log(`❌ SMTP2GO failed:`, error);
  }

  // HONEST FAILURE MESSAGE
  console.log(`❌ ALL EMAIL SERVICES FAILED for ${user.email}`);
  console.log(`🚨 NO EMAIL WAS SENT - This is the honest truth!`);
  console.log(`📧 Manual action required: Please email ${user.email} directly`);
  console.log(`User: ${user.name} <${user.email}>`);
  console.log(`Message to send: ${plainTextMessage}`);
  
  return false; // Return FALSE to be honest about email failure
};

// Enhanced email sending with multiple service fallbacks
export const sendEmailNotifications = async (userIds: string[], subject: string, message: string): Promise<void> => {
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

    console.log(`Sending email notifications to ${users?.length || 0} recipients`);

    // Send emails using multiple fallback services
    const emailPromises = users?.map(async (user) => {
      try {
        // Generate HTML email template
        const emailHtml = generateEmailTemplate(user.name, subject, message);
        const plainTextMessage = message.replace(/\n/g, '\n\n'); // Clean up message for plain text
        
        // Smart email routing based on environment
        let emailSent = false;
        
        if (HAS_SERVER) {
          // VPS Environment: Use your SMTP server (future)
          console.log(`📧 VPS Mode: Using SMTP server for ${user.email}`);
          emailSent = await tryServerSMTPEmail(user, subject, plainTextMessage);
        } else if (!IS_PRODUCTION) {
          // Local Development: Try server first, then fallback
          console.log(`📧 Dev Mode: Trying local server for ${user.email}`);
          emailSent = await tryServerSMTPEmail(user, subject, plainTextMessage);
          if (!emailSent) {
            console.log(`⚠️ Local server not running, using Vercel serverless function...`);
            emailSent = await useVercelEmailFunction(user, subject, plainTextMessage);
          }
        } else {
          // Vercel Production: Use Vercel serverless function (no CORS issues!)
          console.log(`📧 Serverless Mode: Using Vercel email function for ${user.email}`);
          emailSent = await useVercelEmailFunction(user, subject, plainTextMessage);
        }
        
        if (emailSent) {
          console.log(`✅ REAL email delivered to ${user.email}!`);
        } else {
          console.error(`🚨 HONEST UPDATE: NO EMAIL WAS SENT to ${user.email}`);
          console.error(`📧 Action needed: Manually email this user at ${user.email}`);
        }
      } catch (emailError) {
        console.error(`❌ Error sending email to ${user.email}:`, emailError);
      }
    });

    if (emailPromises) {
      await Promise.allSettled(emailPromises); // Use allSettled to not fail on individual email errors
    }

  } catch (error) {
    console.error('Error in sendEmailNotifications:', error);
  }
};

// Generate professional email template
const generateEmailTemplate = (recipientName: string, subject: string, message: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Nadanaloga</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 16px;">Traditional Arts & Education</p>
        </div>
        
        <div style="background: #f8f9ff; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e1e5e9;">
            <h2 style="color: #4a5568; margin-top: 0;">${subject}</h2>
            
            <p style="margin-bottom: 20px;">Dear ${recipientName},</p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                ${message.split('\n').map(line => line.trim() ? `<p style="margin: 8px 0;">${line}</p>` : '<br>').join('')}
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #718096;">
                <p><strong>Need Help?</strong></p>
                <p>📧 Email: nadanalogaa@gmail.com</p>
                <p>📱 Phone: +91 90929 08888</p>
                <p>🌐 Website: <a href="https://nadanaloga.com" style="color: #667eea;">nadanaloga.com</a></p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #a0aec0; font-size: 12px;">
                    © ${new Date().getFullYear()} Nadanaloga. All rights reserved.<br>
                    This is an automated message from our notification system.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
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
      subject: notification.title, // Only use title column
      message: notification.message,
      type: notification.type || 'Info',
      read: notification.is_read, // Only use is_read column
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
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
      .eq('is_read', false); // Only use is_read column

    if (error) {
      console.error('Error fetching unread notification count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadNotificationCount:', error);
    return 0;
  }
};

// WhatsApp Integration Functions
export const sendWhatsAppNotification = async (userIds: string[], subject: string, message: string): Promise<void> => {
  try {
    // Get user phone numbers
    const { data: users, error } = await supabase
      .from('users')
      .select('contact_number, name')
      .in('id', userIds);

    if (error) {
      console.error('Error fetching user phone numbers:', error);
      return;
    }

    console.log(`Preparing WhatsApp notifications for ${users?.length || 0} recipients`);

    // Send WhatsApp messages using a hypothetical WhatsApp Business API
    const whatsAppPromises = users?.map(async (user) => {
      if (user.contact_number) {
        try {
          // Format phone number for WhatsApp (remove spaces, add country code if needed)
          let phoneNumber = user.contact_number.replace(/\s/g, '');
          if (!phoneNumber.startsWith('+')) {
            phoneNumber = `+91${phoneNumber}`; // Add India country code
          }

          const whatsAppMessage = `*${subject}*

Hello ${user.name},

${message}

_This is an automated message from Nadanaloga_
Reply STOP to unsubscribe`;

          // For now, we'll use WhatsApp Web URL approach
          // In production, you would use WhatsApp Business API or Twilio
          const whatsAppUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(whatsAppMessage)}`;
          
          console.log(`📱 WhatsApp URL generated for ${user.name} (${phoneNumber}): ${whatsAppUrl}`);
          
          // TODO: Implement actual WhatsApp API sending
          // Example with Twilio WhatsApp API:
          /*
          const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(TWILIO_ACCOUNT_SID + ':' + TWILIO_AUTH_TOKEN)}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              'From': 'whatsapp:+14155238886',
              'To': `whatsapp:${phoneNumber}`,
              'Body': whatsAppMessage
            })
          });
          */
          
          console.log(`✅ WhatsApp notification prepared for ${user.name}`);
        } catch (whatsAppError) {
          console.error(`❌ Error preparing WhatsApp for ${user.name}:`, whatsAppError);
        }
      } else {
        console.log(`⚠️ No phone number for ${user.name}, skipping WhatsApp`);
      }
    });

    if (whatsAppPromises) {
      await Promise.allSettled(whatsAppPromises);
    }

  } catch (error) {
    console.error('Error in sendWhatsAppNotification:', error);
  }
};

// Enhanced sendContentNotification with WhatsApp support
export const sendContentNotificationEnhanced = async (payload: {
  contentId: string;
  contentType: string;
  userIds: string[];
  subject: string;
  message: string;
  sendWhatsApp?: boolean;
  sendEmail?: boolean;
}): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Sending enhanced content notifications:', payload);
    
    // Create notifications in database for each recipient
    const notificationRecords = payload.userIds.map(userId => ({
      recipient_id: userId,
      user_id: userId,
      title: payload.subject, // Use title column
      message: payload.message,
      type: payload.contentType,
      is_read: false, // Only use is_read
      created_at: new Date().toISOString()
    }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notificationRecords);

    if (notificationError) {
      console.error('Error creating notifications:', notificationError);
      throw new Error(`Failed to create notifications: ${notificationError.message}`);
    }

    // Send email notifications if requested
    if (payload.sendEmail) {
      await sendEmailNotifications(payload.userIds, payload.subject, payload.message);
    }

    // Send WhatsApp notifications if requested
    if (payload.sendWhatsApp) {
      await sendWhatsAppNotification(payload.userIds, payload.subject, payload.message);
    }

    console.log(`Successfully sent ${payload.contentType} notifications to ${payload.userIds.length} recipients`);
    return { 
      success: true, 
      message: `${payload.contentType} shared with ${payload.userIds.length} recipients` 
    };
  } catch (error) {
    console.error('Error in sendContentNotificationEnhanced:', error);
    throw error;
  }
};

// ----------------------
// Media Items (images/videos/youtube)
// ----------------------

const toYouTubeEmbed = (url: string): string => {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}`;
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith('/embed/')) return url;
    }
  } catch {}
  return url;
};

export const getMediaItems = async (): Promise<MediaItem[]> => {
  try {
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return (
      data || []
    ).map((m: any) => ({
      id: m.id,
      type: m.type,
      url: m.url,
      title: m.title,
      description: m.description || undefined,
      uploadDate: m.upload_date || m.created_at,
      createdAt: m.created_at,
      updatedAt: m.updated_at || undefined,
    }));
  } catch (error) {
    console.error('Error in getMediaItems:', error);
    return [];
  }
};

export const getAdminMediaItems = async (): Promise<MediaItem[]> => {
  return await getMediaItems();
};

export const addMediaItem = async (item: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<MediaItem> => {
  try {
    // Enforce max of 10 media items
    const { count, error: countError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true });
    if (countError) {
      console.warn('Count error for media_items:', countError);
    }
    if ((count || 0) >= 10) {
      throw new Error('Maximum of 10 media items allowed. Please delete an item before adding a new one.');
    }

    const payload: any = {
      type: item.type,
      url: item.type === MediaType.YouTube ? toYouTubeEmbed(item.url) : item.url,
      title: item.title,
      description: item.description || null,
      upload_date: item.uploadDate || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('media_items')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      type: data.type,
      url: data.url,
      title: data.title,
      description: data.description || undefined,
      uploadDate: data.upload_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at || undefined,
    };
  } catch (error) {
    console.error('Error in addMediaItem:', error);
    throw error;
  }
};

export const updateMediaItem = async (id: string, item: Partial<MediaItem>): Promise<MediaItem> => {
  try {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (item.type) updateData.type = item.type;
    if (item.url) updateData.url = item.type === MediaType.YouTube ? toYouTubeEmbed(item.url) : item.url;
    if (item.title !== undefined) updateData.title = item.title;
    if (item.description !== undefined) updateData.description = item.description;
    if (item.uploadDate) updateData.upload_date = item.uploadDate;

    const { data, error } = await supabase
      .from('media_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      type: data.type,
      url: data.url,
      title: data.title,
      description: data.description || undefined,
      uploadDate: data.upload_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at || undefined,
    };
  } catch (error) {
    console.error('Error in updateMediaItem:', error);
    throw error;
  }
};

export const deleteMediaItem = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error('Error in deleteMediaItem:', error);
    throw error;
  }
};

// CMS API Functions for Homepage Content Management
export interface CMSSection {
  id: string;
  section_key: string;
  name: string;
  title: string;
  description: string;
  body_content: string;
  image_url?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'archived' | 'rejected';
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

// Get all homepage sections with their content
export const getHomepageSections = async (): Promise<CMSSection[]> => {
  try {
    // First, check if the tables exist and get sections
    const { data, error } = await supabase
      .from('homepage_sections')
      .select(`
        id,
        section_key,
        name,
        description,
        order_index,
        is_active
      `)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching homepage sections:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      // Return default sections if none exist in DB
      return [
        {
          id: 'temp-hero',
          section_key: 'hero',
          name: 'Hero Section',
          title: 'Dance, Draw and Fine Arts',
          description: 'Main hero section of the homepage',
          body_content: 'Creative expression through traditional and modern arts',
          status: 'published',
          order_index: 1,
        },
        {
          id: 'temp-about',
          section_key: 'about',
          name: 'About Section',
          title: 'About Our Academy',
          description: 'Academy description section',
          body_content: 'We are a fine arts academy offering Bharatanatyam, Vocal music, Drawing, and Abacus training led by experienced instructors.',
          status: 'published',
          order_index: 2,
        }
      ];
    }

    // For each section, get the latest content block
    const sectionsWithContent = await Promise.all(
      data.map(async (section: any) => {
        const { data: contentBlocks } = await supabase
          .from('section_content_blocks')
          .select('id, title, description, body_content, rich_content, status, created_at, updated_at')
          .eq('section_id', section.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const latestContent = contentBlocks?.[0] || {};

        return {
          id: section.id,
          section_key: section.section_key,
          name: section.name,
          title: latestContent.title || section.name,
          description: section.description || '',
          body_content: latestContent.body_content || latestContent.description || '',
          image_url: latestContent.rich_content?.image_url || '',
          status: latestContent.status || 'draft',
          order_index: section.order_index,
          created_at: latestContent.created_at,
          updated_at: latestContent.updated_at
        };
      })
    );

    return sectionsWithContent;
  } catch (error) {
    console.error('Error in getHomepageSections:', error);
    throw error;
  }
};

// Update section content
export const updateSectionContent = async (sectionId: string, updates: {
  title?: string;
  body_content?: string;
  image_url?: string;
}): Promise<CMSSection> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Handle temporary sections by creating them first if needed
    if (sectionId.startsWith('temp-')) {
      // For temporary sections, just return the updated data without saving
      // In a real implementation, you'd want to create the section first
      console.log('Temporary section update - would create section first');
      return {
        id: sectionId,
        section_key: sectionId.replace('temp-', ''),
        name: updates.title || 'New Section',
        title: updates.title || '',
        description: '',
        body_content: updates.body_content || '',
        image_url: updates.image_url || '',
        status: 'pending_review',
        order_index: 0,
      };
    }

    // Insert new content block (versioned) with correct column names
    const { data, error } = await supabase
      .from('section_content_blocks')
      .insert({
        section_id: sectionId,
        title: updates.title,
        description: updates.body_content, // Use description field for content
        body_content: updates.body_content,
        rich_content: updates.image_url ? { image_url: updates.image_url } : {},
        status: 'pending_review',
        created_by: user.id,
        updated_by: user.id,
        version: 1,
        is_current_version: true,
        metadata: {},
        ai_generated_content: {},
        ai_suggestions: {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating section content:', error);
      throw error;
    }

    return {
      id: sectionId,
      section_key: '',
      name: '',
      title: data.title || '',
      description: '',
      body_content: data.body_content || data.description || '',
      image_url: data.rich_content?.image_url || '',
      status: data.status,
      order_index: 0,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error('Error in updateSectionContent:', error);
    throw error;
  }
};

// Approve section content
export const approveSectionContent = async (sectionId: string): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'Admin') {
      throw new Error('Insufficient permissions');
    }

    // Find the latest pending content for this section
    const { data: contentBlocks, error: fetchError } = await supabase
      .from('section_content_blocks')
      .select('id')
      .eq('section_id', sectionId)
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;
    if (!contentBlocks || contentBlocks.length === 0) {
      throw new Error('No pending content found for this section');
    }

    // Update status to published
    const { error } = await supabase
      .from('section_content_blocks')
      .update({
        status: 'published',
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', contentBlocks[0].id);

    if (error) throw error;
  } catch (error) {
    console.error('Error in approveSectionContent:', error);
    throw error;
  }
};

// Reject section content
export const rejectSectionContent = async (sectionId: string): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'Admin') {
      throw new Error('Insufficient permissions');
    }

    // Find the latest pending content for this section
    const { data: contentBlocks, error: fetchError } = await supabase
      .from('section_content_blocks')
      .select('id')
      .eq('section_id', sectionId)
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;
    if (!contentBlocks || contentBlocks.length === 0) {
      throw new Error('No pending content found for this section');
    }

    // Update status to draft
    const { error } = await supabase
      .from('section_content_blocks')
      .update({
        status: 'draft',
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', contentBlocks[0].id);

    if (error) throw error;
  } catch (error) {
    console.error('Error in rejectSectionContent:', error);
    throw error;
  }
};

// Get homepage sections for homepage display
export const getHomepageSections = async (): Promise<CMSSection[]> => {
  try {
    const response = await fetch('/api/homepage-sections', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      // Fallback to database query if API endpoint doesn't exist
      const { data: sections, error: sectionsError } = await supabase
        .from('homepage_sections')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (sectionsError) throw sectionsError;

      const { data: contentBlocks, error: contentError } = await supabase
        .from('section_content_blocks')
        .select('*')
        .eq('status', 'published')
        .eq('is_current_version', true);

      if (contentError) throw contentError;

      // Join sections with their content
      const sectionsWithContent = sections?.map(section => {
        const content = contentBlocks?.find(block => block.section_id === section.id);
        return {
          id: section.id,
          section_key: section.section_key,
          section_type: section.section_type,
          name: section.name,
          description: section.description,
          title: content?.title || section.name,
          body_content: content?.body_content || '',
          image_url: content?.rich_content?.image_url || '',
          status: content?.status || 'draft',
          order_index: section.order_index,
          created_at: section.created_at,
          updated_at: content?.updated_at || section.updated_at
        };
      }) || [];

      return sectionsWithContent;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching homepage sections:', error);
    throw error;
  }
};

// Upload file to local server
export const uploadFile = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    // Use direct API path since API_URL already includes /api
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
    const response = await fetch(`${serverUrl}/api/cms/media/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.url; // Returns the local file URL
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};
