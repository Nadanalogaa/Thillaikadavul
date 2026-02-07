import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/user_model.dart';
import 'trash_event.dart';
import 'trash_state.dart';

class TrashBloc extends Bloc<TrashEvent, TrashState> {
  final ApiClient _apiClient;

  TrashBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(TrashInitial()) {
    on<LoadTrashedUsers>(_onLoad);
    on<RestoreUser>(_onRestore);
    on<PermanentDeleteUser>(_onPermanentDelete);
  }

  Future<void> _onLoad(
    LoadTrashedUsers event,
    Emitter<TrashState> emit,
  ) async {
    emit(TrashLoading());
    try {
      final response = await _apiClient.getTrashedUsers();
      if (response.statusCode == 200 && response.data != null) {
        final users = (response.data as List)
            .map((json) => UserModel.fromJson(json))
            .toList();
        emit(TrashedUsersLoaded(users: users));
      } else {
        emit(TrashError(
          response.data?['message'] ?? 'Failed to load trashed users.',
        ));
      }
    } catch (e) {
      emit(const TrashError('Connection error. Please try again.'));
    }
  }

  Future<void> _onRestore(
    RestoreUser event,
    Emitter<TrashState> emit,
  ) async {
    emit(TrashLoading());
    try {
      final response = await _apiClient.restoreUser(event.id);
      if (response.statusCode == 200) {
        emit(const TrashOperationSuccess('User restored successfully.'));
        add(LoadTrashedUsers());
      } else {
        emit(TrashError(
          response.data?['message'] ?? 'Failed to restore user.',
        ));
      }
    } catch (e) {
      emit(const TrashError('Connection error. Please try again.'));
    }
  }

  Future<void> _onPermanentDelete(
    PermanentDeleteUser event,
    Emitter<TrashState> emit,
  ) async {
    emit(TrashLoading());
    try {
      final response = await _apiClient.permanentDeleteUser(event.id);
      if (response.statusCode == 200) {
        emit(const TrashOperationSuccess('User permanently deleted.'));
        add(LoadTrashedUsers());
      } else {
        emit(TrashError(
          response.data?['message'] ?? 'Failed to permanently delete user.',
        ));
      }
    } catch (e) {
      emit(const TrashError('Connection error. Please try again.'));
    }
  }
}
