import 'package:equatable/equatable.dart';

abstract class NotificationBlocEvent extends Equatable {
  const NotificationBlocEvent();

  @override
  List<Object?> get props => [];
}

class LoadNotifications extends NotificationBlocEvent {
  final int userId;
  const LoadNotifications(this.userId);

  @override
  List<Object?> get props => [userId];
}

class MarkNotificationRead extends NotificationBlocEvent {
  final int id;
  const MarkNotificationRead(this.id);

  @override
  List<Object?> get props => [id];
}

class MarkAllRead extends NotificationBlocEvent {
  final int userId;
  const MarkAllRead(this.userId);

  @override
  List<Object?> get props => [userId];
}

class SendNotification extends NotificationBlocEvent {
  final Map<String, dynamic> data;
  const SendNotification(this.data);

  @override
  List<Object?> get props => [data];
}
