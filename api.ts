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
  // Enhanced mock login with proper admin detection
  const normalizedEmail = email.toLowerCase().trim();
  
  let role: 'Admin' | 'Student' | 'Teacher' = 'Student';
  let name = 'Demo User';
  
  // Check for admin emails
  if (normalizedEmail === 'admin@nadanaloga.com' || 
      normalizedEmail.includes('admin') || 
      normalizedEmail === 'nadanalogaa@gmail.com') {
    role = 'Admin';
    name = 'Administrator';
  } else if (normalizedEmail.includes('teacher')) {
    role = 'Teacher';
    name = 'Demo Teacher';
  } else {
    role = 'Student';
    name = 'Demo Student';
  }
  
  const mockUser: User = {
    id: role === 'Admin' ? 'admin-001' : `user-${Date.now()}`,
    name: name,
    email: normalizedEmail,
    role: role,
    classPreference: 'Online'
  };
  
  // Store in session
  currentUser = mockUser;
  
  // Also store in localStorage for persistence
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentUser', JSON.stringify(mockUser));
  }
  
  console.log('User logged in:', mockUser);
  return mockUser;
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
  // Return mock courses for now
  return [
    {
      id: '1',
      name: 'Bharatanatyam',
      description: 'Explore the grace and storytelling of classical Indian dance.',
      icon: 'Bharatanatyam'
    },
    {
      id: '2', 
      name: 'Vocal',
      description: 'Develop your singing voice with professional training techniques.',
      icon: 'Vocal'
    },
    {
      id: '3',
      name: 'Drawing', 
      description: 'Learn to express your creativity through sketching and painting.',
      icon: 'Drawing'
    },
    {
      id: '4',
      name: 'Abacus',
      description: 'Enhance mental math skills and concentration with our abacus program.',
      icon: 'Abacus'
    }
  ];
};

export const submitContactForm = async (data: ContactFormData): Promise<{success: boolean}> => {
  // Mock success for now
  console.log('Contact form submitted:', data);
  return { success: true };
};

// All other functions as placeholders to prevent errors
export const registerUser = async (userData: Partial<User>[]): Promise<any> => ({ message: 'Registration successful' });
export const registerAdmin = async (userData: Partial<User>): Promise<any> => ({ message: 'Admin registration successful' });
export const updateUserProfile = async (userData: Partial<User>): Promise<User> => {
  if (currentUser) {
    currentUser = { ...currentUser, ...userData };
    return currentUser;
  }
  throw new Error('No user logged in');
};

// Admin functions
export const getAdminStats = async (): Promise<DashboardStats> => ({
  totalUsers: 25, studentCount: 20, teacherCount: 5, onlinePreference: 12, offlinePreference: 13
});

export const getAdminUsers = async (): Promise<User[]> => [
  { id: '1', name: 'Priya Sharma', email: 'priya@example.com', role: 'Student', classPreference: 'Online', courses: ['Bharatanatyam'] },
  { id: '2', name: 'Ravi Kumar', email: 'ravi@example.com', role: 'Student', classPreference: 'Offline', courses: ['Vocal'] },
  { id: '3', name: 'Anitha Teacher', email: 'anitha@example.com', role: 'Teacher', classPreference: 'Hybrid', courseExpertise: ['Drawing'] },
  { id: '4', name: 'Meera Devi', email: 'meera@example.com', role: 'Student', classPreference: 'Online', courses: ['Abacus'] },
  { id: '5', name: 'Suresh Sir', email: 'suresh@example.com', role: 'Teacher', classPreference: 'Offline', courseExpertise: ['Bharatanatyam', 'Vocal'] }
] as User[];
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
export const getBatches = async (): Promise<Batch[]> => [
  { id: '1', name: 'Morning Bharatanatyam', description: 'Beginner level classical dance', courseId: '1', courseName: 'Bharatanatyam', teacherId: '5', schedule: [] },
  { id: '2', name: 'Evening Vocal', description: 'Carnatic vocal training', courseId: '2', courseName: 'Vocal', teacherId: '5', schedule: [] },
  { id: '3', name: 'Kids Drawing', description: 'Creative art for children', courseId: '3', courseName: 'Drawing', teacherId: '3', schedule: [] }
] as Batch[];
export const addBatch = async (batchData: Partial<Batch>): Promise<Batch> => ({ ...batchData, id: '123' } as Batch);
export const updateBatch = async (batchId: string, batchData: Partial<Batch>): Promise<Batch> => ({ ...batchData, id: batchId } as Batch);
export const deleteBatch = async (batchId: string): Promise<void> => {};

