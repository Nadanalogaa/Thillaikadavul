import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:path_provider/path_provider.dart';

import '../constants/api_endpoints.dart';
import 'api_interceptors.dart';

class ApiClient {
  late final Dio _dio;
  late final CookieJar _cookieJar;
  bool _initialized = false;

  Dio get dio => _dio;
  CookieJar get cookieJar => _cookieJar;

  ApiClient() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiEndpoints.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        validateStatus: (status) => status != null && status < 600,
      ),
    );
  }

  Future<void> init() async {
    if (_initialized) return;

    // Setup persistent cookie jar for session management
    final dir = await getApplicationDocumentsDirectory();
    _cookieJar = PersistCookieJar(
      storage: FileStorage('${dir.path}/.cookies/'),
    );

    _dio.interceptors.addAll([
      CookieManager(_cookieJar),
      LoggingInterceptor(),
    ]);

    _initialized = true;
  }

  /// Clear all cookies (used on logout)
  Future<void> clearCookies() async {
    await _cookieJar.deleteAll();
  }

  // --- Auth API ---

  Future<Response> login({
    required String identifier,
    required String password,
  }) {
    // Send both 'identifier' and 'email' for backward compatibility
    // New server uses 'identifier', old server uses 'email'
    return _dio.post(ApiEndpoints.login, data: {
      'identifier': identifier,
      'email': identifier,
      'password': password,
    });
  }

  Future<Response> register(Map<String, dynamic> userData) {
    return _dio.post(ApiEndpoints.register, data: userData);
  }

  Future<Response> logout() {
    return _dio.post(ApiEndpoints.logout);
  }

  Future<Response> checkSession() {
    return _dio.get(ApiEndpoints.session);
  }

  Future<Response> checkEmail(String email) {
    return _dio.post(ApiEndpoints.checkEmail, data: {'email': email});
  }

  // --- Users API ---

  Future<Response> getUsers({String? role, String? courseExpertise, String? search}) {
    final queryParams = <String, dynamic>{};
    if (role != null) queryParams['role'] = role;
    if (courseExpertise != null) queryParams['course_expertise'] = courseExpertise;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    return _dio.get(ApiEndpoints.users, queryParameters: queryParams);
  }

  Future<Response> getUserById(int id) {
    return _dio.get(ApiEndpoints.userById(id));
  }

  Future<Response> updateUser(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.userById(id), data: data);
  }

  Future<Response> deleteUser(int id) {
    return _dio.delete(ApiEndpoints.userById(id));
  }

  Future<Response> getTrashedUsers() {
    return _dio.get(ApiEndpoints.trashedUsers);
  }

  Future<Response> restoreUser(int id) {
    return _dio.post(ApiEndpoints.restoreUser(id));
  }

  Future<Response> permanentDeleteUser(int id) {
    return _dio.delete(ApiEndpoints.permanentDeleteUser(id));
  }

  Future<Response> changePassword(int id, {
    required String currentPassword,
    required String newPassword,
  }) {
    return _dio.put(ApiEndpoints.changePassword(id), data: {
      'current_password': currentPassword,
      'new_password': newPassword,
    });
  }

  Future<Response> getUsersByIds(List<int> ids) {
    return _dio.post(ApiEndpoints.usersByIds, data: {'ids': ids});
  }

  Future<Response> makeAdmin(int id) {
    return _dio.put(ApiEndpoints.makeAdmin(id));
  }

  Future<Response> removeAdmin(int id) {
    return _dio.put(ApiEndpoints.removeAdmin(id));
  }

  Future<Response> getAdminStats() {
    return _dio.get(ApiEndpoints.adminStats);
  }

  // --- File Upload API ---

  /// Upload an icon file (SVG, PNG, JPG)
  Future<Response> uploadIcon(String filePath) async {
    final formData = FormData.fromMap({
      'icon': await MultipartFile.fromFile(
        filePath,
        filename: filePath.split('/').last,
      ),
    });
    return _dio.post(
      ApiEndpoints.uploadIcon,
      data: formData,
      options: Options(
        contentType: 'multipart/form-data',
      ),
    );
  }

  /// Delete an uploaded icon
  Future<Response> deleteIcon(String filename) {
    return _dio.delete('${ApiEndpoints.uploadIcon}/$filename');
  }

  // --- Courses API ---

  Future<Response> getCourses() {
    return _dio.get(ApiEndpoints.courses);
  }

  Future<Response> createCourse(Map<String, dynamic> data) {
    return _dio.post(ApiEndpoints.courses, data: data);
  }

  Future<Response> updateCourse(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.courseById(id), data: data);
  }

  Future<Response> deleteCourse(int id) {
    return _dio.delete(ApiEndpoints.courseById(id));
  }

  // --- Batches API ---

  Future<Response> getBatches() {
    return _dio.get(ApiEndpoints.batches);
  }

  Future<Response> createBatch(Map<String, dynamic> data) {
    return _dio.post(ApiEndpoints.batches, data: data);
  }

  Future<Response> updateBatch(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.batchById(id), data: data);
  }

  Future<Response> deleteBatch(int id) {
    return _dio.delete(ApiEndpoints.batchById(id));
  }

  Future<Response> getBatchDetails(int id) {
    return _dio.get(ApiEndpoints.batchDetails(id));
  }

  Future<Response> transferStudent({
    required int studentId,
    required int fromBatchId,
    required int toBatchId,
  }) {
    return _dio.post(ApiEndpoints.batchTransfer, data: {
      'studentId': studentId,
      'fromBatchId': fromBatchId,
      'toBatchId': toBatchId,
    });
  }

  // --- Locations API ---

  Future<Response> getLocations() {
    return _dio.get(ApiEndpoints.locations);
  }

  Future<Response> createLocation(Map<String, dynamic> data) {
    return _dio.post(ApiEndpoints.locations, data: data);
  }

  Future<Response> updateLocation(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.locationById(id), data: data);
  }

  Future<Response> deleteLocation(int id) {
    return _dio.delete(ApiEndpoints.locationById(id));
  }

  // --- Events API ---

  Future<Response> getEvents() {
    return _dio.get(ApiEndpoints.events);
  }

  Future<Response> createEvent(Map<String, dynamic> data) {
    return _dio.post(ApiEndpoints.events, data: data);
  }

  Future<Response> updateEvent(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.eventById(id), data: data);
  }

  Future<Response> deleteEvent(int id) {
    return _dio.delete(ApiEndpoints.eventById(id));
  }

  // --- Notices API ---

  Future<Response> getNotices() {
    return _dio.get(ApiEndpoints.notices);
  }

  Future<Response> createNotice(Map<String, dynamic> data) {
    return _dio.post(ApiEndpoints.notices, data: data);
  }

  Future<Response> updateNotice(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.noticeById(id), data: data);
  }

  Future<Response> deleteNotice(int id) {
    return _dio.delete(ApiEndpoints.noticeById(id));
  }

  // --- Notifications API ---

  Future<Response> getNotifications(int userId) {
    return _dio.get(ApiEndpoints.notifications(userId));
  }

  Future<Response> getUnreadCount(int userId) {
    return _dio.get(ApiEndpoints.unreadCount(userId));
  }

  Future<Response> markNotificationRead(int id) {
    return _dio.put(ApiEndpoints.markRead(id));
  }

  Future<Response> createNotifications(List<Map<String, dynamic>> notifications) {
    return _dio.post(ApiEndpoints.createNotifications, data: notifications);
  }

  // --- Share Content API ---

  Future<Response> shareContent({
    required int contentId,
    required String contentType,
    required List<int> recipientIds,
    bool sendEmail = true,
  }) {
    return _dio.post(ApiEndpoints.shareContent, data: {
      'content_id': contentId,
      'content_type': contentType,
      'recipient_ids': recipientIds,
      'send_email': sendEmail,
    });
  }

  // --- Fee Structures API ---

  Future<Response> getFeeStructures() {
    return _dio.get(ApiEndpoints.feeStructures);
  }

  Future<Response> createFeeStructure(Map<String, dynamic> data) {
    return _dio.post(ApiEndpoints.feeStructures, data: data);
  }

  Future<Response> updateFeeStructure(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.feeStructureById(id), data: data);
  }

  Future<Response> deleteFeeStructure(int id) {
    return _dio.delete(ApiEndpoints.feeStructureById(id));
  }

  // --- Student Discounts API ---

  Future<Response> getStudentDiscounts({
    int? studentId,
    int? courseId,
    int? batchId,
    String? discountType,
  }) {
    final queryParams = <String, dynamic>{};
    if (studentId != null) queryParams['student_id'] = studentId;
    if (courseId != null) queryParams['course_id'] = courseId;
    if (batchId != null) queryParams['batch_id'] = batchId;
    if (discountType != null) queryParams['discount_type'] = discountType;
    return _dio.get(ApiEndpoints.studentDiscounts, queryParameters: queryParams);
  }

  Future<Response> createStudentDiscount(Map<String, dynamic> data) {
    return _dio.post(ApiEndpoints.studentDiscounts, data: data);
  }

  Future<Response> updateStudentDiscount(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.studentDiscountById(id), data: data);
  }

  Future<Response> deleteStudentDiscount(int id) {
    return _dio.delete(ApiEndpoints.studentDiscountById(id));
  }

  Future<Response> calculateStudentDiscount(int studentId, {int? courseId, int? batchId}) {
    final queryParams = <String, dynamic>{};
    if (courseId != null) queryParams['course_id'] = courseId;
    if (batchId != null) queryParams['batch_id'] = batchId;
    return _dio.get(ApiEndpoints.calculateDiscount(studentId), queryParameters: queryParams);
  }

  // --- Invoices API ---

  Future<Response> getInvoices() {
    return _dio.get(ApiEndpoints.invoices);
  }

  Future<Response> createInvoice(Map<String, dynamic> data) {
    return _dio.post(ApiEndpoints.invoices, data: data);
  }

  Future<Response> updateInvoice(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.invoiceById(id), data: data);
  }

  Future<Response> submitInvoicePaymentProof({
    required int invoiceId,
    required String proofPath,
    String? transactionId,
    String? paymentDate,
    String? paymentMethod,
    double? amount,
  }) async {
    final formData = FormData.fromMap({
      'proof': await MultipartFile.fromFile(
        proofPath,
        filename: proofPath.split('/').last,
      ),
      if (transactionId != null && transactionId.isNotEmpty)
        'transaction_id': transactionId,
      if (paymentDate != null && paymentDate.isNotEmpty)
        'payment_date': paymentDate,
      if (paymentMethod != null && paymentMethod.isNotEmpty)
        'payment_method': paymentMethod,
      if (amount != null) 'amount': amount,
    });
    return _dio.post(
      ApiEndpoints.invoicePaymentProof(invoiceId),
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
  }

  Future<Response> getInvoicePaymentProof(int invoiceId) {
    return _dio.get(ApiEndpoints.invoicePaymentProof(invoiceId));
  }

  Future<Response> getInvoicePayments({String? status}) {
    final queryParams = <String, dynamic>{};
    if (status != null && status.isNotEmpty) queryParams['status'] = status;
    return _dio.get(ApiEndpoints.invoicePayments, queryParameters: queryParams);
  }

  Future<Response> updateInvoicePayment(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.invoicePaymentById(id), data: data);
  }

  // --- Demo Bookings API ---

  Future<Response> getDemoBookings() {
    return _dio.get(ApiEndpoints.demoBookings);
  }

  Future<Response> createDemoBooking(Map<String, dynamic> data) {
    return _dio.post(ApiEndpoints.demoBookings, data: data);
  }

  Future<Response> updateDemoBooking(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.demoBookingById(id), data: data);
  }

  Future<Response> deleteDemoBooking(int id) {
    return _dio.delete(ApiEndpoints.demoBookingById(id));
  }

  // --- Book Materials API ---

  Future<Response> getBookMaterials() {
    return _dio.get(ApiEndpoints.bookMaterials);
  }

  Future<Response> createBookMaterial(Map<String, dynamic> data) {
    return _dio.post(ApiEndpoints.bookMaterials, data: data);
  }

  Future<Response> updateBookMaterial(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.bookMaterialById(id), data: data);
  }

  Future<Response> deleteBookMaterial(int id) {
    return _dio.delete(ApiEndpoints.bookMaterialById(id));
  }

  // --- Grade Exams API ---

  Future<Response> getGradeExams() {
    return _dio.get(ApiEndpoints.gradeExams);
  }

  Future<Response> createGradeExam(Map<String, dynamic> data) {
    return _dio.post(ApiEndpoints.gradeExams, data: data);
  }

  Future<Response> updateGradeExam(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.gradeExamById(id), data: data);
  }

  Future<Response> deleteGradeExam(int id) {
    return _dio.delete(ApiEndpoints.gradeExamById(id));
  }

  // --- FCM Tokens API ---

  Future<Response> registerFcmToken({
    required int userId,
    required String fcmToken,
    required String deviceType,
  }) {
    return _dio.post(ApiEndpoints.fcmTokens, data: {
      'user_id': userId,
      'fcm_token': fcmToken,
      'device_type': deviceType,
    });
  }

  Future<Response> removeFcmToken({
    required int userId,
    required String fcmToken,
  }) {
    return _dio.delete(ApiEndpoints.fcmTokens, data: {
      'user_id': userId,
      'fcm_token': fcmToken,
    });
  }

  // --- Salary API ---

  Future<Response> getSalaries() {
    return _dio.get(ApiEndpoints.salaries);
  }

  Future<Response> createSalary(Map<String, dynamic> data) {
    return _dio.post(ApiEndpoints.salaries, data: data);
  }

  Future<Response> updateSalary(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.salaryById(id), data: data);
  }

  Future<Response> deleteSalary(int id) {
    return _dio.delete(ApiEndpoints.salaryById(id));
  }

  Future<Response> getSalaryPayments() {
    return _dio.get(ApiEndpoints.salaryPayments);
  }

  Future<Response> createSalaryPayment(Map<String, dynamic> data) {
    return _dio.post(ApiEndpoints.salaryPayments, data: data);
  }

  Future<Response> updateSalaryPayment(int id, Map<String, dynamic> data) {
    return _dio.put(ApiEndpoints.salaryPaymentById(id), data: data);
  }

  Future<Response> getSalarySummary(int userId) {
    return _dio.get(ApiEndpoints.salarySummary(userId));
  }

  // --- Email API ---

  Future<Response> sendEmail(Map<String, dynamic> data) {
    return _dio.post(ApiEndpoints.sendEmail, data: data);
  }

  // --- Health ---

  Future<Response> healthCheck() {
    return _dio.get(ApiEndpoints.health);
  }
}
