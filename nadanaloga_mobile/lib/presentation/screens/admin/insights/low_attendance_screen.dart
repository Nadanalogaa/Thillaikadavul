import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import 'insights_data.dart';

/// Students attending below the threshold (or missing several classes in a
/// row) over the last 30 / 60 / 90 days, worst first.
class LowAttendanceScreen extends StatefulWidget {
  const LowAttendanceScreen({super.key});

  @override
  State<LowAttendanceScreen> createState() => _LowAttendanceScreenState();
}

class _LowAttendanceScreenState extends State<LowAttendanceScreen> {
  final _search = TextEditingController();
  int _days = 30;
  AttendanceInsights? _data;
  String? _error;
  bool _loading = true;

  /// Guards against an older request finishing after a newer one.
  int _request = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final req = ++_request;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final d = await AdminInsights.load(days: _days);
      if (!mounted || req != _request) return;
      setState(() {
        _data = d.attendance;
        _loading = false;
      });
    } catch (e) {
      if (!mounted || req != _request) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  void _setDays(int d) {
    if (d == _days) return;
    setState(() => _days = d);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Low attendance'),
        bottom: _loading && _data != null
            ? const PreferredSize(
                preferredSize: Size.fromHeight(2),
                child: LinearProgressIndicator(minHeight: 2),
              )
            : null,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: SizedBox(
              width: double.infinity,
              child: SegmentedButton<int>(
                segments: const [
                  ButtonSegment(value: 30, label: Text('30 days')),
                  ButtonSegment(value: 60, label: Text('60 days')),
                  ButtonSegment(value: 90, label: Text('90 days')),
                ],
                selected: {_days},
                showSelectedIcon: false,
                onSelectionChanged: (s) => _setDays(s.first),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: InsightSearchField(
              controller: _search,
              hint: 'Search name, batch, teacher or phone',
              onChanged: (_) => setState(() {}),
            ),
          ),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _body() {
    final d = _data;
    if (d == null || (_error != null && !_loading)) {
      if (_loading) return const Center(child: CircularProgressIndicator());
      return InsightError(message: _error ?? 'Could not load.', onRetry: _load);
    }
    final rows = d.students
        .where((r) => insightMatches(_search.text, [
              r.name,
              r.batchName,
              r.teacherName,
              r.courseName,
              r.phone,
              r.parentName,
            ]))
        .toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Text(
              '${d.count} ${d.count == 1 ? 'student' : 'students'} below ${d.threshold}% or missing 3+ classes in a row · last ${d.days} days',
              style: AppTextStyles.caption,
            ),
          ),
          if (rows.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 32),
              child: Center(
                child: Text(
                  d.students.isEmpty
                      ? 'Everyone is attending well.'
                      : 'No students match.',
                  style: AppTextStyles.bodyMedium
                      .copyWith(color: AppColors.textSecondary),
                ),
              ),
            )
          else
            for (final r in rows) _row(r),
        ],
      ),
    );
  }

  Color _pctColor(num p) {
    if (p < 50) return AppColors.error;
    if (p < 75) return AppColors.warning;
    return AppColors.success;
  }

  Widget _row(AttendanceInsightRow r) {
    final pct = r.percentage.round();
    final color = _pctColor(r.percentage);
    final batchLine = [
      if (r.batchName != null) r.batchName!,
      if (r.teacherName != null) r.teacherName!,
    ].join(' · ');
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.divider),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(r.name,
                          style: AppTextStyles.labelLarge,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                      if (batchLine.isNotEmpty)
                        Text(batchLine,
                            style: AppTextStyles.caption,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis),
                      if (r.courseName != null)
                        Text(r.courseName!,
                            style: AppTextStyles.caption,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text('$pct%',
                      style: AppTextStyles.labelLarge.copyWith(color: color)),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Attended ${r.attended} of ${r.classes} · $pct%',
              style: AppTextStyles.bodySmall
                  .copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                if (r.missedInARow >= 3)
                  InsightChip('Missed last ${r.missedInARow} in a row',
                      color: AppColors.error, icon: Icons.event_busy),
                InsightChip(
                  r.lastAttended == null
                      ? 'Not attended in this period'
                      : 'Last came ${insightDate(r.lastAttended)}',
                  color: AppColors.textSecondary,
                  icon: Icons.history,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                if (r.parentName != null)
                  Expanded(
                    child: Text('Parent: ${r.parentName}',
                        style: AppTextStyles.caption,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  )
                else
                  const Spacer(),
                const SizedBox(width: 8),
                Flexible(child: PhoneLink(r.phone)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
