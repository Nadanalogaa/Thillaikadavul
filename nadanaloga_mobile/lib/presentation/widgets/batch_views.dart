import 'package:flutter/material.dart';

import '../../config/theme/app_colors.dart';
import '../../config/theme/app_text_styles.dart';
import '../../data/models/batch_model.dart';
import '../screens/home/class_schedule.dart';

/// How a list of batches is laid out: cards or a table.
enum BatchViewMode { grid, table }

/// The chosen layout, shared by every batch list and kept while the app runs
/// (there is no on-device preferences store in this app).
class BatchViewPreference {
  BatchViewPreference._();
  static final ValueNotifier<BatchViewMode> mode =
      ValueNotifier(BatchViewMode.grid);
}

/// Colours used to make a batch's teacher, timings and size stand out the
/// same way on every screen.
class BatchPalette {
  BatchPalette._();
  static const Color teacher = AppColors.teacherAccent;
  static const Color times = AppColors.primary;
  static const Color students = AppColors.studentAccent;
  static const Color course = AppColors.courseDefault;
  static const Color unassigned = AppColors.warning;

  static Color mode(String? mode) {
    switch ((mode ?? '').toLowerCase()) {
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

/// Number of students in a batch, from `student_ids` only.
int batchStudentCount(BatchModel b) => b.studentIds.toSet().length;

bool batchHasTeacher(BatchModel b) =>
    b.teacherId != null || (b.teacherName ?? '').trim().isNotEmpty;

String batchTeacherLabel(BatchModel b) {
  final n = (b.teacherName ?? '').trim();
  if (n.isNotEmpty) return n;
  return b.teacherId != null ? 'Teacher #${b.teacherId}' : 'Not assigned';
}

/// Grid / table switch. Reads and writes [BatchViewPreference.mode].
class BatchViewToggle extends StatelessWidget {
  /// Colour of the selected option; defaults to the app bar's foreground.
  final Color? color;
  final bool onDarkBackground;

  const BatchViewToggle({super.key, this.color, this.onDarkBackground = false});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<BatchViewMode>(
      valueListenable: BatchViewPreference.mode,
      builder: (context, mode, _) {
        final fg = color ??
            (onDarkBackground
                ? Colors.white
                : IconTheme.of(context).color ?? AppColors.primary);
        Widget option(BatchViewMode m, IconData icon, String tip) {
          final selected = mode == m;
          return Tooltip(
            message: tip,
            child: InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () => BatchViewPreference.mode.value = m,
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: selected ? fg.withValues(alpha: 0.18) : null,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon,
                    size: 20,
                    color: selected ? fg : fg.withValues(alpha: 0.55)),
              ),
            ),
          );
        }

        return Container(
          padding: const EdgeInsets.all(2),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: fg.withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              option(BatchViewMode.grid, Icons.grid_view_rounded, 'Grid view'),
              const SizedBox(width: 2),
              option(BatchViewMode.table, Icons.table_rows_outlined,
                  'Table view'),
            ],
          ),
        );
      },
    );
  }
}

/// Small coloured pill, e.g. the batch mode.
class BatchPill extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;

  const BatchPill({super.key, required this.label, required this.color, this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 4),
          ],
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.caption.copyWith(
                color: color,
                fontWeight: FontWeight.w600,
                fontSize: 11,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Block extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final Widget child;

  const _Block({
    required this.icon,
    required this.label,
    required this.color,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.labelSmall.copyWith(
                    color: color,
                    fontWeight: FontWeight.w700,
                    fontSize: 10,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          child,
        ],
      ),
    );
  }
}

/// The three things the academy looks for in a batch, as coloured blocks:
/// Teacher (or Course), Students (count / max) and Class times.
class BatchHighlights extends StatelessWidget {
  final BatchModel batch;

  /// Show the teacher block; when false the course is shown in its place
  /// (a teacher's own list doesn't need her name on every card).
  final bool showTeacher;

  /// Bigger type for a screen header.
  final bool large;

  /// Cap the timing lines (cards); null shows all.
  final int? maxTimingLines;

  const BatchHighlights({
    super.key,
    required this.batch,
    this.showTeacher = true,
    this.large = false,
    this.maxTimingLines = 4,
  });

