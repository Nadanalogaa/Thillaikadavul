import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/course_model.dart';
import 'course_event.dart';
import 'course_state.dart';

class CourseBloc extends Bloc<CourseEvent, CourseState> {
  final ApiClient _apiClient;

  CourseBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(CourseInitial()) {
    on<LoadCourses>(_onLoad);
    on<CreateCourse>(_onCreate);
    on<UpdateCourse>(_onUpdate);
    on<DeleteCourse>(_onDelete);
  }

  Future<void> _onLoad(LoadCourses event, Emitter<CourseState> emit) async {
    emit(CourseLoading());
    try {
      final response = await _apiClient.getCourses();
      if (response.statusCode == 200 && response.data != null) {
        final courses = (response.data as List)
            .map((j) => CourseModel.fromJson(j))
            .toList();
        emit(CourseLoaded(courses));
      } else {
        emit(CourseError(response.data?['message'] ?? 'Failed to load courses.'));
      }
    } catch (e) {
      emit(const CourseError('Connection error. Please try again.'));
    }
  }

  Future<void> _onCreate(CreateCourse event, Emitter<CourseState> emit) async {
    emit(CourseLoading());
    try {
      final response = await _apiClient.createCourse(event.data);
      if (response.statusCode == 201) {
        emit(const CourseOperationSuccess('Course created successfully.'));
        add(LoadCourses());
      } else {
        emit(CourseError(response.data?['message'] ?? 'Failed to create course.'));
      }
    } catch (e) {
      emit(const CourseError('Connection error. Please try again.'));
    }
  }

  Future<void> _onUpdate(UpdateCourse event, Emitter<CourseState> emit) async {
    emit(CourseLoading());
    try {
      final response = await _apiClient.updateCourse(event.id, event.data);
      if (response.statusCode == 200) {
        emit(const CourseOperationSuccess('Course updated successfully.'));
        add(LoadCourses());
      } else {
        emit(CourseError(response.data?['message'] ?? 'Failed to update course.'));
      }
    } catch (e) {
      emit(const CourseError('Connection error. Please try again.'));
    }
  }

  Future<void> _onDelete(DeleteCourse event, Emitter<CourseState> emit) async {
    emit(CourseLoading());
    try {
      final response = await _apiClient.deleteCourse(event.id);
      if (response.statusCode == 200) {
        emit(const CourseOperationSuccess('Course deleted successfully.'));
        add(LoadCourses());
      } else {
        emit(CourseError(response.data?['message'] ?? 'Failed to delete course.'));
      }
    } catch (e) {
      emit(const CourseError('Connection error. Please try again.'));
    }
  }
}
