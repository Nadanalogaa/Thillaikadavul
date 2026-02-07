import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../bloc/notice/notice_bloc.dart';
import '../../../bloc/notice/notice_event.dart';
import '../../../bloc/notice/notice_state.dart';
import '../../../../core/network/api_client.dart';
import '../../../../di/injection_container.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/empty_state_widget.dart';
import '../../../widgets/recipient_selection_sheet.dart';

class NoticeListScreen extends StatelessWidget {
  const NoticeListScreen({super.key});

  Color _priorityColor(String? priority) {
    switch (priority?.toLowerCase()) {
      case 'high':
        return AppColors.error;
      case 'medium':
        return Colors.amber;
      default:
        return AppColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notices')),
      body: BlocConsumer<NoticeBloc, NoticeState>(
        listener: (context, state) {
          if (state is NoticeOperationSuccess) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.message)));
          } else if (state is NoticeError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          if (state is NoticeLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is NoticesLoaded) {
            if (state.notices.isEmpty) {
              return EmptyStateWidget(
                icon: Icons.campaign_outlined,
                title: 'No notices yet',
                subtitle: 'Add your first notice.',
                actionLabel: 'Add Notice',
                onAction: () async {
                  final created =
                      await context.push<bool>('/admin/notices/add');
                  if (created == true && context.mounted) {
                    context.read<NoticeBloc>().add(LoadNotices());
                  }
                },
              );
            }
            return RefreshIndicator(
              onRefresh: () async =>
                  context.read<NoticeBloc>().add(LoadNotices()),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.notices.length,
                itemBuilder: (context, index) {
                  final notice = state.notices[index];
                  final color = _priorityColor(notice.priority);
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: color.withValues(alpha: 0.15),
                        child: Icon(Icons.campaign, color: color),
                      ),
                      title: Text(notice.title,
                          style: AppTextStyles.labelLarge),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (notice.content != null)
                            Text(
                              notice.content!,
                              style: AppTextStyles.bodyMedium,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              if (notice.category != null) ...[
                                Chip(
                                  label: Text(notice.category!,
                                      style: AppTextStyles.caption),
                                  materialTapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                  visualDensity: VisualDensity.compact,
                                ),
                                const SizedBox(width: 8),
                              ],
                              if (notice.priority != null)
                                Text(
                                  notice.priority!,
                                  style: AppTextStyles.caption
                                      .copyWith(color: color),
                                ),
                            ],
                          ),
                        ],
                      ),
                      trailing: PopupMenuButton<String>(
                        onSelected: (value) async {
                          if (value == 'edit') {
                            final updated = await context
                                .push<bool>('/admin/notices/${notice.id}/edit');
                            if (updated == true && context.mounted) {
                              context.read<NoticeBloc>().add(LoadNotices());
                            }
                          } else if (value == 'delete') {
                            final confirmed = await ConfirmDialog.show(
                              context,
                              title: 'Delete Notice',
                              message:
                                  'Are you sure you want to delete "${notice.title}"?',
                              confirmLabel: 'Delete',
                              confirmColor: AppColors.error,
                            );
                            if (confirmed == true && context.mounted) {
                              context
                                  .read<NoticeBloc>()
                                  .add(DeleteNotice(notice.id));
                            }
                          } else if (value == 'share') {
                            final result = await showModalBottomSheet<
                                RecipientSelectionResult>(
                              context: context,
                              isScrollControlled: true,
                              builder: (_) => RecipientSelectionSheet(
                                contentTitle: notice.title,
                                contentType: 'Notice',
                              ),
                            );
                            if (result != null && context.mounted) {
                              try {
                                await sl<ApiClient>().shareContent(
                                  contentId: notice.id,
                                  contentType: 'Notice',
                                  recipientIds: result.recipientIds,
                                  sendEmail: result.sendEmail,
                                );
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context)
                                      .showSnackBar(const SnackBar(
                                          content: Text(
                                              'Shared successfully')));
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context)
                                      .showSnackBar(SnackBar(
                                    content:
                                        Text('Failed to share: $e'),
                                    backgroundColor: AppColors.error,
                                  ));
                                }
                              }
                            }
                          }
                        },
                        itemBuilder: (_) => const [
                          PopupMenuItem(
                              value: 'share',
                              child: Text('Share')),
                          PopupMenuItem(
                              value: 'edit', child: Text('Edit')),
                          PopupMenuItem(
                            value: 'delete',
                            child: Text('Delete',
                                style:
                                    TextStyle(color: AppColors.error)),
                          ),
                        ],
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
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final created = await context.push<bool>('/admin/notices/add');
          if (created == true && context.mounted) {
            context.read<NoticeBloc>().add(LoadNotices());
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
