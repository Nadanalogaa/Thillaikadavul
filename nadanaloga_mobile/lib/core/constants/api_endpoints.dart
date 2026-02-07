class ApiEndpoints {
  ApiEndpoints._();

  // Base URL - change for production
  static const String baseUrl = 'https://www.nadanaloga.com';
  static const String apiPrefix = '/api';

  // Auth
  static const String login = '$apiPrefix/login';
  static const String register = '$apiPrefix/register';
  static const String logout = '$apiPrefix/logout';
  static const String session = '$apiPrefix/session';
  static const String checkEmail = '$apiPrefix/check-email';

  // Users
  static const String users = '$apiPrefix/users';
  static String userById(int id) => '$apiPrefix/users/$id';
  static const String trashedUsers = '$apiPrefix/users/trashed/all';
  static String restoreUser(int id) => '$apiPrefix/users/$id/restore';
  static String permanentDeleteUser(int id) => '$apiPrefix/users/$id/permanent';
  static String makeAdmin(int id) => '$apiPrefix/users/$id/make-admin';
  static String removeAdmin(int id) => '$apiPrefix/users/$id/remove-admin';
  static const String usersByIds = '$apiPrefix/users/by-ids';
  static String changePassword(int id) => '$apiPrefix/users/$id/change-password';
  static const String adminStats = '$apiPrefix/stats/admin';

  // File Uploads
  static const String uploadIcon = '$apiPrefix/upload/icon';

  // Courses
  static const String courses = '$apiPrefix/courses';
  static String courseById(int id) => '$apiPrefix/courses/$id';

  // Batches
  static const String batches = '$apiPrefix/batches';
  static String batchById(int id) => '$apiPrefix/batches/$id';
  static String batchDetails(int id) => '$apiPrefix/batches/$id/details';
  static const String batchTransfer = '$apiPrefix/batches/transfer';

  // Locations (Branches)
  static const String locations = '$apiPrefix/locations';
  static String locationById(int id) => '$apiPrefix/locations/$id';

  // Events
  static const String events = '$apiPrefix/events';
  static String eventById(int id) => '$apiPrefix/events/$id';

  // Notices
  static const String notices = '$apiPrefix/notices';
  static String noticeById(int id) => '$apiPrefix/notices/$id';

  // Notifications
  static String notifications(int userId) => '$apiPrefix/notifications/$userId';
  static String unreadCount(int userId) => '$apiPrefix/notifications/$userId/unread-count';
  static String markRead(int id) => '$apiPrefix/notifications/$id/mark-read';
  static const String createNotifications = '$apiPrefix/notifications';

  // Fee Structures
  static const String feeStructures = '$apiPrefix/fee-structures';
  static String feeStructureById(int id) => '$apiPrefix/fee-structures/$id';

  // Invoices
  static const String invoices = '$apiPrefix/invoices';
  static String invoiceById(int id) => '$apiPrefix/invoices/$id';
  static String invoicePaymentProof(int id) => '$apiPrefix/invoices/$id/payment-proof';
  static const String invoicePayments = '$apiPrefix/invoice-payments';
  static String invoicePaymentById(int id) => '$apiPrefix/invoice-payments/$id';

  // Demo Bookings
  static const String demoBookings = '$apiPrefix/demo-bookings';
  static String demoBookingById(int id) => '$apiPrefix/demo-bookings/$id';

  // Book Materials
  static const String bookMaterials = '$apiPrefix/book-materials';
  static String bookMaterialById(int id) => '$apiPrefix/book-materials/$id';

  // Grade Exams
  static const String gradeExams = '$apiPrefix/grade-exams';
  static String gradeExamById(int id) => '$apiPrefix/grade-exams/$id';

  // Salaries
  static const String salaries = '$apiPrefix/salaries';
  static String salaryById(int id) => '$apiPrefix/salaries/$id';
  static String salarySummary(int userId) => '$apiPrefix/salaries/$userId/summary';
  static const String salaryPayments = '$apiPrefix/salary-payments';
  static String salaryPaymentById(int id) => '$apiPrefix/salary-payments/$id';

  // Share Content (notifications)
  static const String shareContent = '$apiPrefix/share-content';

  // FCM Tokens
  static const String fcmTokens = '$apiPrefix/fcm-tokens';

  // Email
  static const String sendEmail = '$apiPrefix/send-email';
  static const String sendRegistrationEmails = '$apiPrefix/send-registration-emails';

  // Contact
  static const String contact = '$apiPrefix/contact';

  // Health
  static const String health = '$apiPrefix/health';
}
