import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/user_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/notification/notification_bloc.dart';
import '../../../bloc/notification/notification_bloc_event.dart';
import '../../../bloc/notification/notification_bloc_state.dart';

class SendNotificationScreen extends StatefulWidget {
  const SendNotificationScreen({super.key});

  @override
  State<SendNotificationScreen> createState() =>
      _SendNotificationScreenState();
}

class _SendNotificationScreenState extends State<SendNotificationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _messageController = TextEditingController();

  String _recipientType = 'All Students';
  String _notificationType = 'info';
  bool _isSending = false;

  static const _recipientTypes = [
    'All Students',
    'All Teachers',
    'All Users',
  ];

  static const _notificationTypes = [
    'info',
    'alert',
    'reminder',
    'success',
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSending = true);

    try {
      final apiClient = sl<ApiClient>();
      List<UserModel> users = [];

      if (_recipientType == 'All Students') {
        final response = await apiClient.getUsers(role: 'Student');
        if (response.statusCode == 200 && response.data != null) {
          users = (response.data as List)
              .map((j) => UserModel.fromJson(j))
              .toList();
        }
      } else if (_recipientType == 'All Teachers') {
        final response = await apiClient.getUsers(role: 'Teacher');
        if (response.statusCode == 200 && response.data != null) {
          users = (response.data as List)
              .map((j) => UserModel.fromJson(j))
              .toList();
        }
      } else {
        final response = await apiClient.getUsers();
        if (response.statusCode == 200 && response.data != null) {
          users = (response.data as List)
              .map((j) => UserModel.fromJson(j))
              .toList();
        }
      }

      if (users.isEmpty) {
        if (mounted) {
          setState(() => _isSending = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('No users found for the selected recipient type.'),
              backgroundColor: AppColors.error,
            ),
          );
        }
        return;
      }

      final userIds = users.map((u) => u.id).toList();

      if (mounted) {
        context.read<NotificationBloc>().add(
              SendNotification({
                'user_ids': userIds,
                'title': _titleController.text.trim(),
                'message': _messageController.text.trim(),
                'type': _notificationType,
              }),
            );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSending = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to fetch users. Please try again.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<NotificationBloc, NotificationBlocState>(
      listener: (context, state) {
        if (state is NotificationBlocOperationSuccess) {
          setState(() => _isSending = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.success,
            ),
          );
          context.pop();
        } else if (state is NotificationBlocError) {
          setState(() => _isSending = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.error,
            ),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Send Notification'),
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Recipient Type
                Text('Recipient', style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 8),
                SegmentedButton<String>(
                  segments: _recipientTypes
                      .map(
                        (type) => ButtonSegment<String>(
                          value: type,
                          label: Text(
                            type.replaceFirst('All ', ''),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                  selected: {_recipientType},
                  onSelectionChanged: (selected) {
                    setState(() => _recipientType = selected.first);
                  },
                ),
                const SizedBox(height: 24),

                // Title
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    labelText: 'Title *',
                    prefixIcon: Icon(Icons.title),
                  ),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 16),

                // Message
                TextFormField(
                  controller: _messageController,
                  decoration: const InputDecoration(
                    labelText: 'Message *',
                    prefixIcon: Icon(Icons.message),
                    alignLabelWithHint: true,
                  ),
                  maxLines: 4,
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 16),

                // Notification Type
                DropdownButtonFormField<String>(
                  value: _notificationType,
                  decoration: const InputDecoration(
                    labelText: 'Type',
                    prefixIcon: Icon(Icons.category),
                  ),
                  items: _notificationTypes
                      .map(
                        (t) => DropdownMenuItem(
                          value: t,
                          child: Text(
                            t[0].toUpperCase() + t.substring(1),
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (v) {
                    if (v != null) {
                      setState(() => _notificationType = v);
                    }
                  },
                ),
                const SizedBox(height: 32),

                // Submit Button
                FilledButton(
                  onPressed: _isSending ? null : _submit,
                  child: _isSending
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Send Notification'),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
