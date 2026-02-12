import 'package:equatable/equatable.dart';

import '../../../data/models/batch_model.dart';
import '../../../data/models/event_model.dart';
import '../../../data/models/invoice_model.dart';
import '../../../data/models/notice_model.dart';
import '../../../data/models/notification_model.dart';
import '../../../data/models/book_material_model.dart';
import '../../../data/models/grade_exam_model.dart';
import '../../../data/models/user_model.dart';

abstract class ParentState extends Equatable {
  const ParentState();

  @override
  List<Object?> get props => [];
}

class ParentInitial extends ParentState {}

class ParentLoading extends ParentState {}

class ParentStudentDataLoaded extends ParentState {
  final UserModel student;
  final List<BatchModel> enrollments;
  final List<NotificationModel> notifications;
  final List<InvoiceModel> invoices;
  final List<EventModel> events;
  final List<NoticeModel> notices;
  final List<BookMaterialModel> bookMaterials;
  final List<GradeExamModel> gradeExams;

  const ParentStudentDataLoaded({
    required this.student,
    required this.enrollments,
    required this.notifications,
    required this.invoices,
    required this.events,
    required this.notices,
    required this.bookMaterials,
    required this.gradeExams,
  });

  @override
  List<Object?> get props => [
        student,
        enrollments,
        notifications,
        invoices,
        events,
        notices,
        bookMaterials,
        gradeExams,
      ];
}

class ParentError extends ParentState {
  final String message;

  const ParentError(this.message);

  @override
  List<Object?> get props => [message];
}
