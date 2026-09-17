import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/course_model.dart';
import '../home/class_schedule.dart';

/// Courses — the same view the web "Courses" menu shows: every course the
/// student registered for, with its allocated batch (timings) or
/// "Pending allocation" until the admin places them in a batch.
/// One student's courses, for the family-wide Courses tab.
class CourseSection {
  final String name;
  final List<String> registered;
  final List<BatchModel> batches;

  const CourseSection({
    required this.name,
    required this.registered,
    required this.batches,
  });
}

class StudentCoursesScreen extends StatelessWidget {
  final List<String> registered;
  final List<BatchModel> batches;
  final List<CourseModel> courses;
  final bool isLoading;
  final VoidCallback onRefresh;

  /// Every student in the household. With more than one, the tab lists each
  /// student's courses under their name; otherwise [registered] / [batches].
  final List<CourseSection> sections;

  const StudentCoursesScreen({
    super.key,
    required this.registered,
    required this.batches,
    required this.courses,
    required this.isLoading,
    required this.onRefresh,
    this.sections = const [],
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
    final lines = ClassSchedule.timingLines(b);
    return lines.isEmpty ? const ['Timings not set'] : lines;
  }

  /// Course cards for one student: registered courses (allocated or pending),
  /// then batches for courses they did not register for.
  List<Widget> _cardsFor(List<String> registered, List<BatchModel> batches) {
    final registeredIds = registered.map(_courseIdFor).whereType<int>().toSet();
    final extraBatches =
        batches.where((b) => !registeredIds.contains(b.courseId)).toList();
    return [
      if (registered.isEmpty && batches.isEmpty)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Text('No courses selected yet.',
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
        for (final b in extraBatches) _courseCard(_courseNameFor(b.courseId), [b]),
      ],
    ];
  }

  @override
  Widget build(BuildContext context) {
    if (sections.length > 1) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Courses'),
          backgroundColor: AppColors.studentAccent,
          automaticallyImplyLeading: false,
        ),
        body: isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: () async => onRefresh(),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    for (final section in sections) ...[
                      Padding(
                        padding: const EdgeInsets.fromLTRB(4, 8, 0, 10),
                        child: Text(section.name, style: AppTextStyles.h4),
                      ),
                      ..._cardsFor(section.registered, section.batches),
                    ],
                  ],
                ),
              ),
      );
    }

    final registeredIds = registered.map(_courseIdFor).whereType<int>().toSet();
    final extraBatches =
        batches.where((b) => !registeredIds.contains(b.courseId)).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Courses'),
        backgroundColor: AppColors.studentAccent,
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
