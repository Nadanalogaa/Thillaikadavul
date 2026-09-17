
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
    parentName?: string;
    email: string;
    phoneNumber: string;
    country: string;
    courseName: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    message?: string;
    preferredDate?: string;
    preferredTime?: string;
    location?: string;
    /** When the enquiry was submitted on the website. */
    createdAt: string;
    updatedAt: string;
}

export enum UserRole {
  Student = 'Student',
  Teacher = 'Teacher',
  Admin = 'Admin',
  Parent = 'Parent',
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


/** One switchable profile behind a login: the person's own role-accounts and any linked children. */
export interface UserProfile {
  id: number | string;
  name: string;
  role: string;
  /** 'self' = one of this person's own accounts (e.g. Teacher, Student); 'child' = a linked child profile. */
  kind: 'self' | 'child';
  photo_url?: string | null;
  courses?: string[];
  grade?: string | null;
}

/** A household member as returned by GET /api/household (a profile + enrichment). */
export interface HouseholdMember extends UserProfile {
  course_grades?: { course_name?: string; grade_name?: string; monthly_fee?: number; currency?: string; discount_percentage?: number; net_amount?: number }[];
  batch_names?: string[];
  course_expertise?: string[];
}
export interface Household {
  members: HouseholdMember[];
  teacher: HouseholdMember | null;
  student_count: number;
}
export interface HouseholdFeeStudent {
  student_id: number;
  student_name: string;
  month_generated: number;
  month_paid: number;
  month_due: number;
  invoices: any[];
}
/** This month's household bill (GET /api/household/fees) — drives the Airtel-style bill card. */
export interface HouseholdFees {
  period: string;
  total_generated: number;
  total_paid: number;
  total_due: number;
  has_bill: boolean;
  all_paid: boolean;
  due_date: string | null;
  students: HouseholdFeeStudent[];
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
  courseGrades?: { course_name?: string; grade_name?: string; monthly_fee?: number; currency?: string; discount_percentage?: number; net_amount?: number }[];
  batchNames?: string[];
  mustChangePassword?: boolean;
  /** Every switchable profile behind this login (grouped by phone number). */
  profiles?: UserProfile[];
  /** Set client-side once the user has picked a profile this session. */
  activeProfileChosen?: boolean;
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
  days?: string[]; // Weekdays when batch classes occur (e.g., ['Monday', 'Wednesday'])
  startTime?: string; // Class start time (e.g., '17:00')
  endTime?: string; // Class end time (e.g., '18:30')
  studio?: string; // Studio/room the batch runs in (e.g., 'Old Studio', 'New Studio')
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
    // Receipt info for paid bills (from GET /api/invoices)
    receiptNumber?: string | null;
    paidMethod?: string | null;
    paidAt?: string | null;
    collectedByName?: string | null;
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

// --- Fees: roster, cash collection, receipts ---

export type FeeRosterStatus = 'paid' | 'pending' | 'overdue' | 'partly_paid' | 'no_bill' | 'not_set_up';

export interface FeeRosterGrade {
  course_id: number;
  course_name: string;
  grade_name: string;
  monthly_fee: number;
}

export interface FeeRosterBill {
  id: number;
  course_name: string;
  amount: number;
  original_amount: number | null;
  discount_percentage: number | null;
  status: 'paid' | 'pending' | 'overdue';
  due_date: string | null;
  prorated_from: string | null;
  receipt_number: string | null;
  payment_method: string | null;
  paid_at: string | null;
  collected_by_name: string | null;
}

export interface FeeRosterRow {
  student_id: number;
  name: string;
  user_id: string | null;
  phone: string | null;
  parent_name: string | null;
  inactive: boolean;
  grades: FeeRosterGrade[];
  batch_names: string[];
  status: FeeRosterStatus;
  billed: number;
  paid: number;
  due: number;
  due_date: string | null;
  bills: FeeRosterBill[];
}

export interface FeeRosterSummary {
  students: number;
  billed: number;
  collected: number;
  outstanding: number;
  counts: Record<FeeRosterStatus, number>;
}

export interface FeeRoster {
  period: string;
  today: string;
  summary: FeeRosterSummary;
  rows: FeeRosterRow[];
}

export interface FeeRosterParams {
  period?: string;
  status?: FeeRosterStatus | '';
  course_id?: string;
  batch_id?: string;
  search?: string;
}

export interface FamilyDueBill {
  id: number;
  student_id: number;
  student_name: string;
  course_name: string;
  billing_period: string;
  amount: number;
  due_date: string | null;
  prorated_from: string | null;
  overdue: boolean;
}

export interface FamilyDue {
  student_id: number;
  total: number;
  bills: FamilyDueBill[];
  notify: { name: string; email: string | null } | null;
}

export interface FeeReceiptLine {
  invoice_id: number;
  student_name: string;
  course_name: string;
  billing_period: string;
  amount: number;
}

export interface CollectCashResult {
  receipt_number: string;
  total: number;
  paid_at: string;
  collected_by_name: string | null;
  lines: FeeReceiptLine[];
}

export interface FeeReceipt {
  receipt_number: string;
  status: 'paid' | 'reversed';
  method: string | null;
  method_label: string | null;
  transaction_id: string | null;
  paid_at: string | null;
  collected_by_name: string | null;
  reversed_at: string | null;
  reversed_by_name: string | null;
  reversal_reason: string | null;
  lines: FeeReceiptLine[];
  total: number;
}

export interface ReverseReceiptResult {
  receipt_number: string;
  total: number;
  reason: string;
  reversed_at: string;
}
