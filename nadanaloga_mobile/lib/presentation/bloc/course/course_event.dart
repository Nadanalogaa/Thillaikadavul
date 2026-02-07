import 'package:equatable/equatable.dart';

abstract class CourseEvent extends Equatable {
  const CourseEvent();

  @override
  List<Object?> get props => [];
}

class LoadCourses extends CourseEvent {}

class CreateCourse extends CourseEvent {
  final Map<String, dynamic> data;
  const CreateCourse(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateCourse extends CourseEvent {
  final int id;
  final Map<String, dynamic> data;
  const UpdateCourse({required this.id, required this.data});

  @override
  List<Object?> get props => [id, data];
}

class DeleteCourse extends CourseEvent {
  final int id;
  const DeleteCourse(this.id);

  @override
  List<Object?> get props => [id];
}
