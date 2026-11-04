import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/utils/fee_format.dart';
import '../../attendance/mark_attendance_screen.dart';
import '../fees/extra_bill_detail_screen.dart';
import 'insight_page.dart';
import 'insights_data.dart';

// The smaller "needs attention" lists opened from the dashboard tiles.

String _plural(int n, String one, [String? many]) =>
    '$n ${n == 1 ? one : (many ?? '${one}s')}';

// ------------------------------------------------- attendance not marked ----

/// Classes held in the last 7 days with no attendance taken, by date. A row
/// opens the attendance sheet for that batch and date.
class UnmarkedClassesScreen extends StatelessWidget {
  const UnmarkedClassesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return InsightPage<UnmarkedInsights>(
      title: 'Attendance not marked',
      select: (d) => d.unmarked,
      build: (context, u, reload) {
        if (u.classes.isEmpty) {
          return const [InsightEmpty('Attendance is marked for every class.')];
        }
        final byDate = <String, List<InsightClass>>{};
        for (final c in u.classes) {
          byDate.putIfAbsent(c.date ?? '', () => []).add(c);
        }
        final dates = byDate.keys.toList()..sort((a, b) => b.compareTo(a));
        return [
          Text(
            '${_plural(u.count, 'class', 'classes')} in the last 7 days without attendance. Tap one to mark it.',
            style: AppTextStyles.caption,
          ),
          for (final date in dates) ...[
            InsightHeading(insightDay(date),
                trailing: _plural(byDate[date]!.length, 'class', 'classes')),
            for (final c in byDate[date]!)
              InsightRowCard(
                onTap: () async {
                  await Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => MarkAttendanceScreen(
                      batchId: c.batchId,
                      batchName: c.batchName,
                      date: c.date ?? '',
                    ),
                  ));
                  await reload();
                },
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(c.batchName,
                              style: AppTextStyles.labelLarge,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis),
                          Text(
                            [
                              c.timeLabel,
                              c.teacherName,
                              _plural(c.students, 'student'),
                            ].where((s) => (s ?? '').isNotEmpty).join(' · '),
                            style: AppTextStyles.caption,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    const InsightChip('Mark',
                        color: AppColors.primary, icon: Icons.edit_note),
                  ],
                ),
              ),
          ],
        ];
      },
    );
  }
}

// ------------------------------------------------------ new this month ----

class JoinersScreen extends StatefulWidget {
  const JoinersScreen({super.key});

  @override
  State<JoinersScreen> createState() => _JoinersScreenState();
}

class _JoinersScreenState extends State<JoinersScreen> {
  bool _left = false;

  @override
  Widget build(BuildContext context) {
    return InsightPage<JoinerInsights>(
      title: 'New this month',
      select: (d) => d.joiners,
      build: (context, j, reload) {
        final list = _left ? j.leavers : j.students;
        return [
          SizedBox(
            width: double.infinity,
            child: SegmentedButton<bool>(
              segments: [
                ButtonSegment(
                    value: false, label: Text('Joined (${j.students.length})')),
                ButtonSegment(
                    value: true, label: Text('Left (${j.leavers.length})')),
              ],
              selected: {_left},
              showSelectedIcon: false,
              onSelectionChanged: (s) => setState(() => _left = s.first),
            ),
          ),
          const SizedBox(height: 8),
          Text(j.month, style: AppTextStyles.caption),
          const SizedBox(height: 4),
          if (list.isEmpty)
            InsightEmpty(_left
                ? 'Nobody left this month.'
                : 'No new students this month.')
          else
            for (final p in list)
              InsightRowCard(
                onTap: () =>
                    context.push('/admin/drilldown/student/${p.studentId}'),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    PersonLines(
                      name: p.name,
                      sub: p.parentName == null
                          ? null
                          : 'Parent: ${p.parentName}',
                      phone: p.phone,
                      trailing: Text(
                        _left
                            ? insightDate(p.s('changed'))
                            : 'Joined ${insightDate(p.s('joined'))}',
                        style: AppTextStyles.caption,
                      ),
                    ),
                    if (!_left && (!p.b('fee_set') || !p.b('in_batch')))
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Wrap(spacing: 6, runSpacing: 4, children: [
                          if (!p.b('fee_set'))
                            const InsightChip('Fee not set',
                                color: AppColors.error,
                                icon: Icons.money_off),
                          if (!p.b('in_batch'))
                            const InsightChip('No batch',
                                color: AppColors.warning,
                                icon: Icons.group_off_outlined),
                        ]),
                      ),
                    if (_left && p.s('state') != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: InsightChip(_titleCase(p.s('state')!),
                            color: AppColors.textSecondary),
                      ),
                  ],
                ),
              ),
        ];
      },
    );
  }

  static String _titleCase(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1).replaceAll('_', ' ');
}

