import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../bloc/auth/auth_bloc.dart';
import '../../../bloc/auth/auth_state.dart';
import '../../../bloc/notification/notification_bloc.dart';
import '../../../bloc/notification/notification_bloc_event.dart';
import '../../../bloc/notification/notification_bloc_state.dart';
import '../../../widgets/empty_state_widget.dart';

class NotificationListScreen extends StatefulWidget {
  const NotificationListScreen({super.key});

  @override
  State<NotificationListScreen> createState() =>
      _NotificationListScreenState();
}

class _NotificationListScreenState extends State<NotificationListScreen> {
  int? _userId;

  @override
  void initState() {
    super.initState();
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthAuthenticated) {
      _userId = authState.user.id;
      context.read<NotificationBloc>().add(LoadNotifications(_userId!));
    }
  }

  void _reloadNotifications() {
    if (_userId != null) {
      context.read<NotificationBloc>().add(LoadNotifications(_userId!));
    }
  }

  IconData _typeIcon(String? type) {
    switch (type?.toLowerCase()) {
      case 'info':
        return Icons.info;
      case 'alert':
        return Icons.warning;
      case 'success':
        return Icons.check_circle;
      default:
        return Icons.notifications;
    }
  }

  String _relativeTime(String? createdAt) {
    if (createdAt == null) return '';
    try {
      final date = DateTime.parse(createdAt);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inSeconds < 60) return 'Just now';
      if (diff.inMinutes < 60) {
        return '${diff.inMinutes}m ago';
      }
      if (diff.inHours < 24) {
        return '${diff.inHours}h ago';
      }
      if (diff.inDays < 7) {
        return '${diff.inDays}d ago';
      }
      if (diff.inDays < 30) {
        return '${(diff.inDays / 7).floor()}w ago';
      }
      return '${(diff.inDays / 30).floor()}mo ago';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all),
            tooltip: 'Mark All Read',
            onPressed: () {
              if (_userId != null) {
                context
                    .read<NotificationBloc>()
                    .add(MarkAllRead(_userId!));
              }
            },
          ),
        ],
      ),
      body: BlocConsumer<NotificationBloc, NotificationBlocState>(
        listener: (context, state) {
          if (state is NotificationBlocOperationSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message)),
            );
            _reloadNotifications();
          } else if (state is NotificationBlocError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is NotificationBlocLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is NotificationsLoaded) {
            if (state.notifications.isEmpty) {
              return EmptyStateWidget(
                icon: Icons.notifications_none,
                title: 'No notifications',
                subtitle: 'You\'re all caught up!',
              );
            }

            return RefreshIndicator(
              onRefresh: () async => _reloadNotifications(),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.notifications.length,
                itemBuilder: (context, index) {
                  final notification = state.notifications[index];
                  final isUnread = !notification.isRead;
                  final iconColor =
                      isUnread ? AppColors.primary : Colors.grey;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    clipBehavior: Clip.antiAlias,
                    child: Container(
                      decoration: isUnread
                          ? BoxDecoration(
                              color: AppColors.primary
                                  .withValues(alpha: 0.04),
                              border: Border(
                                left: BorderSide(
                                  color: AppColors.primary,
                                  width: 4,
                                ),
                              ),
                            )
                          : null,
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        leading: CircleAvatar(
                          backgroundColor:
                              iconColor.withValues(alpha: 0.15),
                          child: Icon(
                            _typeIcon(notification.type),
                            color: iconColor,
                          ),
                        ),
                        title: Text(
                          notification.title,
                          style: isUnread
                              ? AppTextStyles.labelLarge
                                  .copyWith(fontWeight: FontWeight.bold)
                              : AppTextStyles.labelLarge,
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (notification.message != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                notification.message!,
                                style: AppTextStyles.bodyMedium,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                            const SizedBox(height: 4),
                            Text(
                              _relativeTime(notification.createdAt),
                              style: AppTextStyles.caption,
                            ),
                          ],
                        ),
                        onTap: () {
                          if (isUnread) {
                            context
                                .read<NotificationBloc>()
                                .add(MarkNotificationRead(notification.id));
                          }
                        },
                      ),
                    ),
                  );
                },
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }
}
