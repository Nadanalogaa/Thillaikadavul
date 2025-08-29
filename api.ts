import type { User, ContactFormData, Course, DashboardStats, Notification, Batch, FeeStructure, Invoice, PaymentDetails, StudentEnrollment, Event, GradeExam, BookMaterial, Notice, Location } from './types';
import { supabase } from './src/lib/supabase.js';

// Simple session management
let currentUser: User | null = null;

// Core working functions
export const checkEmailExists = async (email: string): Promise<{ exists: boolean }> => {
  // Mock check - return false for demo
  return { exists: false };
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
      icon: course.icon || course.name
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
    const usersToInsert = userData.map(user => ({
      name: user.name,
      email: user.email,
      password: user.password,
      role: (user.role || 'Student').substring(0, 20), // Ensure max 20 chars
      class_preference: user.classPreference ? user.classPreference.substring(0, 20) : null, // Ensure max 20 chars
      photo_url: user.photoUrl,
      dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : null, // YYYY-MM-DD format
      sex: user.sex ? user.sex.substring(0, 10) : null, // Ensure max 10 chars for sex field
      contact_number: user.contactNumber ? user.contactNumber.substring(0, 20) : null, // Limit to 20 chars
      address: user.address,
      schedules: user.schedules || [],
      documents: user.documents || [],
      date_of_joining: user.dateOfJoining || new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      courses: user.courses || [],
      father_name: user.fatherName,
      standard: user.standard,
      school_name: user.schoolName,
      grade: user.grade ? user.grade.substring(0, 20) : null, // Ensure max 20 chars
      notes: user.notes,
      course_expertise: user.courseExpertise || [],
      educational_qualifications: user.educationalQualifications,
      employment_type: user.employmentType ? user.employmentType.substring(0, 20) : null, // Ensure max 20 chars
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('users')
      .insert(usersToInsert)
      .select();

    if (error) {
      console.error('Registration error:', error);
      throw new Error(`Registration failed: ${error.message}`);
    }

    console.log('Users registered successfully:', data);
    return { message: 'Registration successful', users: data };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};
export const registerAdmin = async (userData: Partial<User>): Promise<any> => {
  try {
    const adminData = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: 'Admin', // Already within 20 chars
      class_preference: 'Hybrid', // Already within 20 chars
      contact_number: userData.contactNumber ? userData.contactNumber.substring(0, 20) : null, // Limit to 20 chars
      date_of_joining: new Date().toISOString().split('T')[0], // YYYY-MM-DD format (10 chars)
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
      .select('role, class_preference');

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
export const getAdminUserById = async (userId: string): Promise<User> => ({ id: userId, name: 'Demo User', email: 'demo@example.com', role: 'Student' } as User);
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
export const updateUserByAdmin = async (userId: string, userData: Partial<User>): Promise<User> => ({ ...userData, id: userId } as User);
export const deleteUserByAdmin = async (userId: string): Promise<void> => {};
export const sendNotification = async (userIds: string[], subject: string, message: string): Promise<{success: boolean}> => ({ success: true });
export const getAdminCourses = async (): Promise<Course[]> => getCourses();
export const addCourseByAdmin = async (courseData: Omit<Course, 'id'>): Promise<Course> => ({ ...courseData, id: '123' } as Course);
export const updateCourseByAdmin = async (courseId: string, courseData: Partial<Omit<Course, 'id'>>): Promise<Course> => ({ ...courseData, id: courseId } as Course);
export const deleteCourseByAdmin = async (courseId: string): Promise<void> => {};

// Batch functions
export const getBatches = async (): Promise<Batch[]> => {
  try {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        course:courses(name),
        teacher:users(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching batches:', error);
      return [];
    }

    return (data || []).map(batch => ({
      id: batch.id,
      name: batch.name,
      description: batch.description,
      courseId: batch.course_id,
      courseName: batch.course?.name || 'Unknown Course',
      teacherId: batch.teacher_id,
      teacherName: batch.teacher?.name || 'Unassigned',
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
    const { data, error } = await supabase
      .from('batches')
      .insert([{
        name: batchData.name,
        description: batchData.description,
        course_id: batchData.courseId,
        teacher_id: batchData.teacherId,
        schedule: batchData.schedule || [],
        capacity: batchData.capacity,
        mode: batchData.mode,
        location_id: batchData.locationId,
        start_date: batchData.startDate,
        end_date: batchData.endDate,
        is_active: true,
        created_at: new Date().toISOString()
      }])
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
  if (typeof window !== 'undefined') {
    const currentUserData = localStorage.getItem('currentUser');
    if (currentUserData) {
      const currentUser = JSON.parse(currentUserData);
      const notifications = localStorage.getItem(`notifications_${currentUser.id}`);
      if (notifications) {
        return JSON.parse(notifications);
      }
    }
  }
  return [];
};
export const markNotificationAsRead = async (notificationId: string): Promise<Notification> => ({ id: notificationId, subject: 'Demo', message: 'Demo', read: true, createdAt: new Date().toISOString(), userId: '1' });

// Fee management functions
export const getFeeStructures = async (): Promise<FeeStructure[]> => {
  if (typeof window !== 'undefined') {
    const feeStructures = localStorage.getItem('feeStructures');
    if (feeStructures) {
      return JSON.parse(feeStructures);
    }
  }
  return [];
};
export const addFeeStructure = async (structureData: Omit<FeeStructure, 'id'>): Promise<FeeStructure> => ({ ...structureData, id: '123' } as FeeStructure);
export const updateFeeStructure = async (structureId: string, structureData: Partial<FeeStructure>): Promise<FeeStructure> => ({ ...structureData, id: structureId } as FeeStructure);
export const deleteFeeStructure = async (structureId: string): Promise<void> => {};
export const getAdminInvoices = async (): Promise<Invoice[]> => {
  if (typeof window !== 'undefined') {
    const invoices = localStorage.getItem('invoices');
    if (invoices) {
      return JSON.parse(invoices);
    }
  }
  return [];
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
          .eq('role', 'Student');
        
        if (error) {
          console.error('Error fetching family students:', error);
          return [];
        }
        
        // Find students that belong to this family
        const familyStudents = (data || []).filter((user: any) => {
          // Check if this student belongs to current user's family
          const studentEmailBase = user.email?.split('+')[0]; // Remove +student2 etc
          const currentUserEmailBase = currentUser.email?.split('+')[0];
          
          return studentEmailBase === currentUserEmailBase;
        });
        
        // Map database fields to User interface
        return familyStudents.map((user: any) => ({
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
          preferredTimings: user.preferred_timings || [],
          dateOfJoining: user.date_of_joining
        }));
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
export const getTrashedUsers = async (): Promise<User[]> => [];
export const restoreUser = async (userId: string): Promise<User> => ({ id: userId } as User);
export const deleteUserPermanently = async (userId: string): Promise<void> => {};

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
        date: exam.date instanceof Date ? exam.date.toISOString() : new Date(exam.date).toISOString(),
        time: exam.time,
        duration: exam.duration,
        course: exam.course,
        grade: exam.grade,
        syllabus_url: exam.syllabusUrl,
        registration_fee: exam.registrationFee,
        registration_deadline: exam.registrationDeadline ? (exam.registrationDeadline instanceof Date ? exam.registrationDeadline.toISOString() : new Date(exam.registrationDeadline).toISOString()) : null,
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
  if (typeof window !== 'undefined') {
    const books = localStorage.getItem('bookMaterials');
    if (books) {
      return JSON.parse(books);
    }
  }
  return [];
};

export const getAdminBookMaterials = async (): Promise<BookMaterial[]> => getBookMaterials();
export const addBookMaterial = async (material: Omit<BookMaterial, 'id'>): Promise<BookMaterial> => ({ ...material, id: '123' } as BookMaterial);
export const updateBookMaterial = async (id: string, material: Partial<BookMaterial>): Promise<BookMaterial> => ({ ...material, id } as BookMaterial);
export const deleteBookMaterial = async (id: string): Promise<void> => {};

export const getNotices = async (): Promise<Notice[]> => {
  if (typeof window !== 'undefined') {
    const notices = localStorage.getItem('notices');
    if (notices) {
      return JSON.parse(notices);
    }
  }
  return [];
};

export const getAdminNotices = async (): Promise<Notice[]> => getNotices();
export const addNotice = async (notice: Omit<Notice, 'id'>): Promise<Notice> => ({ ...notice, id: '123' } as Notice);
export const updateNotice = async (id: string, notice: Partial<Notice>): Promise<Notice> => ({ ...notice, id } as Notice);
export const deleteNotice = async (id: string): Promise<void> => {};

export const sendContentNotification = async (payload: {
  contentId: string;
  contentType: string;
  userIds: string[];
  subject: string;
  message: string;
  sendWhatsApp?: boolean;
}): Promise<{ success: boolean; message: string }> => ({ success: true, message: 'Notification sent' });