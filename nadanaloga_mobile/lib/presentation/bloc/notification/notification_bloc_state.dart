import 'package:equatable/equatable.dart';

import '../../../data/models/notification_model.dart';

abstract class NotificationBlocState extends Equatable {
  const NotificationBlocState();

  @override
  List<Object?> get props => [];
}

class NotificationBlocInitial extends NotificationBlocState {}

class NotificationBlocLoading extends NotificationBlocState {}

class NotificationsLoaded extends NotificationBlocState {
  final List<NotificationModel> notifications;
  final int unreadCount;
  const NotificationsLoaded(this.notifications, this.unreadCount);

  @override
  List<Object?> get props => [notifications, unreadCount];
}

class NotificationBlocOperationSuccess extends NotificationBlocState {
  final String message;
  const NotificationBlocOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class NotificationBlocError extends NotificationBlocState {
  final String message;
  const NotificationBlocError(this.message);

  @override
  List<Object?> get props => [message];
}
