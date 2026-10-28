import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../data/models/batch_model.dart';
import '../../widgets/empty_state_widget.dart';
import '../home/class_schedule.dart';

/// One student's batches, for the family-wide Batches page.
class BatchSection {
  final String name;
  final List<BatchModel> batches;

  const BatchSection({required this.name, required this.batches});
}

/// More → Batches: every student in the family, each with their batches —
/// course, teacher, class days and times, mode and place. A family with one
/// student skips the name heading.
class StudentBatchesScreen extends StatelessWidget {
  final List<BatchSection> sections;
  final bool isLoading;
  final VoidCallback onRefresh;

  /// Course name by id, for batches the server sent without one.
  final String? Function(int? courseId)? courseNameOf;

  const StudentBatchesScreen({
    super.key,
    required this.sections,
    required this.isLoading,
    required this.onRefresh,
    this.courseNameOf,
  });

  @override
  Widget build(BuildContext context) {
    final anyBatch = sections.any((s) => s.batches.isNotEmpty);
    final showNames = sections.length > 1;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Batches'),
        backgroundColor: AppColors.studentAccent,
      ),
      body: RefreshIndicator(
        onRefresh: () async => onRefresh(),
        child: isLoading
            ? const Center(child: CircularProgressIndicator())
            : !anyBatch
                ? ListView(children: const [
                    SizedBox(height: 80),
                    EmptyStateWidget(
                      icon: Icons.group_work_outlined,
                      title: 'No batches yet',
                      subtitle: 'The academy has not placed you in a batch yet.',
                    ),
                  ])
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      for (final section in sections) ...[
                        if (showNames)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(4, 8, 0, 10),
                            child: Text(section.name, style: AppTextStyles.h4),
                          ),
                        if (section.batches.isEmpty)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(4, 0, 0, 16),
                            child: Text('Not in a batch yet.',
                                style: AppTextStyles.bodyMedium
                                    .copyWith(color: AppColors.textSecondary)),
                          ),
                        for (final b in section.batches)
                          _BatchCard(
                            batch: b,
                            courseName: b.courseName ?? courseNameOf?.call(b.courseId),
                          ),
                      ],
                    ],
                  ),
      ),
    );
  }
}

class _BatchCard extends StatelessWidget {
  final BatchModel batch;
  final String? courseName;

  const _BatchCard({required this.batch, this.courseName});

  Color _modeColor(String? mode) {
    switch (mode?.toLowerCase()) {
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

  @override
  Widget build(BuildContext context) {
    final timings = ClassSchedule.timingLines(batch);
    final mode = (batch.mode ?? '').trim();
    final place = [
      if ((batch.locationName ?? '').trim().isNotEmpty) batch.locationName!.trim(),
      if ((batch.studio ?? '').trim().isNotEmpty) batch.studio!.trim(),
    ].join(' · ');
    final modeColor = _modeColor(mode);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(batch.batchName, style: AppTextStyles.labelLarge)),
                if (mode.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: modeColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(mode, style: AppTextStyles.caption.copyWith(color: modeColor)),
                  ),
              ],
            ),
            if ((courseName ?? '').isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(courseName!,
                  style: AppTextStyles.bodyMedium.copyWith(color: AppColors.primary)),
            ],
            const SizedBox(height: 8),
            if ((batch.teacherName ?? '').isNotEmpty)
              _line(Icons.person_outline, 'Teacher: ${batch.teacherName}'),
            if (timings.isEmpty)
              _line(Icons.schedule, 'Class times not set yet')
            else
              for (final t in timings) _line(Icons.schedule, t),
            if (place.isNotEmpty) _line(Icons.place_outlined, place),
          ],
        ),
      ),
    );
  }

  Widget _line(IconData icon, String text) => Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 16, color: AppColors.textSecondary),
            const SizedBox(width: 8),
            Expanded(
              child: Text(text,
                  style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
            ),
          ],
        ),
      );
}
