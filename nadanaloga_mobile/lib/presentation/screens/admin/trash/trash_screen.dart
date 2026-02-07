import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../bloc/trash/trash_bloc.dart';
import '../../../bloc/trash/trash_event.dart';
import '../../../bloc/trash/trash_state.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/empty_state_widget.dart';

class TrashScreen extends StatelessWidget {
  const TrashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trash'),
      ),
      body: BlocConsumer<TrashBloc, TrashState>(
        listener: (context, state) {
          if (state is TrashOperationSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message)),
            );
            context.read<TrashBloc>().add(LoadTrashedUsers());
          } else if (state is TrashError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is TrashLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is TrashedUsersLoaded) {
            if (state.users.isEmpty) {
              return EmptyStateWidget(
                icon: Icons.delete_outline,
                title: 'Trash is empty',
                subtitle: 'No deleted users.',
              );
            }

            return RefreshIndicator(
              onRefresh: () async {
                context.read<TrashBloc>().add(LoadTrashedUsers());
              },
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: state.users.length,
                itemBuilder: (context, index) {
                  final user = state.users[index];
                  final initial = user.name.isNotEmpty
                      ? user.name[0].toUpperCase()
                      : '?';

                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.grey[300],
                        child: Text(
                          initial,
                          style: AppTextStyles.labelLarge.copyWith(
                            color: Colors.grey[700],
                          ),
                        ),
                      ),
                      title: Text(
                        user.name,
                        style: AppTextStyles.labelLarge,
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 4),
                          Text(
                            user.email,
                            style: AppTextStyles.bodyMedium.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Chip(
                            label: Text(
                              user.role,
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.textOnPrimary,
                              ),
                            ),
                            backgroundColor: AppColors.primary,
                            padding: EdgeInsets.zero,
                            materialTapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                            visualDensity: VisualDensity.compact,
                          ),
                          if (user.updatedAt != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              'Deleted: ${_formatDate(user.updatedAt!)}',
                              style: AppTextStyles.caption,
                            ),
                          ],
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.restore),
                            color: AppColors.success,
                            tooltip: 'Restore',
                            onPressed: () {
                              context
                                  .read<TrashBloc>()
                                  .add(RestoreUser(user.id));
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_forever),
                            color: AppColors.error,
                            tooltip: 'Permanently Delete',
                            onPressed: () async {
                              final confirmed = await ConfirmDialog.show(
                                context,
                                title: 'Permanently Delete?',
                                message: 'This cannot be undone.',
                                confirmLabel: 'Delete',
                                confirmColor: AppColors.error,
                              );
                              if (confirmed == true && context.mounted) {
                                context
                                    .read<TrashBloc>()
                                    .add(PermanentDeleteUser(user.id));
                              }
                            },
                          ),
                        ],
                      ),
                      isThreeLine: true,
                    ),
                  );
                },
              ),
            );
          }

          if (state is TrashError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline,
                      size: 48, color: AppColors.error),
                  const SizedBox(height: 16),
                  Text(state.message, style: AppTextStyles.bodyMedium),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () {
                      context.read<TrashBloc>().add(LoadTrashedUsers());
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return dateStr;
    }
  }
}
