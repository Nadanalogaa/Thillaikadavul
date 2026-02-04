
export interface Slide {
  image: string;
  title: string;
  subtitle: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  relation: string;
  image: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface CourseTimingSlot {
  id: string;
  courseId: string;
  courseName: string;
  day: string;
  timeSlot: string;
  utcTime: string;
  localTime: string;
  istTime: string;
  timezone: string;
}

export interface Notification {
    id: string;
    userId: string;
    subject: string;
    message: string;
    read: boolean;
    createdAt: string;
    link?: string;
}

export interface DemoBooking {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    country: string;
    courseName: string;
    courseId?: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    message?: string;
    adminNotes?: string;
    createdAt: string;
    updatedAt: string;
    contactedAt?: string;
    demoScheduledAt?: string;
    preferredContactMethod?: 'email' | 'phone' | 'whatsapp';
    source?: string;
}

export enum UserRole {
  Student = 'Student',
  Teacher = 'Teacher',
  Admin = 'Admin',
}

export enum ClassPreference {
  Online = 'Online',
  Offline = 'Offline',
  Hybrid = 'Hybrid', // Added for teachers
}

export enum Sex {
    Male = 'Male',
    Female = 'Female',
    Other = 'Other',
}

export enum EmploymentType {
    PartTime = 'Part-time',
    FullTime = 'Full-time',
}

export enum Grade {
    Grade1 = 'Grade 1',
    Grade2 = 'Grade 2',
    Grade3 = 'Grade 3',
}

export interface Document {
  name: string;
  mimeType: string;
  data: string; // base64
}

export enum UserStatus {
    Active = 'Active',
    Inactive = 'Inactive',
    OnHold = 'On Hold',
    Graduated = 'Graduated',
}

export interface Location {
  id: string;
  name: string;
  address: string;
}


export interface User {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  password?: string; // In a real app, this should be a secure hash. Optional on client.
  role: UserRole;
  classPreference?: ClassPreference; 
  
  // Common fields
  photoUrl?: string; // base64 or URL
  dob?: string; // ISO string date
  sex?: Sex;
  contactNumber?: string;
  alternateContactNumber?: string;
  address?: string;
  schedules?: { course: string, timing: string, teacherId?: string }[];
  documents?: Document[];
  dateOfJoining?: string;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  timezone?: string;
  preferredTimings?: CourseTimingSlot[];
  status?: UserStatus;
  locationId?: string; // For offline preference
  location?: Location; // Populated field

  // Student specific
  courses?: string[];
  fatherName?: string;
  standard?: string;
  schoolName?: string;
  grade?: Grade;
  notes?: string;
  
