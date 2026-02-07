import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/notice_model.dart';
import 'notice_event.dart';
import 'notice_state.dart';

class NoticeBloc extends Bloc<NoticeEvent, NoticeState> {
  final ApiClient _apiClient;

  NoticeBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(NoticeInitial()) {
    on<LoadNotices>(_onLoadNotices);
    on<CreateNotice>(_onCreateNotice);
    on<UpdateNotice>(_onUpdateNotice);
    on<DeleteNotice>(_onDeleteNotice);
  }

  Future<void> _onLoadNotices(
      LoadNotices event, Emitter<NoticeState> emit) async {
    emit(NoticeLoading());
    try {
      final response = await _apiClient.getNotices();
      if (response.statusCode == 200 && response.data != null) {
        final notices = (response.data as List)
            .map((j) => NoticeModel.fromJson(j))
            .toList();
        emit(NoticesLoaded(notices));
      } else {
        emit(NoticeError(
            response.data?['message'] ?? 'Failed to load notices.'));
      }
    } catch (e) {
      emit(const NoticeError('Connection error. Please try again.'));
    }
  }

  Future<void> _onCreateNotice(
      CreateNotice event, Emitter<NoticeState> emit) async {
    emit(NoticeLoading());
    try {
      final response = await _apiClient.createNotice(event.data);
      if (response.statusCode == 201) {
        emit(const NoticeOperationSuccess(
            'Notice created successfully.'));
        add(LoadNotices());
      } else {
        emit(NoticeError(
            response.data?['message'] ?? 'Failed to create notice.'));
      }
    } catch (e) {
      emit(const NoticeError('Connection error. Please try again.'));
    }
  }

  Future<void> _onUpdateNotice(
      UpdateNotice event, Emitter<NoticeState> emit) async {
    emit(NoticeLoading());
    try {
      final response = await _apiClient.updateNotice(event.id, event.data);
      if (response.statusCode == 200) {
        emit(const NoticeOperationSuccess(
            'Notice updated successfully.'));
        add(LoadNotices());
      } else {
        emit(NoticeError(
            response.data?['message'] ?? 'Failed to update notice.'));
      }
    } catch (e) {
      emit(const NoticeError('Connection error. Please try again.'));
    }
  }

  Future<void> _onDeleteNotice(
      DeleteNotice event, Emitter<NoticeState> emit) async {
    emit(NoticeLoading());
    try {
      final response = await _apiClient.deleteNotice(event.id);
      if (response.statusCode == 200) {
        emit(const NoticeOperationSuccess(
            'Notice deleted successfully.'));
        add(LoadNotices());
      } else {
        emit(NoticeError(
            response.data?['message'] ?? 'Failed to delete notice.'));
      }
    } catch (e) {
      emit(const NoticeError('Connection error. Please try again.'));
    }
  }
}
