import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../bloc/grade_exam/grade_exam_bloc.dart';
import '../../../bloc/grade_exam/grade_exam_event.dart';
import '../../../bloc/grade_exam/grade_exam_state.dart';
import '../../../../core/network/api_client.dart';
import '../../../../di/injection_container.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/empty_state_widget.dart';
import '../../../widgets/recipient_selection_sheet.dart';

class ExamListScreen extends StatelessWidget {
  const ExamListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Grade Exams')),
      body: BlocConsumer<GradeExamBloc, GradeExamState>(
        listener: (context, state) {
          if (state is GradeExamOperationSuccess) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.message)));
          } else if (state is GradeExamError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          if (state is GradeExamLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is GradeExamsLoaded) {
            if (state.gradeExams.isEmpty) {
              return EmptyStateWidget(
                icon: Icons.quiz_outlined,
                title: 'No exams',
                subtitle: 'Schedule grade exams for students.',
                actionLabel: 'Add Exam',
                onAction: () async {
                  final created = await context.push<bool>('/admin/exams/add');
                  if (created == true && context.mounted) {
                    context.read<GradeExamBloc>().add(LoadGradeExams());
                  }
                },
              );
            }
            return RefreshIndicator(
              onRefresh: () async =>
                  context.read<GradeExamBloc>().add(LoadGradeExams()),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.gradeExams.length,
                itemBuilder: (context, index) {
                  final exam = state.gradeExams[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor:
                            AppColors.primary.withValues(alpha: 0.1),
                        child: const Icon(Icons.quiz,
                            color: AppColors.primary),
                      ),
                      title: Text(exam.examName,
                          style: AppTextStyles.labelLarge),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (exam.course != null) ...[
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.primary
                                    .withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                exam.course!,
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              if (exam.examDate != null) ...[
                                const Icon(Icons.calendar_today,
                                    size: 14,
                                    color: AppColors.textSecondary),
                                const SizedBox(width: 4),
                                Text(
                                  _formatDate(exam.examDate!),
                                  style: AppTextStyles.caption,
                                ),
                              ],
                              if (exam.examTime != null) ...[
                                const SizedBox(width: 8),
                                const Icon(Icons.access_time,
                                    size: 14,
                                    color: AppColors.textSecondary),
                                const SizedBox(width: 4),
                                Text(
                                  exam.examTime!,
                                  style: AppTextStyles.caption,
                                ),
                              ],
                            ],
                          ),
                          if (exam.location != null &&
                              exam.location!.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                const Icon(Icons.location_on_outlined,
                                    size: 14,
                                    color: AppColors.textSecondary),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    exam.location!,
                                    style: AppTextStyles.caption,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                      trailing: PopupMenuButton<String>(
                        onSelected: (value) async {
                          if (value == 'edit') {
                            final updated = await context
                                .push<bool>('/admin/exams/${exam.id}/edit');
                            if (updated == true && context.mounted) {
                              context.read<GradeExamBloc>().add(LoadGradeExams());
                            }
                          } else if (value == 'delete') {
                            final confirmed = await ConfirmDialog.show(
                              context,
                              title: 'Delete Exam',
                              message:
                                  'Are you sure you want to delete "${exam.examName}"?',
                              confirmLabel: 'Delete',
                              confirmColor: AppColors.error,
                            );
                            if (confirmed == true && context.mounted) {
                              context
                                  .read<GradeExamBloc>()
                                  .add(DeleteGradeExam(exam.id));
                            }
                          } else if (value == 'share') {
                            final result = await showModalBottomSheet<
                                RecipientSelectionResult>(
                              context: context,
                              isScrollControlled: true,
                              builder: (_) => RecipientSelectionSheet(
                                contentTitle: exam.examName,
                                contentType: 'GradeExam',
                              ),
                            );
                            if (result != null && context.mounted) {
                              try {
                                await sl<ApiClient>().shareContent(
                                  contentId: exam.id,
                                  contentType: 'GradeExam',
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
          final created = await context.push<bool>('/admin/exams/add');
          if (created == true && context.mounted) {
            context.read<GradeExamBloc>().add(LoadGradeExams());
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day.toString().padLeft(2, '0')}/'
          '${date.month.toString().padLeft(2, '0')}/'
          '${date.year}';
    } catch (_) {
      return dateStr;
    }
  }
}
