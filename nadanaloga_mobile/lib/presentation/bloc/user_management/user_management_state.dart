import 'package:equatable/equatable.dart';

import '../../../data/models/user_model.dart';

abstract class UserManagementState extends Equatable {
  const UserManagementState();

  @override
  List<Object?> get props => [];
}

class UserManagementInitial extends UserManagementState {}

class UserManagementLoading extends UserManagementState {}

class UserManagementLoaded extends UserManagementState {
  final List<UserModel> users;
  final String? activeFilter;
  final String? searchQuery;

  const UserManagementLoaded({
    required this.users,
    this.activeFilter,
    this.searchQuery,
  });

  @override
  List<Object?> get props => [users, activeFilter, searchQuery];
}

class UserManagementOperationSuccess extends UserManagementState {
  final String message;

  const UserManagementOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class UserManagementError extends UserManagementState {
  final String message;

  const UserManagementError(this.message);

  @override
  List<Object?> get props => [message];
}
