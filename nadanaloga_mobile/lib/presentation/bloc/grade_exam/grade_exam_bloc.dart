import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/grade_exam_model.dart';
import 'grade_exam_event.dart';
import 'grade_exam_state.dart';

class GradeExamBloc extends Bloc<GradeExamEvent, GradeExamState> {
  final ApiClient _apiClient;

  GradeExamBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(GradeExamInitial()) {
    on<LoadGradeExams>(_onLoad);
    on<CreateGradeExam>(_onCreate);
    on<UpdateGradeExam>(_onUpdate);
    on<DeleteGradeExam>(_onDelete);
  }

  Future<void> _onLoad(LoadGradeExams event, Emitter<GradeExamState> emit) async {
    emit(GradeExamLoading());
    try {
      final response = await _apiClient.getGradeExams();
      if (response.statusCode == 200 && response.data != null) {
        final gradeExams = (response.data as List)
            .map((j) => GradeExamModel.fromJson(j))
            .toList();
        emit(GradeExamsLoaded(gradeExams));
      } else {
        emit(GradeExamError(response.data?['message'] ?? 'Failed to load grade exams.'));
      }
    } catch (e) {
      emit(const GradeExamError('Connection error. Please try again.'));
    }
  }

  Future<void> _onCreate(CreateGradeExam event, Emitter<GradeExamState> emit) async {
    emit(GradeExamLoading());
    try {
      final response = await _apiClient.createGradeExam(event.data);
      if (response.statusCode == 201) {
        emit(const GradeExamOperationSuccess('Grade exam created successfully.'));
        add(LoadGradeExams());
      } else {
        emit(GradeExamError(response.data?['message'] ?? 'Failed to create grade exam.'));
      }
    } catch (e) {
      emit(const GradeExamError('Connection error. Please try again.'));
    }
  }

  Future<void> _onUpdate(UpdateGradeExam event, Emitter<GradeExamState> emit) async {
    emit(GradeExamLoading());
    try {
      final response = await _apiClient.updateGradeExam(event.id, event.data);
      if (response.statusCode == 200) {
        emit(const GradeExamOperationSuccess('Grade exam updated successfully.'));
        add(LoadGradeExams());
      } else {
        emit(GradeExamError(response.data?['message'] ?? 'Failed to update grade exam.'));
      }
    } catch (e) {
      emit(const GradeExamError('Connection error. Please try again.'));
    }
  }

  Future<void> _onDelete(DeleteGradeExam event, Emitter<GradeExamState> emit) async {
    emit(GradeExamLoading());
    try {
      final response = await _apiClient.deleteGradeExam(event.id);
      if (response.statusCode == 200) {
        emit(const GradeExamOperationSuccess('Grade exam deleted successfully.'));
        add(LoadGradeExams());
      } else {
        emit(GradeExamError(response.data?['message'] ?? 'Failed to delete grade exam.'));
      }
    } catch (e) {
      emit(const GradeExamError('Connection error. Please try again.'));
    }
  }
}
