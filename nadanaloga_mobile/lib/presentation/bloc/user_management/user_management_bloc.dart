import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/user_model.dart';
import 'user_management_event.dart';
import 'user_management_state.dart';

class UserManagementBloc
    extends Bloc<UserManagementEvent, UserManagementState> {
  final ApiClient _apiClient;

  String? _lastRoleFilter;
  String? _lastSearch;

  UserManagementBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(UserManagementInitial()) {
    on<LoadUsers>(_onLoadUsers);
    on<AddUser>(_onAddUser);
    on<UpdateUser>(_onUpdateUser);
    on<DeleteUser>(_onDeleteUser);
    on<MakeAdmin>(_onMakeAdmin);
    on<RemoveAdmin>(_onRemoveAdmin);
  }

  Future<void> _onLoadUsers(
    LoadUsers event,
    Emitter<UserManagementState> emit,
  ) async {
    emit(UserManagementLoading());
    _lastRoleFilter = event.roleFilter;
    _lastSearch = event.search;

    try {
      final response = await _apiClient.getUsers(
        role: event.roleFilter,
        search: event.search,
      );
      if (response.statusCode == 200 && response.data != null) {
        final users = (response.data as List)
            .map((json) => UserModel.fromJson(json))
            .toList();
        emit(UserManagementLoaded(
          users: users,
          activeFilter: event.roleFilter,
          searchQuery: event.search,
        ));
      } else {
        emit(UserManagementError(
          response.data?['message'] ?? 'Failed to load users.',
        ));
      }
    } catch (e) {
      emit(const UserManagementError('Connection error. Please try again.'));
    }
  }

  Future<void> _onAddUser(
    AddUser event,
    Emitter<UserManagementState> emit,
  ) async {
    emit(UserManagementLoading());
    try {
      final response = await _apiClient.register(event.userData);
      if (response.statusCode == 201) {
        emit(const UserManagementOperationSuccess('User added successfully.'));
        add(LoadUsers(roleFilter: _lastRoleFilter, search: _lastSearch));
      } else {
        emit(UserManagementError(
          response.data?['message'] ?? 'Failed to add user.',
        ));
      }
    } catch (e) {
      emit(const UserManagementError('Connection error. Please try again.'));
    }
  }

  Future<void> _onUpdateUser(
    UpdateUser event,
    Emitter<UserManagementState> emit,
  ) async {
    emit(UserManagementLoading());
    try {
      final response =
          await _apiClient.updateUser(event.userId, event.userData);
      if (response.statusCode == 200) {
        emit(
            const UserManagementOperationSuccess('User updated successfully.'));
        add(LoadUsers(roleFilter: _lastRoleFilter, search: _lastSearch));
      } else {
        emit(UserManagementError(
          response.data?['message'] ?? 'Failed to update user.',
        ));
      }
    } catch (e) {
      emit(const UserManagementError('Connection error. Please try again.'));
    }
  }

  Future<void> _onDeleteUser(
    DeleteUser event,
    Emitter<UserManagementState> emit,
  ) async {
    emit(UserManagementLoading());
    try {
      final response = await _apiClient.deleteUser(event.userId);
      if (response.statusCode == 200) {
        emit(
            const UserManagementOperationSuccess('User deleted successfully.'));
        add(LoadUsers(roleFilter: _lastRoleFilter, search: _lastSearch));
      } else {
        emit(UserManagementError(
          response.data?['message'] ?? 'Failed to delete user.',
        ));
      }
    } catch (e) {
      emit(const UserManagementError('Connection error. Please try again.'));
    }
  }

  Future<void> _onMakeAdmin(
    MakeAdmin event,
    Emitter<UserManagementState> emit,
  ) async {
    emit(UserManagementLoading());
    try {
      final response = await _apiClient.makeAdmin(event.userId);
      if (response.statusCode == 200) {
        emit(const UserManagementOperationSuccess(
            'User promoted to Admin successfully.'));
        add(LoadUsers(roleFilter: _lastRoleFilter, search: _lastSearch));
      } else {
        emit(UserManagementError(
          response.data?['message'] ?? 'Failed to promote user.',
        ));
      }
    } catch (e) {
      emit(const UserManagementError('Connection error. Please try again.'));
    }
  }

  Future<void> _onRemoveAdmin(
    RemoveAdmin event,
    Emitter<UserManagementState> emit,
  ) async {
    emit(UserManagementLoading());
    try {
      final response = await _apiClient.removeAdmin(event.userId);
      if (response.statusCode == 200) {
        emit(const UserManagementOperationSuccess(
            'Admin privileges removed successfully.'));
        add(LoadUsers(roleFilter: _lastRoleFilter, search: _lastSearch));
      } else {
        emit(UserManagementError(
          response.data?['message'] ?? 'Failed to demote admin.',
        ));
      }
    } catch (e) {
      emit(const UserManagementError('Connection error. Please try again.'));
    }
  }
}
