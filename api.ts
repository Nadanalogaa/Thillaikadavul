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
  
  if (typeof window !== 'undefined') {
    // First check if this is a registered admin
    const registeredAdmins = JSON.parse(localStorage.getItem('registeredAdmins') || '[]');
    const registeredAdmin = registeredAdmins.find((admin: any) => admin.email?.toLowerCase() === normalizedEmail);
    
    if (registeredAdmin) {
      const adminUser: User = {
        id: registeredAdmin.id || 'admin-001',
        name: registeredAdmin.name || 'Administrator',
        email: normalizedEmail,
        role: 'Admin',
        classPreference: 'Hybrid'
      };
      
      currentUser = adminUser;
      localStorage.setItem('currentUser', JSON.stringify(adminUser));
      console.log('Admin logged in:', adminUser);
      return adminUser;
    }
    
    // Check if this is a registered user (student/teacher/parent)
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const registeredUser = registeredUsers.find((user: User) => user.email?.toLowerCase() === normalizedEmail);
    
    if (registeredUser) {
      const userData: User = {
        ...registeredUser,
        id: registeredUser.id || `user-${Date.now()}`,
        email: normalizedEmail
      };
      
      currentUser = userData;
      localStorage.setItem('currentUser', JSON.stringify(userData));
      console.log('Registered user logged in:', userData);
      return userData;
    }
    
    // Check for students registered under this email (parent login)
    const familyStudents = registeredUsers.filter((user: User) => {
      if (user.role !== 'Student') return false;
      const studentEmailBase = user.email?.split('+')[0];
      return studentEmailBase === normalizedEmail;
    });
    
    if (familyStudents.length > 0) {
      // Create parent/guardian user based on first student's data
      const firstStudent = familyStudents[0];
      const parentUser: User = {
        id: `parent-${Date.now()}`,
        name: firstStudent.fatherName || 'Guardian',
        email: normalizedEmail,
        role: 'Student', // Parents use student dashboard to view family
        classPreference: 'Online',
        contactNumber: firstStudent.contactNumber,
        address: firstStudent.address,
        country: firstStudent.country,
        state: firstStudent.state,
        city: firstStudent.city,
        postalCode: firstStudent.postalCode
      };
      
      currentUser = parentUser;
      localStorage.setItem('currentUser', JSON.stringify(parentUser));
      console.log('Parent logged in:', parentUser);
      return parentUser;
    }
  }
  
  // Fallback for default admin emails
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
  
  // If no match found, throw error
  throw new Error('Invalid email or password. Please check your credentials or register first.');
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

// Helper function to initialize basic courses if none exist
const initializeBasicCourses = (): Course[] => {
  const basicCourses: Course[] = [
    {
      id: 'course-1',
      name: 'Bharatanatyam',
      description: 'Classical Indian dance form',
      icon: 'Bharatanatyam'
    },
    {
      id: 'course-2',
      name: 'Vocal',
      description: 'Carnatic vocal music',
      icon: 'Vocal'
    },
    {
      id: 'course-3',
      name: 'Drawing',
      description: 'Art and drawing classes',
      icon: 'Drawing'
    },
    {
      id: 'course-4',
      name: 'Abacus',
      description: 'Mental arithmetic training',
      icon: 'Abacus'
    }
  ];
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('courses', JSON.stringify(basicCourses));
  }
  return basicCourses;
};

export const getCourses = async (): Promise<Course[]> => {
  if (typeof window !== 'undefined') {
    const courses = localStorage.getItem('courses');
    if (courses) {
      const parsedCourses = JSON.parse(courses);
      if (parsedCourses.length > 0) {
        return parsedCourses;
      }
    }
    // Initialize basic courses if none exist
    return initializeBasicCourses();
  }
  return [];
};

export const submitContactForm = async (data: ContactFormData): Promise<{success: boolean}> => {
  // Mock success for now
  console.log('Contact form submitted:', data);
  return { success: true };
};

// All other functions as placeholders to prevent errors
export const registerUser = async (userData: Partial<User>[]): Promise<any> => {
  // Store user registration data in localStorage
  if (typeof window !== 'undefined' && userData.length > 0) {
    const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    
    const newUsers = userData.map(user => ({
      ...user,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: user.role || 'Student',
      dateOfJoining: new Date().toISOString()
    }));
    
    const allUsers = [...existingUsers, ...newUsers];
    localStorage.setItem('registeredUsers', JSON.stringify(allUsers));
    
    console.log('Users registered successfully:', newUsers);
  }
  return { message: 'Registration successful' };
};
export const registerAdmin = async (userData: Partial<User>): Promise<any> => {
  // Store admin data in localStorage for persistent registration
  if (typeof window !== 'undefined') {
    const adminData = {
      id: `admin-${Date.now()}`,
      ...userData,
      role: 'Admin',
      classPreference: 'Hybrid'
    };
    
    // Store in a list of registered admins
    const existingAdmins = JSON.parse(localStorage.getItem('registeredAdmins') || '[]');
    existingAdmins.push(adminData);
    localStorage.setItem('registeredAdmins', JSON.stringify(existingAdmins));
    
    console.log('Admin registered successfully:', adminData);
  }
  return { message: 'Admin registration successful' };
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
  if (typeof window !== 'undefined') {
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const studentCount = users.filter((u: User) => u.role === 'Student').length;
    const teacherCount = users.filter((u: User) => u.role === 'Teacher').length;
    const onlinePreference = users.filter((u: User) => u.classPreference === 'Online').length;
    const offlinePreference = users.filter((u: User) => u.classPreference === 'Offline').length;
    
    return {
      totalUsers: users.length,
      studentCount,
      teacherCount,
      onlinePreference,
      offlinePreference
    };
  }
  return { totalUsers: 0, studentCount: 0, teacherCount: 0, onlinePreference: 0, offlinePreference: 0 };
};