// ------------------------------------------------------------ birthdays ----

class BirthdaysScreen extends StatelessWidget {
  const BirthdaysScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return InsightPage<BirthdayInsights>(
      title: 'Birthdays',
      select: (d) => d.birthdays,
      build: (context, b, reload) {
        if (b.students.isEmpty) {
          return const [InsightEmpty('No birthdays coming up.')];
        }
        return [
          for (final p in b.students)
            InsightRowCard(
              onTap: () =>
                  context.push('/admin/drilldown/student/${p.studentId}'),
              borderColor: p.i('in_days') == 0
                  ? AppColors.secondary.withValues(alpha: 0.6)
                  : null,
              child: PersonLines(
                name: p.name,
                sub: [
                  insightDay(p.s('date')),
                  if (p.raw['turns'] != null) 'turns ${p.i('turns')}',
                ].join(' · '),
                phone: p.phone,
                trailing: InsightChip(
                  _inDays(p.i('in_days')),
                  color: p.i('in_days') == 0
                      ? AppColors.secondaryDark
                      : AppColors.studentAccent,
                  icon: Icons.cake_outlined,
                ),
              ),
            ),
        ];
      },
    );
  }

  static String _inDays(int d) => d <= 0
      ? 'Today'
      : d == 1
          ? 'Tomorrow'
          : 'in $d days';
}

// ------------------------------------------------------ demo enquiries ----

class DemoEnquiriesScreen extends StatelessWidget {
  const DemoEnquiriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return InsightPage<DemoInsights>(
      title: 'Demo enquiries',
      select: (d) => d.demos,
      actions: [
        TextButton(
          onPressed: () => context.push('/admin/demos'),
          child: const Text('All demos',
              style: TextStyle(color: Colors.white)),
        ),
      ],
      build: (context, d, reload) {
        return [
          Text(
            d.stale > 0
                ? '${_plural(d.pending, 'enquiry', 'enquiries')} waiting · ${d.stale} not followed up for a while'
                : '${_plural(d.pending, 'enquiry', 'enquiries')} waiting',
            style: AppTextStyles.caption,
          ),
          const SizedBox(height: 8),
          if (d.bookings.isEmpty)
            const InsightEmpty('No pending demo enquiries.')
          else
            for (final b in d.bookings)
              InsightRowCard(
                onTap: () async {
                  await context.push('/admin/demos/${b.id}');
                  await reload();
                },
                borderColor:
                    b.stale ? AppColors.warning.withValues(alpha: 0.5) : null,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    PersonLines(
                      name: b.studentName,
                      sub: [
                        if (b.course != null) b.course!,
                        if (b.parentName != null) 'Parent: ${b.parentName}',
                      ].join(' · '),
                      phone: b.phone,
                      trailing: Text('Asked ${insightDate(b.asked)}',
                          style: AppTextStyles.caption),
                    ),
                    if (b.preferredDate != null || b.stale)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Wrap(spacing: 6, runSpacing: 4, children: [
                          if (b.preferredDate != null)
                            InsightChip(
                                'Wants ${insightDate(b.preferredDate)}',
                                color: AppColors.info,
                                icon: Icons.event),
                          if (b.stale)
                            const InsightChip('Waiting long',
                                color: AppColors.warning,
                                icon: Icons.hourglass_bottom),
                        ]),
                      ),
                  ],
                ),
              ),
        ];
      },
    );
  }
}

