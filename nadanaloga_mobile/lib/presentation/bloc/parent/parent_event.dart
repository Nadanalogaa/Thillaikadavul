import 'package:equatable/equatable.dart';

abstract class ParentEvent extends Equatable {
  const ParentEvent();

  @override
  List<Object?> get props => [];
}

/// Load student data for a specific student ID
class LoadStudentData extends ParentEvent {
  final int studentId;

  const LoadStudentData(this.studentId);

  @override
  List<Object?> get props => [studentId];
}

/// Refresh student data
class RefreshStudentData extends ParentEvent {
  final int studentId;

  const RefreshStudentData(this.studentId);

  @override
  List<Object?> get props => [studentId];
}
