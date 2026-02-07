import 'package:equatable/equatable.dart';

import '../../../data/models/user_model.dart';

abstract class TrashState extends Equatable {
  const TrashState();

  @override
  List<Object?> get props => [];
}

class TrashInitial extends TrashState {}

class TrashLoading extends TrashState {}

class TrashedUsersLoaded extends TrashState {
  final List<UserModel> users;

  const TrashedUsersLoaded({required this.users});

  @override
  List<Object?> get props => [users];
}

class TrashOperationSuccess extends TrashState {
  final String message;

  const TrashOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class TrashError extends TrashState {
  final String message;

  const TrashError(this.message);

  @override
  List<Object?> get props => [message];
}
