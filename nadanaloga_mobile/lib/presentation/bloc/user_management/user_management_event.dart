import 'package:equatable/equatable.dart';

abstract class UserManagementEvent extends Equatable {
  const UserManagementEvent();

  @override
  List<Object?> get props => [];
}

class LoadUsers extends UserManagementEvent {
  final String? roleFilter;
  final String? search;

  const LoadUsers({this.roleFilter, this.search});

  @override
  List<Object?> get props => [roleFilter, search];
}

class AddUser extends UserManagementEvent {
  final Map<String, dynamic> userData;

  const AddUser(this.userData);

  @override
  List<Object?> get props => [userData];
}

class UpdateUser extends UserManagementEvent {
  final int userId;
  final Map<String, dynamic> userData;

  const UpdateUser({required this.userId, required this.userData});

  @override
  List<Object?> get props => [userId, userData];
}

class DeleteUser extends UserManagementEvent {
  final int userId;

  const DeleteUser(this.userId);

  @override
  List<Object?> get props => [userId];
}

class MakeAdmin extends UserManagementEvent {
  final int userId;

  const MakeAdmin(this.userId);

  @override
  List<Object?> get props => [userId];
}

class RemoveAdmin extends UserManagementEvent {
  final int userId;

  const RemoveAdmin(this.userId);

  @override
  List<Object?> get props => [userId];
}