  @override
  Widget build(BuildContext context) {
    final count = batchStudentCount(batch);
    final max = batch.maxStudents;
    final full = max != null && max > 0 && count >= max;
    final timings = ClassSchedule.timingLines(batch);
    final shown = maxTimingLines == null
        ? timings
        : timings.take(maxTimingLines!).toList();
    final hidden = timings.length - shown.length;

    final Widget left;
    if (showTeacher) {
      final has = batchHasTeacher(batch);
      left = _Block(
        icon: Icons.person_rounded,
        label: 'Teacher',
        color: has ? BatchPalette.teacher : BatchPalette.unassigned,
        child: Text(
          batchTeacherLabel(batch),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: AppTextStyles.labelLarge.copyWith(
            fontSize: large ? 17 : 15,
            fontWeight: FontWeight.w700,
            color: has ? BatchPalette.teacher : const Color(0xFFB45309),
          ),
        ),
      );
    } else {
      left = _Block(
        icon: Icons.menu_book_rounded,
        label: 'Course',
        color: BatchPalette.course,
        child: Text(
          batch.courseName ?? '—',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: AppTextStyles.labelLarge.copyWith(
            fontSize: large ? 17 : 15,
            fontWeight: FontWeight.w700,
            color: BatchPalette.course,
          ),
        ),
      );
    }

    final studentsColor = full ? AppColors.error : BatchPalette.students;
    final students = _Block(
      icon: Icons.people_alt_rounded,
      label: 'Students',
      color: studentsColor,
      child: FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.centerLeft,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              '$count',
              style: TextStyle(
                fontFamily: AppTextStyles.fontFamily,
                fontSize: large ? 30 : 24,
                height: 1.1,
                fontWeight: FontWeight.w800,
                color: studentsColor,
              ),
            ),
            if (max != null && max > 0)
              Text(
                ' / $max',
                style: AppTextStyles.labelLarge.copyWith(
                  color: studentsColor.withValues(alpha: 0.75),
                  fontWeight: FontWeight.w600,
                ),
              ),
          ],
        ),
      ),
    );

    final times = _Block(
      icon: Icons.schedule_rounded,
      label: 'Class times',
      color: timings.isEmpty ? BatchPalette.unassigned : BatchPalette.times,
      child: timings.isEmpty
          ? Text(
              'Timings not set',
              style: AppTextStyles.labelLarge.copyWith(
                fontWeight: FontWeight.w600,
                color: const Color(0xFFB45309),
              ),
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final t in shown)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: Text(
                      t,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.labelLarge.copyWith(
                        fontSize: large ? 15 : 13,
                        fontWeight: FontWeight.w600,
                        color: BatchPalette.times,
                      ),
                    ),
                  ),
                if (hidden > 0)
                  Text('+$hidden more',
                      style: AppTextStyles.caption
                          .copyWith(color: BatchPalette.times)),
              ],
            ),
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(flex: 3, child: left),
              const SizedBox(width: 8),
              Expanded(flex: 2, child: students),
            ],
          ),
        ),
        const SizedBox(height: 8),
        times,
      ],
    );
  }
}

/// One batch as a card: name, mode, studio, then [BatchHighlights].
class BatchGridCard extends StatelessWidget {
  final BatchModel batch;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool showTeacher;
  final bool showCourse;

  const BatchGridCard({
    super.key,
    required this.batch,
    this.onTap,
    this.trailing,
    this.showTeacher = true,
    this.showCourse = false,
  });

