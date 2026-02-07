import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/notification_model.dart';
import 'notification_bloc_event.dart';
import 'notification_bloc_state.dart';

class NotificationBloc extends Bloc<NotificationBlocEvent, NotificationBlocState> {
  final ApiClient _apiClient;

  NotificationBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(NotificationBlocInitial()) {
    on<LoadNotifications>(_onLoadNotifications);
    on<MarkNotificationRead>(_onMarkRead);
    on<MarkAllRead>(_onMarkAllRead);
    on<SendNotification>(_onSendNotification);
  }

  Future<void> _onLoadNotifications(
      LoadNotifications event, Emitter<NotificationBlocState> emit) async {
    emit(NotificationBlocLoading());
    try {
      final notifResponse = await _apiClient.getNotifications(event.userId);
      final countResponse = await _apiClient.getUnreadCount(event.userId);

      if (notifResponse.statusCode == 200 && notifResponse.data != null) {
        final notifications = (notifResponse.data as List)
            .map((j) => NotificationModel.fromJson(j))
            .toList();
        final unreadCount = countResponse.data['count'] as int;
        emit(NotificationsLoaded(notifications, unreadCount));
      } else {
        emit(NotificationBlocError(
            notifResponse.data?['message'] ?? 'Failed to load notifications.'));
      }
    } catch (e) {
      emit(const NotificationBlocError('Connection error. Please try again.'));
    }
  }

  Future<void> _onMarkRead(
      MarkNotificationRead event, Emitter<NotificationBlocState> emit) async {
    try {
      final response = await _apiClient.markNotificationRead(event.id);
      if (response.statusCode == 200) {
        emit(const NotificationBlocOperationSuccess(
            'Notification marked as read.'));
      } else {
        emit(NotificationBlocError(
            response.data?['message'] ?? 'Failed to mark notification as read.'));
      }
    } catch (e) {
      emit(const NotificationBlocError('Connection error. Please try again.'));
    }
  }

  Future<void> _onMarkAllRead(
      MarkAllRead event, Emitter<NotificationBlocState> emit) async {
    try {
      final currentState = state;
      if (currentState is NotificationsLoaded) {
        final unreadNotifications =
            currentState.notifications.where((n) => !n.isRead).toList();
        for (final notification in unreadNotifications) {
          await _apiClient.markNotificationRead(notification.id);
        }
        emit(const NotificationBlocOperationSuccess(
            'All notifications marked as read.'));
      } else {
        emit(const NotificationBlocError(
            'No notifications loaded to mark as read.'));
      }
    } catch (e) {
      emit(const NotificationBlocError('Connection error. Please try again.'));
    }
  }

  Future<void> _onSendNotification(
      SendNotification event, Emitter<NotificationBlocState> emit) async {
    emit(NotificationBlocLoading());
    try {
      final userIds = event.data['user_ids'] as List<int>;
      final notificationsList = userIds
          .map((userId) => {
                'user_id': userId,
                'title': event.data['title'],
                'message': event.data['message'],
                'type': event.data['type'],
              })
          .toList();

      final response =
          await _apiClient.createNotifications(notificationsList);
      if (response.statusCode == 201) {
        emit(const NotificationBlocOperationSuccess(
            'Notifications sent successfully.'));
      } else {
        emit(NotificationBlocError(
            response.data?['message'] ?? 'Failed to send notifications.'));
      }
    } catch (e) {
      emit(const NotificationBlocError('Connection error. Please try again.'));
    }
  }
}
