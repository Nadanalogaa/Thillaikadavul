import 'package:equatable/equatable.dart';

import '../../../data/models/grade_exam_model.dart';

abstract class GradeExamState extends Equatable {
  const GradeExamState();

  @override
  List<Object?> get props => [];
}

class GradeExamInitial extends GradeExamState {}

class GradeExamLoading extends GradeExamState {}

class GradeExamsLoaded extends GradeExamState {
  final List<GradeExamModel> gradeExams;
  const GradeExamsLoaded(this.gradeExams);

  @override
  List<Object?> get props => [gradeExams];
}

class GradeExamOperationSuccess extends GradeExamState {
  final String message;
  const GradeExamOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class GradeExamError extends GradeExamState {
  final String message;
  const GradeExamError(this.message);

  @override
  List<Object?> get props => [message];
}
