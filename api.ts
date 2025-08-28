import type { User, ContactFormData, Course, DashboardStats, Notification, Batch, FeeStructure, Invoice, PaymentDetails, StudentEnrollment, Event, GradeExam, BookMaterial, Notice, Location } from './types';
import { supabase } from './src/lib/supabase.js';

// Simple session management
let currentUser: User | null = null;

// Core working functions
export const checkEmailExists = async (email: string): Promise<{ exists: boolean }> => {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();
  
  return { exists: !!data };
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  // Simple mock login for demo
  const mockUser: User = {
    id: '1',
    name: 'Demo User',
    email: email,
    role: email === 'admin@nadanaloga.com' ? 'Admin' : 'Student',
    classPreference: 'Online'
  };
  currentUser = mockUser;
  return mockUser;
};

export const getCurrentUser = async (): Promise<User | null> => {
  return currentUser;
};

export const logout = async (): Promise<void> => {
  currentUser = null;
};

export const getCourses = async (): Promise<Course[]> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at');
    
  if (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
  
  return data || [];
};

export const submitContactForm = async (data: ContactFormData): Promise<{success: boolean}> => {
  const { error } = await supabase
    .from('contacts')
    .insert({
      name: data.name,
      email: data.email,
      message: data.message
    });
    
  return { success: !error };
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
  totalUsers: 10, studentCount: 8, teacherCount: 2, onlinePreference: 5, offlinePreference: 5
});
export const getAdminUsers = async (): Promise<User[]> => [];
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
export const getBatches = async (): Promise<Batch[]> => [];
export const addBatch = async (batchData: Partial<Batch>): Promise<Batch> => ({ ...batchData, id: '123' } as Batch);
export const updateBatch = async (batchId: string, batchData: Partial<Batch>): Promise<Batch> => ({ ...batchData, id: batchId } as Batch);
export const deleteBatch = async (batchId: string): Promise<void> => {};

// Notification functions
export const getNotifications = async (): Promise<Notification[]> => [];
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