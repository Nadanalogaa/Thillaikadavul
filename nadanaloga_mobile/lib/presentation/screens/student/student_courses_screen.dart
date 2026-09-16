import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/course_model.dart';

/// Courses — the same view the web "Courses" menu shows: every course the
/// student registered for, with its allocated batch (timings) or
/// "Pending allocation" until the admin places them in a batch.
class StudentCoursesScreen extends StatelessWidget {
  final List<String> registered;
  final List<BatchModel> batches;
  final List<CourseModel> courses;
  final bool isLoading;
  final VoidCallback onRefresh;

  const StudentCoursesScreen({
    super.key,
    required this.registered,
    required this.batches,
    required this.courses,
    required this.isLoading,
    required this.onRefresh,
  });

  int? _courseIdFor(String name) {
    final n = name.trim().toLowerCase();
    for (final c in courses) {
      if (c.name.trim().toLowerCase() == n) return c.id;
    }
    return null;
  }

  String _courseNameFor(int? id) {
    for (final c in courses) {
      if (c.id == id) return c.name;
    }
    return 'Course';
  }

  List<String> _timings(BatchModel b) {
    if (b.timeSlots.isNotEmpty) {
      return b.timeSlots.map((s) {
        final range = [s.startTime, s.endTime]
            .where((t) => t != null && t.isNotEmpty)
            .join('–');
        return range.isEmpty ? s.day : '${s.day} $range';
      }).toList();
    }
    final fromSchedule = b.schedule
        .map((s) => s.timing)
        .whereType<String>()
        .where((t) => t.isNotEmpty)
        .toList();
    if (fromSchedule.isNotEmpty) return fromSchedule;
    if (b.days.isNotEmpty) {
      final range = [b.startTime, b.endTime]
          .where((t) => t != null && t.isNotEmpty)
          .join('–');
      return ['${b.days.join(', ')}${range.isEmpty ? '' : ' $range'}'];
    }
    return const ['Timings not set'];
  }

  @override
  Widget build(BuildContext context) {
    final registeredIds = registered.map(_courseIdFor).whereType<int>().toSet();
    final extraBatches =
        batches.where((b) => !registeredIds.contains(b.courseId)).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Courses'),
        backgroundColor: AppColors.primary,
        automaticallyImplyLeading: false,
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () async => onRefresh(),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (registered.isEmpty && batches.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 40),
                      child: Text('No courses selected yet.',
                          textAlign: TextAlign.center,
                          style: AppTextStyles.bodyMedium
                              .copyWith(color: AppColors.textSecondary)),
                    ),
                  for (final name in registered)
                    _courseCard(
                      name,
                      batches.where((b) => b.courseId == _courseIdFor(name)).toList(),
                    ),
                  if (extraBatches.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text('Also enrolled', style: AppTextStyles.labelLarge),
                    const SizedBox(height: 8),
                    for (final b in extraBatches)
                      _courseCard(_courseNameFor(b.courseId), [b]),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _courseCard(String name, List<BatchModel> allocated) {
    final pending = allocated.isEmpty;
    final accent = pending ? AppColors.info : AppColors.success;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: accent.withValues(alpha: 0.25)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(name, style: AppTextStyles.labelLarge)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(pending ? 'Pending allocation' : 'Allocated',
                      style: AppTextStyles.caption.copyWith(color: accent)),
                ),
              ],
            ),
            if (pending)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text('Waiting for the admin to assign a batch.',
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.textSecondary)),
              ),
            for (final b in allocated) ...[
              const SizedBox(height: 10),
              Text(
                '${b.batchName}${(b.mode != null && b.mode!.isNotEmpty) ? ' · ${b.mode}' : ''}',
                style: AppTextStyles.bodyMedium,
              ),
              for (final t in _timings(b))
                Padding(
                  padding: const EdgeInsets.only(top: 3),
                  child: Row(
                    children: [
                      const Icon(Icons.schedule, size: 15, color: AppColors.textSecondary),
                      const SizedBox(width: 6),
                      Expanded(
                          child: Text(t,
                              style: AppTextStyles.caption
                                  .copyWith(color: AppColors.textSecondary))),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
