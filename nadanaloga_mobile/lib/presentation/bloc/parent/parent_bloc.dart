import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/event_model.dart';
import '../../../data/models/invoice_model.dart';
import '../../../data/models/notice_model.dart';
import '../../../data/models/notification_model.dart';
import '../../../data/models/book_material_model.dart';
import '../../../data/models/grade_exam_model.dart';
import '../../../data/models/user_model.dart';
import 'parent_event.dart';
import 'parent_state.dart';

class ParentBloc extends Bloc<ParentEvent, ParentState> {
  final ApiClient _apiClient;

  ParentBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(ParentInitial()) {
    on<LoadStudentData>(_onLoadStudentData);
    on<RefreshStudentData>(_onRefreshStudentData);
  }

  Future<void> _onLoadStudentData(
    LoadStudentData event,
    Emitter<ParentState> emit,
  ) async {
    emit(ParentLoading());
    await _fetchStudentData(event.studentId, emit);
  }

  Future<void> _onRefreshStudentData(
    RefreshStudentData event,
    Emitter<ParentState> emit,
  ) async {
    await _fetchStudentData(event.studentId, emit);
  }

  Future<void> _fetchStudentData(
    int studentId,
    Emitter<ParentState> emit,
  ) async {
    try {
      // Fetch all data in parallel (skip student data as we already have it)
      final results = await Future.wait([
        _apiClient.getBatches(),
        _apiClient.getNotifications(studentId),
        _apiClient.getInvoices(),
        _apiClient.getEvents(),
        _apiClient.getNotices(),
        _apiClient.getBookMaterials(),
        _apiClient.getGradeExams(),
      ]);

      // Create a placeholder student (will be replaced by actual student from route)
      final student = UserModel(
        id: studentId,
        name: 'Student',
        email: '',
        role: 'Student',
      );

      // Parse batches and filter enrollments for this student
      final batchesResponse = results[0];
      final enrollments = <BatchModel>[];
      if (batchesResponse.statusCode == 200 && batchesResponse.data is List) {
        final allBatches = (batchesResponse.data as List)
            .map((b) => BatchModel.fromJson(b))
            .toList();

        // Filter batches where this student is enrolled
        for (final batch in allBatches) {
          if (batch.schedule != null && batch.schedule!.isNotEmpty) {
            // Check if student is in any schedule of this batch
            final hasStudent = batch.schedule!.any((schedule) =>
                schedule.studentIds != null &&
                schedule.studentIds!.contains(studentId));
            if (hasStudent) {
              enrollments.add(batch);
            }
          }
        }
      }

      // Parse notifications
      final notificationsResponse = results[1];
      final notifications = notificationsResponse.statusCode == 200 &&
              notificationsResponse.data is List
          ? (notificationsResponse.data as List)
              .map((n) => NotificationModel.fromJson(n))
              .toList()
          : <NotificationModel>[];

      // Parse invoices and filter for this student
      final invoicesResponse = results[2];
      final invoices = <InvoiceModel>[];
      if (invoicesResponse.statusCode == 200 &&
          invoicesResponse.data is List) {
        final allInvoices = (invoicesResponse.data as List)
            .map((i) => InvoiceModel.fromJson(i))
            .toList();
        // Filter invoices for this student
        invoices.addAll(
            allInvoices.where((inv) => inv.studentId == studentId));
      }

      // Parse events - show all active events
      final eventsResponse = results[3];
      final events = <EventModel>[];
      if (eventsResponse.statusCode == 200 && eventsResponse.data is List) {
        final allEvents = (eventsResponse.data as List)
            .map((e) => EventModel.fromJson(e))
            .toList();
        // Show all active events
        events.addAll(allEvents.where((event) => event.isActive));
      }

      // Parse notices - show all active notices
      final noticesResponse = results[4];
      final notices = <NoticeModel>[];
      if (noticesResponse.statusCode == 200 && noticesResponse.data is List) {
        final allNotices = (noticesResponse.data as List)
            .map((n) => NoticeModel.fromJson(n))
            .toList();
        // Show all active notices
        notices.addAll(allNotices.where((notice) => notice.isActive));
      }

      // Parse book materials and filter by recipient_ids
      final bookMaterialsResponse = results[5];
      final bookMaterials = <BookMaterialModel>[];
      if (bookMaterialsResponse.statusCode == 200 &&
          bookMaterialsResponse.data is List) {
        final allMaterials = (bookMaterialsResponse.data as List)
            .map((m) => BookMaterialModel.fromJson(m))
            .toList();
        // Filter materials for this student
        bookMaterials.addAll(allMaterials.where((material) =>
            material.recipientIds == null ||
            material.recipientIds!.isEmpty ||
            material.recipientIds!.contains(studentId)));
      }

      // Parse grade exams and filter by recipient_ids
      final gradeExamsResponse = results[6];
      final gradeExams = <GradeExamModel>[];
      if (gradeExamsResponse.statusCode == 200 &&
          gradeExamsResponse.data is List) {
        final allExams = (gradeExamsResponse.data as List)
            .map((e) => GradeExamModel.fromJson(e))
            .toList();
        // Filter exams for this student
        gradeExams.addAll(allExams.where((exam) =>
            exam.recipientIds == null ||
            exam.recipientIds!.isEmpty ||
            exam.recipientIds!.contains(studentId)));
      }

      emit(ParentStudentDataLoaded(
        student: student,
        enrollments: enrollments,
        notifications: notifications,
        invoices: invoices,
        events: events,
        notices: notices,
        bookMaterials: bookMaterials,
        gradeExams: gradeExams,
      ));
    } catch (e) {
      emit(ParentError('Connection error: ${e.toString()}'));
    }
  }
}
