import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import 'dashboard_widgets.dart';
import 'insight_page.dart';
import 'insights_data.dart';

String _plural(int n, String one, [String? many]) =>
    '$n ${n == 1 ? one : (many ?? '${one}s')}';

IconData _courseIcon(String name) {
  final n = name.toLowerCase();
  if (n.contains('bharat')) return Icons.self_improvement;
  if (n.contains('vocal') || n.contains('carnatic')) return Icons.mic;
  if (n.contains('dance')) return Icons.directions_run;
  if (n.contains('draw') || n.contains('art')) return Icons.brush;
  if (n.contains('abacus')) return Icons.calculate;
  if (n.contains('phonic')) return Icons.record_voice_over_outlined;
  if (n.contains('violin')) return Icons.queue_music;
  if (n.contains('veena')) return Icons.music_note;
  if (n.contains('keyboard') || n.contains('piano')) return Icons.piano;
  return Icons.menu_book_outlined;
}

/// Students (each counted once) against course places (one per student per
/// course), then one card per course. A course card opens the students of
/// that course.
class EnrolmentsInsightScreen extends StatelessWidget {
  const EnrolmentsInsightScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return InsightPage<EnrolmentInsights>(
      title: 'Students and course places',
      select: (d) => d.enrolments,
      build: (context, e, reload) {
        final students = e.students ?? 0;
        final places = e.coursePlaces ?? students;
        final extra = places - students;
        Future<void> open(String path) async {
          await context.push(path);
          await reload();
        }

        return [
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: _BigNumber(
                    icon: Icons.school_outlined,
                    color: AppColors.studentAccent,
                    value: students,
                    label: 'Students',
                    sub: 'each counted once',
                    onTap: () => open('/admin/drilldown/students'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _BigNumber(
                    icon: Icons.menu_book_outlined,
                    color: AppColors.secondaryDark,
                    value: places,
                    label: 'Course places',
                    sub: extra > 0
                        ? '$extra more than students: some take two or more courses'
                        : 'one course each',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          InsightHeading('By course',
              trailing: _plural(e.byCourse.length, 'course')),
          if (e.byCourse.isEmpty)
            const InsightEmpty('No students are on a course yet.')
          else
            for (final c in e.byCourse)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _CourseCard(
                  c: c,
                  places: places,
                  onTap: () => open(
                      '/admin/drilldown/students/course/${Uri.encodeComponent(c.course)}'),
                ),
              ),
        ];
      },
    );
  }
}

class _BigNumber extends StatelessWidget {
  final IconData icon;
  final Color color;
  final int value;
  final String label;
  final String sub;
  final VoidCallback? onTap;
  const _BigNumber({
    required this.icon,
    required this.color,
    required this.value,
    required this.label,
    required this.sub,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return DashPanel(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: color),
              const Spacer(),
              if (onTap != null)
                const Icon(Icons.chevron_right,
                    size: 18, color: AppColors.textHint),
            ],
          ),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text('$value',
                style: AppTextStyles.h1
                    .copyWith(fontWeight: FontWeight.w700, height: 1.1)),
          ),
          Text(label,
              style: AppTextStyles.labelLarge,
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          Text(sub,
              style: AppTextStyles.caption,
              maxLines: 3,
              overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

class _CourseCard extends StatelessWidget {
  final CourseEnrolment c;
  final int places;
  final VoidCallback onTap;
  const _CourseCard(
      {required this.c, required this.places, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final share = places > 0 ? c.count / places : 0.0;
    final pct = (share * 100).round();
    const warn = AppColors.warning;
    return DashPanel(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(_courseIcon(c.course),
                    size: 18, color: AppColors.primary),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(c.course,
                    style: AppTextStyles.labelLarge,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
              ),
              const SizedBox(width: 8),
              Text('${c.count}',
                  style: AppTextStyles.h2
                      .copyWith(fontWeight: FontWeight.w700, height: 1.1)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: share.clamp(0.0, 1.0).toDouble(),
                    minHeight: 6,
                    backgroundColor: AppColors.divider,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text('students · $pct%', style: AppTextStyles.caption),
            ],
          ),
          const SizedBox(height: 6),
          Text.rich(
            TextSpan(
              style: AppTextStyles.caption,
              children: [
                TextSpan(text: _plural(c.batches, 'batch', 'batches')),
                if (c.notInBatch > 0)
                  TextSpan(
                    text: ' · ${c.notInBatch} not in a batch',
                    style: const TextStyle(
                        color: warn, fontWeight: FontWeight.w600),
                  ),
                if (c.noGrade > 0)
                  TextSpan(
                    text: ' · ${c.noGrade} no grade',
                    style: const TextStyle(
                        color: warn, fontWeight: FontWeight.w600),
                  ),
              ],
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
