import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../bloc/batch/batch_bloc.dart';
import '../../../bloc/batch/batch_event.dart';
import '../../../bloc/batch/batch_state.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/empty_state_widget.dart';

class BatchListScreen extends StatelessWidget {
  const BatchListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Batches'),
        automaticallyImplyLeading: false,
      ),
      body: BlocConsumer<BatchBloc, BatchState>(
        listener: (context, state) {
          if (state is BatchOperationSuccess) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.message)));
          } else if (state is BatchError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          if (state is BatchLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is BatchLoaded) {
            if (state.batches.isEmpty) {
              return EmptyStateWidget(
                icon: Icons.group_work_outlined,
                title: 'No batches yet',
                subtitle: 'Create your first batch.',
                actionLabel: 'Create Batch',
                onAction: () => context.push('/admin/batches/add'),
              );
            }
            return RefreshIndicator(
              onRefresh: () async =>
                  context.read<BatchBloc>().add(LoadBatches()),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.batches.length,
                itemBuilder: (context, index) {
                  final batch = state.batches[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: InkWell(
                      onTap: () =>
                          context.push('/admin/batches/${batch.id}'),
                      borderRadius: BorderRadius.circular(12),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary
                                        .withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.group_work,
                                      color: AppColors.primary, size: 20),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(batch.batchName,
                                      style: AppTextStyles.labelLarge),
                                ),
                                if (batch.mode != null)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: _modeColor(batch.mode!)
                                          .withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      batch.mode!,
                                      style: AppTextStyles.caption.copyWith(
                                        color: _modeColor(batch.mode!),
                                        fontWeight: FontWeight.w600,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                PopupMenuButton<String>(
                                  onSelected: (value) async {
                                    if (value == 'delete') {
                                      final confirmed =
                                          await ConfirmDialog.show(
                                        context,
                                        title: 'Delete Batch',
                                        message:
                                            'Are you sure you want to delete "${batch.batchName}"?',
                                        confirmLabel: 'Delete',
                                        confirmColor: AppColors.error,
                                      );
                                      if (confirmed == true &&
                                          context.mounted) {
                                        context
                                            .read<BatchBloc>()
                                            .add(DeleteBatch(batch.id));
                                      }
                                    }
                                  },
                                  itemBuilder: (_) => const [
                                    PopupMenuItem(
                                      value: 'delete',
                                      child: Text('Delete',
                                          style: TextStyle(
                                              color: AppColors.error)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.people,
                                    size: 14,
                                    color: AppColors.textSecondary),
                                const SizedBox(width: 4),
                                Text(
                                  '${batch.allStudentIds.length} students',
                                  style: AppTextStyles.caption,
                                ),
                                if (batch.maxStudents != null) ...[
                                  Text(
                                    ' / ${batch.maxStudents} max',
                                    style: AppTextStyles.caption,
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
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
        onPressed: () => context.push('/admin/batches/add'),
        child: const Icon(Icons.add),
      ),
    );
  }

  Color _modeColor(String mode) {
    switch (mode.toLowerCase()) {
      case 'online':
        return AppColors.info;
      case 'offline':
        return AppColors.success;
      case 'hybrid':
        return AppColors.warning;
      default:
        return AppColors.textSecondary;
    }
  }
}
