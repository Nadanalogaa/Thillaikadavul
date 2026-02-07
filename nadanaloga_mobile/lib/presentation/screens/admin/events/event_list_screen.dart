import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../bloc/event/event_bloc.dart';
import '../../../bloc/event/event_event.dart';
import '../../../bloc/event/event_state.dart';
import '../../../../core/network/api_client.dart';
import '../../../../di/injection_container.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/empty_state_widget.dart';
import '../../../widgets/recipient_selection_sheet.dart';

class EventListScreen extends StatelessWidget {
  const EventListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Events')),
      body: BlocConsumer<EventBloc, EventState>(
        listener: (context, state) {
          if (state is EventOperationSuccess) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.message)));
          } else if (state is EventError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          if (state is EventLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is EventsLoaded) {
            if (state.events.isEmpty) {
              return EmptyStateWidget(
                icon: Icons.event_outlined,
                title: 'No events yet',
                subtitle: 'Add your first event.',
                actionLabel: 'Add Event',
                onAction: () async {
                  final created = await context.push<bool>('/admin/events/add');
                  if (created == true && context.mounted) {
                    context.read<EventBloc>().add(LoadEvents());
                  }
                },
              );
            }
            return RefreshIndicator(
              onRefresh: () async =>
                  context.read<EventBloc>().add(LoadEvents()),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.events.length,
                itemBuilder: (context, index) {
                  final event = state.events[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: AppColors.primary,
                        child: const Icon(Icons.calendar_today,
                            color: Colors.white),
                      ),
                      title: Text(event.title,
                          style: AppTextStyles.labelLarge),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (event.eventDate != null ||
                              event.eventTime != null)
                            Text(
                              [
                                if (event.eventDate != null)
                                  event.eventDate!,
                                if (event.eventTime != null)
                                  event.eventTime!,
                              ].join(' | '),
                              style: AppTextStyles.caption,
                            ),
                          if (event.location != null &&
                              event.location!.isNotEmpty)
                            Text(event.location!,
                                style: AppTextStyles.caption),
                          const SizedBox(height: 4),
                          Chip(
                            label: Text(
                              event.isPublic ? 'Public' : 'Private',
                              style: const TextStyle(
                                  fontSize: 11, color: Colors.white),
                            ),
                            backgroundColor: event.isPublic
                                ? AppColors.success
                                : Colors.grey,
                            padding: EdgeInsets.zero,
                            materialTapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                          ),
                        ],
                      ),
                      trailing: PopupMenuButton<String>(
                        onSelected: (value) async {
                          if (value == 'edit') {
                            final updated = await context
                                .push<bool>('/admin/events/${event.id}/edit');
                            if (updated == true && context.mounted) {
                              context.read<EventBloc>().add(LoadEvents());
                            }
                          } else if (value == 'delete') {
                            final confirmed = await ConfirmDialog.show(
                              context,
                              title: 'Delete Event',
                              message:
                                  'Are you sure you want to delete "${event.title}"?',
                              confirmLabel: 'Delete',
                              confirmColor: AppColors.error,
                            );
                            if (confirmed == true && context.mounted) {
                              context
                                  .read<EventBloc>()
                                  .add(DeleteEvent(event.id));
                            }
                          } else if (value == 'share') {
                            final result = await showModalBottomSheet<
                                RecipientSelectionResult>(
                              context: context,
                              isScrollControlled: true,
                              builder: (_) => RecipientSelectionSheet(
                                contentTitle: event.title,
                                contentType: 'Event',
                              ),
                            );
                            if (result != null && context.mounted) {
                              try {
                                await sl<ApiClient>().shareContent(
                                  contentId: event.id,
                                  contentType: 'Event',
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
          final created = await context.push<bool>('/admin/events/add');
          if (created == true && context.mounted) {
            context.read<EventBloc>().add(LoadEvents());
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