  // Teacher specific
  courseExpertise?: string[];
  educationalQualifications?: string;
  employmentType?: EmploymentType;
  yearsOfExperience?: number;
  availableTimeSlots?: CourseTimingSlot[];

  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: string;
}


export interface ContactFormData {
    name: string;
    email: string;
    message: string;
    subject?: string;
    phone?: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  icon: string;
  image?: string; // URL/path for registration screen display
  icon_url?: string; // URL/path for custom icon upload (matches DB column name)
  created_at?: string;
  updated_at?: string;
}

export interface DashboardStats {
  totalUsers: number;
  studentCount: number;
  teacherCount: number;
  onlinePreference: number;
  offlinePreference: number;
}

export interface BatchSchedule {
  timing: string; // Legacy format for compatibility
  studentIds: string[];
  // New UTC fields for proper timezone handling
  startUtc?: string; // ISO string
  endUtc?: string;   // ISO string
  dayOfWeek?: number; // 0-6, Sunday = 0
}

export interface Batch {
  id: string;
  name: string;
  description: string;
  courseId: string;
  courseName: string;
  teacherId?: Partial<User> | string; // Can be string or populated object
  teacherName?: string; // For display purposes
  schedule: BatchSchedule[];
  capacity?: number; // Maximum number of students
  enrolled?: number; // Current number of enrolled students  
  mode?: ClassPreference.Online | ClassPreference.Offline;
  locationId?: string;
  location?: Location; // Populated field
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  isActive?: boolean; // Whether the batch is active
}

// --- Student Enrollment Type ---
export interface StudentEnrollment {
    studentId: string; // Student ID for the enrollment
    batchName: string;
    courseName: string;
    timings: string[];
    teacher: { id: string; name: string } | null;
    mode?: ClassPreference.Online | ClassPreference.Offline;
    location?: Location;
}

// --- Fee Management Types ---

export enum BillingCycle {
    Monthly = 'Monthly',
    Quarterly = 'Quarterly',
    Annually = 'Annually',
}

export enum Currency {
    INR = 'INR',
    USD = 'USD',
}

export interface FeeStructure {
    id: string;
    courseId: string;
    courseName: string;
    amount: number;
    currency: Currency;
    billingCycle: BillingCycle;
}

export enum InvoiceStatus {
    Pending = 'Pending',
    Paid = 'Paid',
    Overdue = 'Overdue',
}

export enum PaymentMethod {
    Cash = 'Cash',
    BankTransfer = 'Bank Transfer',
    UPI = 'UPI',
    Card = 'Card',
}

export interface PaymentDetails {
    paymentDate: string;
    amountPaid: number;
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
    notes?: string;
}

export interface Invoice {
    id: string;
    studentId: string;
    feeStructureId: string;
    courseName: string;
    amount: number;
    currency: string;
    issueDate: string;
    dueDate: string;
    billingPeriod: string;
    status: InvoiceStatus;
    paymentDetails?: PaymentDetails;
    // populated fields for display
    student?: Pick<User, 'id' | 'name' | 'email'>;
}

// --- New Content Types ---

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date; // Date object
  time?: string; // Time string like "12:00 PM"
  location?: string;
  isPublic?: boolean; // Whether event is public
  createdAt?: Date; // Creation timestamp
  recipientIds?: string[];
  createdBy?: string; // User ID who created the event
  targetAudience?: string[]; // Array of roles or course names
  images?: EventImage[]; // Array of event images
  isActive?: boolean; // Whether event is active
  priority?: 'Low' | 'Medium' | 'High';
  eventType?: 'General' | 'Academic' | 'Cultural' | 'Sports' | 'Notice';
  updatedAt?: Date;
}

export interface EventImage {
  id?: string;
  url: string;
  caption?: string;
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  displayOrder?: number;
}

export interface EventNotification {
  id: string;
  eventId: string;
  userId: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  event?: Event; // Populated event data
}

export enum BookMaterialType {
    PDF = 'PDF',
    Video = 'Video',
    YouTube = 'YouTube',
}

export interface BookMaterial {
  id: string;
  title:string;
  description: string;
  courseId: string;
  courseName: string;
  type: BookMaterialType;
  url: string; // URL for youtube or stored video, or data URI for PDF
  fileUrl?: string; // For compatibility with UI components
  linkUrl?: string; // For compatibility with UI components
  data?: string; // For base64 pdf data
  recipientIds?: string[];
  uploadedAt?: string; // For compatibility with UI components
}

export interface GradeExam {
  id: string;
  title: string;
  description: string;
  date: Date; // Exam date
  time?: string; // Exam time
  duration?: string; // Exam duration
  course?: string; // Course name  
  grade?: string; // Grade/level
  syllabusUrl?: string; // URL to syllabus
  registrationFee?: number; // Registration fee amount
  registrationDeadline?: Date; // Registration deadline
  isOpen?: boolean; // Whether registration is open
  createdAt?: Date; // Creation timestamp
  recipientIds?: string[];
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  targetAudience?: string;
  type?: string; // For compatibility with UI components
  courseName?: string; // For compatibility with UI components
  issuedAt: string; // ISO string
  recipientIds?: string[];
}