  @override
  Widget build(BuildContext context) {
    final place = [
      if ((batch.studio ?? '').isNotEmpty) batch.studio!,
      if ((batch.locationName ?? '').isNotEmpty) batch.locationName!,
    ].join(' · ');
    return Card(
      margin: EdgeInsets.zero,
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 4, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            batch.batchName,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTextStyles.h4.copyWith(
                                fontSize: 16, fontWeight: FontWeight.w700),
                          ),
                          if (showCourse && (batch.courseName ?? '').isNotEmpty)
                            Text(batch.courseName!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTextStyles.caption),
                          const SizedBox(height: 4),
                          Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children: [
                              if ((batch.mode ?? '').isNotEmpty)
                                BatchPill(
                                    label: batch.mode!,
                                    color: BatchPalette.mode(batch.mode)),
                              if (place.isNotEmpty)
                                BatchPill(
                                  label: place,
                                  color: AppColors.textSecondary,
                                  icon: Icons.place_outlined,
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (trailing != null) trailing! else const SizedBox(width: 8),
                ],
              ),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: BatchHighlights(batch: batch, showTeacher: showTeacher),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Lays cards out in as many columns as fit (one on a phone, two or more on
/// a tablet or the web), each card as tall as its content.
class BatchCardGrid extends StatelessWidget {
  final List<Widget> children;
  final double minItemWidth;
  final double spacing;

  const BatchCardGrid({
    super.key,
    required this.children,
    this.minItemWidth = 300,
    this.spacing = 12,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, c) {
      final w = c.maxWidth;
      final cols = ((w + spacing) / (minItemWidth + spacing)).floor().clamp(1, 4);
      final itemW = (w - spacing * (cols - 1)) / cols;
      return Wrap(
        spacing: spacing,
        runSpacing: spacing,
        children: [
          for (final child in children) SizedBox(width: itemW, child: child),
        ],
      );
    });
  }
}

/// Batches as a horizontally scrollable table:
/// Batch | Course | Teacher | Class times | Students | Mode.
class BatchTable extends StatelessWidget {
  final List<BatchModel> batches;
  final ValueChanged<BatchModel>? onTap;
  final bool showCourse;
  final bool showTeacher;

  const BatchTable({
    super.key,
    required this.batches,
    this.onTap,
    this.showCourse = true,
    this.showTeacher = true,
  });

  @override
  Widget build(BuildContext context) {
    final head = AppTextStyles.labelSmall.copyWith(
      fontWeight: FontWeight.w700,
      color: AppColors.textPrimary,
      fontSize: 12,
    );
    return Card(
      margin: EdgeInsets.zero,
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          showCheckboxColumn: false,
          headingRowHeight: 42,
          headingRowColor: WidgetStateProperty.all(
              AppColors.primary.withValues(alpha: 0.06)),
          dataRowMinHeight: 56,
          dataRowMaxHeight: double.infinity,
          horizontalMargin: 12,
          columnSpacing: 18,
          columns: [
            DataColumn(label: Text('Batch', style: head)),
            if (showCourse) DataColumn(label: Text('Course', style: head)),
            if (showTeacher) DataColumn(label: Text('Teacher', style: head)),
            DataColumn(label: Text('Class times', style: head)),
            DataColumn(label: Text('Students', style: head), numeric: true),
            DataColumn(label: Text('Mode', style: head)),
          ],
          rows: [
            for (final b in batches)
              DataRow(
                onSelectChanged: onTap == null ? null : (_) => onTap!(b),
                cells: [
                  DataCell(ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 170),
                    child: Text(
                      b.batchName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.labelLarge
                          .copyWith(fontWeight: FontWeight.w700),
                    ),
                  )),
                  if (showCourse)
                    DataCell(ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 140),
                      child: Text(b.courseName ?? '—',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.bodyMedium),
                    )),
                  if (showTeacher) DataCell(_teacherCell(b)),
                  DataCell(_timesCell(b)),
                  DataCell(_countCell(b)),
                  DataCell((b.mode ?? '').isEmpty
                      ? const Text('—')
                      : BatchPill(
                          label: b.mode!, color: BatchPalette.mode(b.mode))),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _teacherCell(BatchModel b) {
    final has = batchHasTeacher(b);
    final color = has ? BatchPalette.teacher : BatchPalette.unassigned;
    return Container(
      constraints: const BoxConstraints(maxWidth: 160),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(has ? Icons.person_rounded : Icons.warning_amber_rounded,
              size: 14, color: has ? color : const Color(0xFFB45309)),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              batchTeacherLabel(b),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.labelLarge.copyWith(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: has ? color : const Color(0xFFB45309),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _timesCell(BatchModel b) {
    final lines = ClassSchedule.timingLines(b);
    if (lines.isEmpty) {
      return Text('Not set',
          style: AppTextStyles.caption.copyWith(color: const Color(0xFFB45309)));
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final l in lines)
            Text(l,
                style: AppTextStyles.bodySmall.copyWith(
                  color: BatchPalette.times,
                  fontWeight: FontWeight.w600,
                )),
        ],
      ),
    );
  }

  Widget _countCell(BatchModel b) {
    final count = batchStudentCount(b);
    final max = b.maxStudents;
    final full = max != null && max > 0 && count >= max;
    final color = full ? AppColors.error : BatchPalette.students;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text.rich(
        TextSpan(children: [
          TextSpan(
            text: '$count',
            style: TextStyle(
              fontFamily: AppTextStyles.fontFamily,
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          if (max != null && max > 0)
            TextSpan(
              text: ' / $max',
              style: AppTextStyles.caption
                  .copyWith(color: color, fontWeight: FontWeight.w600),
            ),
        ]),
      ),
    );
  }
}