// --------------------------------------------------------- batch sizes ----

class BatchCapacityScreen extends StatelessWidget {
  const BatchCapacityScreen({super.key});

  static (String, Color) _label(CapacityRow b) {
    switch (b.state) {
      case 'over':
        return ('Over the limit', AppColors.error);
      case 'full':
        return ('Full', AppColors.warning);
      case 'empty':
        return ('Empty', AppColors.textSecondary);
      case 'small':
        return ('Small', AppColors.info);
      default:
        return (b.state, AppColors.textSecondary);
    }
  }

  @override
  Widget build(BuildContext context) {
    return InsightPage<CapacityInsights>(
      title: 'Batch sizes',
      select: (d) => d.capacity,
      build: (context, c, reload) {
        if (c.batches.isEmpty) {
          return const [InsightEmpty('All batches are a healthy size.')];
        }
        return [
          const Text('Batches that are full, over their limit, empty or very small.',
              style: AppTextStyles.caption),
          const SizedBox(height: 8),
          for (final b in c.batches)
            InsightRowCard(
              onTap: () async {
                await context.push('/admin/batches/${b.batchId}');
                await reload();
              },
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(b.batchName,
                            style: AppTextStyles.labelLarge,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                        Text(
                          [b.courseName, b.teacherName]
                              .whereType<String>()
                              .join(' · '),
                          style: AppTextStyles.caption,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          b.maxStudents != null && b.maxStudents! > 0
                              ? '${b.students} of ${b.maxStudents} places'
                              : _plural(b.students, 'student'),
                          style: AppTextStyles.bodySmall
                              .copyWith(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  InsightChip(_label(b).$1, color: _label(b).$2),
                ],
              ),
            ),
        ];
      },
    );
  }
}

// ---------------------------------------------------------- extra bills ----

/// Open extra bills with how many are paid; a row opens the bill.
class ExtraBillsInsightScreen extends StatelessWidget {
  const ExtraBillsInsightScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return InsightPage<List<ExtraBillInsight>>(
      title: 'Extra bills',
      select: (d) => d.extraBills,
      build: (context, bills, reload) {
        if (bills.isEmpty) return const [InsightEmpty('No open extra bills.')];
        return [
          for (final b in bills)
            InsightRowCard(
              onTap: () async {
                await Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => ExtraBillDetailScreen(chargeId: b.id)));
                await reload();
              },
              child: ExtraBillProgress(bill: b),
            ),
        ];
      },
    );
  }
}

/// Title, paid-of-bills bar and amounts for one extra bill.
class ExtraBillProgress extends StatelessWidget {
  final ExtraBillInsight bill;
  const ExtraBillProgress({super.key, required this.bill});

  @override
  Widget build(BuildContext context) {
    final b = bill;
    final frac = b.bills == 0 ? 0.0 : (b.paid / b.bills).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(b.title,
                  style: AppTextStyles.labelLarge,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ),
            Text('${b.paid}/${b.bills} paid', style: AppTextStyles.caption),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: frac,
            minHeight: 6,
            backgroundColor: AppColors.divider,
            color: AppColors.success,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          [
            '${FeeFormat.rupees(b.paidAmount)} in',
            if (b.dueAmount > 0) '${FeeFormat.rupees(b.dueAmount)} due',
            if (b.dueDate != null) 'by ${insightDate(b.dueDate)}',
          ].join(' · '),
          style: AppTextStyles.caption,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}