export const getAdminUsers = async (): Promise<User[]> => {
  if (typeof window !== 'undefined') {
    const users = localStorage.getItem('registeredUsers');
    if (users) {
      return JSON.parse(users);
    }
  }
  return [];
};
export const getAdminUserById = async (userId: string): Promise<User> => ({ id: userId, name: 'Demo User', email: 'demo@example.com', role: 'Student' } as User);
export const addStudentByAdmin = async (userData: Partial<User>): Promise<User> => ({ ...userData, id: '123' } as User);
export const updateUserByAdmin = async (userId: string, userData: Partial<User>): Promise<User> => ({ ...userData, id: userId } as User);
export const deleteUserByAdmin = async (userId: string): Promise<void> => {};
export const sendNotification = async (userIds: string[], subject: string, message: string): Promise<{success: boolean}> => ({ success: true });
export const getAdminCourses = async (): Promise<Course[]> => getCourses();
export const addCourseByAdmin = async (courseData: Omit<Course, 'id'>): Promise<Course> => ({ ...courseData, id: '123' } as Course);
export const updateCourseByAdmin = async (courseId: string, courseData: Partial<Omit<Course, 'id'>>): Promise<Course> => ({ ...courseData, id: courseId } as Course);
export const deleteCourseByAdmin = async (courseId: string): Promise<void> => {};

// Batch functions
export const getBatches = async (): Promise<Batch[]> => {
  if (typeof window !== 'undefined') {
    const batches = localStorage.getItem('batches');
    if (batches) {
      return JSON.parse(batches);
    }
  }
  return [];
};
export const addBatch = async (batchData: Partial<Batch>): Promise<Batch> => ({ ...batchData, id: '123' } as Batch);
export const updateBatch = async (batchId: string, batchData: Partial<Batch>): Promise<Batch> => ({ ...batchData, id: batchId } as Batch);
export const deleteBatch = async (batchId: string): Promise<void> => {};

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
export const markNotificationAsRead = async (notificationId: string): Promise<Notification> => ({ id: notificationId, subject: 'Demo', message: 'Demo', read: true, createdAt: new Date(), userId: '1' } as Notification);

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
  if (typeof window !== 'undefined') {
    const currentUserData = localStorage.getItem('currentUser');
    if (currentUserData) {
      const currentUser = JSON.parse(currentUserData);
      const allUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      
      // Find students that belong to this family
      // Students are registered with guardian's email or guardian's email+studentN format
      const familyStudents = allUsers.filter((user: User) => {
        if (user.role !== 'Student') return false;
        
        // Check if this student belongs to current user's family
        const studentEmailBase = user.email?.split('+')[0]; // Remove +student2 etc
        const currentUserEmailBase = currentUser.email?.split('+')[0];
        
        return studentEmailBase === currentUserEmailBase;
      });
      
      return familyStudents;
    }
  }
  return [];
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
// Helper function to initialize basic locations if none exist
const initializeBasicLocations = (): Location[] => {
  const basicLocations: Location[] = [
    {
      id: 'loc-1',
      name: 'Main Center',
      address: 'Enter your main location address'
    },
    {
      id: 'loc-2',
      name: 'Branch 1',
      address: 'Enter branch location address'
    }
  ];
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('locations', JSON.stringify(basicLocations));
  }
  return basicLocations;
};

export const getPublicLocations = async (): Promise<Location[]> => {
  if (typeof window !== 'undefined') {
    const locations = localStorage.getItem('locations');
    if (locations) {
      const parsedLocations = JSON.parse(locations);
      if (parsedLocations.length > 0) {
        return parsedLocations;
      }
    }
    // Initialize basic locations if none exist
    return initializeBasicLocations();
  }
  return [];
};

export const getLocations = async (): Promise<Location[]> => getPublicLocations();
export const addLocation = async (location: Omit<Location, 'id'>): Promise<Location> => ({ ...location, id: '123' } as Location);
export const updateLocation = async (id: string, location: Partial<Location>): Promise<Location> => ({ ...location, id } as Location);
export const deleteLocation = async (id: string): Promise<void> => {};

// Content functions
export const getEvents = async (): Promise<Event[]> => {
  if (typeof window !== 'undefined') {
    const events = localStorage.getItem('events');
    if (events) {
      return JSON.parse(events);
    }
  }
  return [];
};

export const getAdminEvents = async (): Promise<Event[]> => getEvents();
export const addEvent = async (event: Omit<Event, 'id'>): Promise<Event> => ({ ...event, id: '123' } as Event);
export const updateEvent = async (id: string, event: Partial<Event>): Promise<Event> => ({ ...event, id } as Event);
export const deleteEvent = async (id: string): Promise<void> => {};

export const getGradeExams = async (): Promise<GradeExam[]> => {
  if (typeof window !== 'undefined') {
    const exams = localStorage.getItem('gradeExams');
    if (exams) {
      return JSON.parse(exams);
    }
  }
  return [];
};

export const getAdminGradeExams = async (): Promise<GradeExam[]> => getGradeExams();
export const addGradeExam = async (exam: Omit<GradeExam, 'id'>): Promise<GradeExam> => ({ ...exam, id: '123' } as GradeExam);
export const updateGradeExam = async (id: string, exam: Partial<GradeExam>): Promise<GradeExam> => ({ ...exam, id } as GradeExam);
export const deleteGradeExam = async (id: string): Promise<void> => {};

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