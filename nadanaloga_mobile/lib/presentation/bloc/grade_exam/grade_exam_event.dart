import 'package:equatable/equatable.dart';

abstract class GradeExamEvent extends Equatable {
  const GradeExamEvent();

  @override
  List<Object?> get props => [];
}

class LoadGradeExams extends GradeExamEvent {}

class CreateGradeExam extends GradeExamEvent {
  final Map<String, dynamic> data;
  const CreateGradeExam(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateGradeExam extends GradeExamEvent {
  final int id;
  final Map<String, dynamic> data;
  const UpdateGradeExam({required this.id, required this.data});

  @override
  List<Object?> get props => [id, data];
}

class DeleteGradeExam extends GradeExamEvent {
  final int id;
  const DeleteGradeExam(this.id);

  @override
  List<Object?> get props => [id];
}
