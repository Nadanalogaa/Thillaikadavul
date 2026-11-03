import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../data/models/batch_model.dart';
import '../../../widgets/batch_views.dart';
import '../../home/class_schedule.dart';

/// Pick the batch to move a student to. Shows only the other batches of the
/// same course, each with its teacher, class times and how full it is.
/// Pops with the chosen [BatchModel]; the caller confirms and moves.
class TransferStudentSheet extends StatelessWidget {
  final String studentName;
  final BatchModel fromBatch;

  /// Other batches of the same course.
  final List<BatchModel> candidates;

  const TransferStudentSheet({
    super.key,
    required this.studentName,
    required this.fromBatch,
    required this.candidates,
  });

  static Future<BatchModel?> show(
    BuildContext context, {
    required String studentName,
    required BatchModel fromBatch,
    required List<BatchModel> candidates,
  }) {
    return showModalBottomSheet<BatchModel>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => TransferStudentSheet(
        studentName: studentName,
        fromBatch: fromBatch,
        candidates: candidates,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sorted = [...candidates]
      ..sort((a, b) =>
          a.batchName.toLowerCase().compareTo(b.batchName.toLowerCase()));
    return ConstrainedBox(
      constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
            child: Text('Move $studentName',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.h3),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text(
              'From ${fromBatch.batchName} to another '
              '${fromBatch.courseName ?? 'course'} batch:',
              style: AppTextStyles.bodyMedium
                  .copyWith(color: AppColors.textSecondary),
            ),
          ),
          if (sorted.isEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              child: Center(
                child: Text(
                  'There is no other ${fromBatch.courseName ?? ''} batch. '
                  'Create one first.',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.bodyMedium
                      .copyWith(color: AppColors.textSecondary),
                ),
              ),
            )
          else
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                itemCount: sorted.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, i) => _BatchOption(
                  batch: sorted[i],
                  onTap: () => Navigator.pop(context, sorted[i]),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _BatchOption extends StatelessWidget {
  final BatchModel batch;
  final VoidCallback onTap;

  const _BatchOption({required this.batch, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final count = batchStudentCount(batch);
    final max = batch.maxStudents;
    final full = max != null && max > 0 && count >= max;
    final hasTeacher = batchHasTeacher(batch);
    final timings = ClassSchedule.timingLines(batch);
    final countColor = full ? AppColors.error : BatchPalette.students;

    return Material(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(batch.batchName,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: AppTextStyles.labelLarge.copyWith(
                                  fontWeight: FontWeight.w700, fontSize: 15)),
                        ),
                        if ((batch.mode ?? '').isNotEmpty) ...[
                          const SizedBox(width: 6),
                          BatchPill(
                              label: batch.mode!,
                              color: BatchPalette.mode(batch.mode)),
                        ],
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(
                            hasTeacher
                                ? Icons.person_rounded
                                : Icons.warning_amber_rounded,
                            size: 15,
                            color: hasTeacher
                                ? BatchPalette.teacher
                                : BatchPalette.unassigned),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            batchTeacherLabel(batch),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.bodyMedium.copyWith(
                              fontWeight: FontWeight.w600,
                              color: hasTeacher
                                  ? BatchPalette.teacher
                                  : const Color(0xFFB45309),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Padding(
                          padding: EdgeInsets.only(top: 2),
                          child: Icon(Icons.schedule_rounded,
                              size: 15, color: BatchPalette.times),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            timings.isEmpty
                                ? 'Timings not set'
                                : timings.join('\n'),
                            style: AppTextStyles.bodySmall.copyWith(
                              color: BatchPalette.times,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Column(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: countColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        Text.rich(TextSpan(children: [
                          TextSpan(
                            text: '$count',
                            style: TextStyle(
                              fontFamily: AppTextStyles.fontFamily,
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: countColor,
                            ),
                          ),
                          if (max != null && max > 0)
                            TextSpan(
                              text: '/$max',
                              style: AppTextStyles.caption.copyWith(
                                  color: countColor,
                                  fontWeight: FontWeight.w600),
                            ),
                        ])),
                        Text(full ? 'full' : 'students',
                            style: AppTextStyles.caption
                                .copyWith(fontSize: 10, color: countColor)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