// Notification functions
export const getNotifications = async (): Promise<Notification[]> => [
  { id: '1', userId: '1', subject: 'Welcome to Nadanaloga!', message: 'Thank you for joining our educational platform. Start exploring your courses today!', read: false, createdAt: new Date('2024-08-27') },
  { id: '2', userId: '1', subject: 'New Course Available', message: 'Check out our new Abacus course designed for all skill levels.', read: false, createdAt: new Date('2024-08-26') },
  { id: '3', userId: '1', subject: 'Class Schedule Update', message: 'Your Bharatanatyam class timing has been updated. Please check the new schedule.', read: true, createdAt: new Date('2024-08-25') }
] as Notification[];
export const markNotificationAsRead = async (notificationId: string): Promise<Notification> => ({ id: notificationId, subject: 'Demo', message: 'Demo', read: true, createdAt: new Date(), userId: '1' } as Notification);

// Fee management functions
export const getFeeStructures = async (): Promise<FeeStructure[]> => [];
export const addFeeStructure = async (structureData: Omit<FeeStructure, 'id'>): Promise<FeeStructure> => ({ ...structureData, id: '123' } as FeeStructure);
export const updateFeeStructure = async (structureId: string, structureData: Partial<FeeStructure>): Promise<FeeStructure> => ({ ...structureData, id: structureId } as FeeStructure);
export const deleteFeeStructure = async (structureId: string): Promise<void> => {};
export const getAdminInvoices = async (): Promise<Invoice[]> => [];
export const generateInvoices = async (): Promise<{ message: string }> => ({ message: 'Invoices generated' });
export const recordPayment = async (invoiceId: string, paymentData: PaymentDetails): Promise<Invoice> => ({ id: invoiceId } as Invoice);

// Student functions
export const getStudentInvoices = async (): Promise<Invoice[]> => [];
export const getStudentEnrollments = async (): Promise<StudentEnrollment[]> => [];

// Family functions
export const getFamilyStudents = async (): Promise<User[]> => [];
export const getStudentInvoicesForFamily = async (studentId: string): Promise<Invoice[]> => [];
export const getStudentEnrollmentsForFamily = async (studentId: string): Promise<StudentEnrollment[]> => [];

// Trash functions
export const getTrashedUsers = async (): Promise<User[]> => [];
export const restoreUser = async (userId: string): Promise<User> => ({ id: userId } as User);
export const deleteUserPermanently = async (userId: string): Promise<void> => {};

// Location functions
export const getPublicLocations = async (): Promise<Location[]> => [];
export const getLocations = async (): Promise<Location[]> => [];
export const addLocation = async (location: Omit<Location, 'id'>): Promise<Location> => ({ ...location, id: '123' } as Location);
export const updateLocation = async (id: string, location: Partial<Location>): Promise<Location> => ({ ...location, id } as Location);
export const deleteLocation = async (id: string): Promise<void> => {};

// Content functions
export const getEvents = async (): Promise<Event[]> => [];
export const getAdminEvents = async (): Promise<Event[]> => [];
export const addEvent = async (event: Omit<Event, 'id'>): Promise<Event> => ({ ...event, id: '123' } as Event);
export const updateEvent = async (id: string, event: Partial<Event>): Promise<Event> => ({ ...event, id } as Event);
export const deleteEvent = async (id: string): Promise<void> => {};

export const getGradeExams = async (): Promise<GradeExam[]> => [];
export const getAdminGradeExams = async (): Promise<GradeExam[]> => [];
export const addGradeExam = async (exam: Omit<GradeExam, 'id'>): Promise<GradeExam> => ({ ...exam, id: '123' } as GradeExam);
export const updateGradeExam = async (id: string, exam: Partial<GradeExam>): Promise<GradeExam> => ({ ...exam, id } as GradeExam);
export const deleteGradeExam = async (id: string): Promise<void> => {};

export const getBookMaterials = async (): Promise<BookMaterial[]> => [];
export const getAdminBookMaterials = async (): Promise<BookMaterial[]> => [];
export const addBookMaterial = async (material: Omit<BookMaterial, 'id'>): Promise<BookMaterial> => ({ ...material, id: '123' } as BookMaterial);
export const updateBookMaterial = async (id: string, material: Partial<BookMaterial>): Promise<BookMaterial> => ({ ...material, id } as BookMaterial);
export const deleteBookMaterial = async (id: string): Promise<void> => {};

export const getNotices = async (): Promise<Notice[]> => [];
export const getAdminNotices = async (): Promise<Notice[]> => [];
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