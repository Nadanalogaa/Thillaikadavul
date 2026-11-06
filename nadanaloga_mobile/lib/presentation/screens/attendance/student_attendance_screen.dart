import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/date_display.dart';
import '../../../data/models/makeup_model.dart';
import '../../../di/injection_container.dart';
import '../home/dashboard_parts.dart' show MakeupAttendanceLine, makeupAmber, makeupIndigo;

/// What a parent (or student) sees: the last three months of classes, with a
/// simple summary at the top. Classes the academy cancelled don't count against
/// the student; each one says when its make-up is (or that it is still to be
/// fixed), and a make-up class says which cancelled day it gives back.
class StudentAttendanceScreen extends StatefulWidget {
  final int studentId;
  final String studentName;

  const StudentAttendanceScreen({
    super.key,
    required this.studentId,
    required this.studentName,
  });

  @override
  State<StudentAttendanceScreen> createState() => _StudentAttendanceScreenState();
}

class _StudentAttendanceScreenState extends State<StudentAttendanceScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic> _summary = const {};
  List<Map<String, dynamic>> _records = const [];
  /// Make-ups still to come (owed or scheduled) for this student's batches.
  List<MakeupRow> _makeups = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final r = await sl<ApiClient>().getStudentAttendance(widget.studentId);
      final code = r.statusCode ?? 0;
      if (code < 200 || code >= 300) {
        setState(() {
          _error = r.data is Map && r.data['message'] is String
              ? r.data['message'] as String
              : 'Could not load attendance.';
          _loading = false;
        });
        return;
      }
      final data = r.data as Map<String, dynamic>;
      setState(() {
        _summary = (data['summary'] as Map?)?.cast<String, dynamic>() ?? {};
        _records = ((data['records'] as List?) ?? []).cast<Map<String, dynamic>>();
        _makeups = MakeupRow.listFrom(data['makeups']);
        _loading = false;
      });
    } catch (_) {
      setState(() { _error = 'Connection error. Please try again.'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('${widget.studentName} · Attendance')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _centered(_error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _summaryCard(),
                      if (_makeups.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Text('Make-up classes', style: AppTextStyles.labelLarge),
                        const SizedBox(height: 4),
                        Text(
                          'For classes the academy cancelled. The academy fixes the date and you are told.',
                          style: AppTextStyles.caption,
                        ),
                        const SizedBox(height: 8),
                        for (final m in _makeups)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: MakeupAttendanceLine(row: m),
                          ),
                      ],
                      const SizedBox(height: 16),
                      Text('Last 3 months', style: AppTextStyles.labelLarge),
                      const SizedBox(height: 8),
                      if (_records.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 24),
                          child: Text('No classes recorded yet.',
                              textAlign: TextAlign.center, style: AppTextStyles.caption),
                        )
                      else
                        ..._records.map(_recordTile),
                    ],
                  ),
                ),
    );
  }

  Widget _summaryCard() {
    final pct = _summary['percentage'];
    final classes = _summary['classes'] ?? 0;
    final cancelled = (_summary['cancelled'] ?? 0) as int;
    final madeUp = (_summary['made_up'] ?? 0) as int;
    final pending = (_summary['makeups_pending'] ?? 0) as int;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  pct == null ? '—' : '$pct%',
                  style: AppTextStyles.labelLarge.copyWith(
                    fontSize: 32,
                    color: pct == null
                        ? AppColors.textSecondary
                        : (pct >= 75 ? AppColors.success : Colors.orange),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    pct == null ? 'No classes yet' : 'attended of $classes classes',
                    style: AppTextStyles.caption,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _stat('Present', '${_summary['present'] ?? 0}', AppColors.success),
                _stat('Absent', '${_summary['absent'] ?? 0}', AppColors.error),
                _stat('Late', '${_summary['late'] ?? 0}', Colors.orange),
                if (cancelled != 0) _stat('Cancelled', '$cancelled', AppColors.textSecondary),
              ],
            ),
            if (cancelled != 0 || pending != 0) ...[
              const SizedBox(height: 10),
              Text(
                [
                  'Classes the academy cancelled are not counted.',
                  if (madeUp > 0) '$madeUp made up.',
                  if (pending > 0) '$pending make-up ${pending == 1 ? 'class' : 'classes'} to come.',
                ].join(' '),
                style: AppTextStyles.caption,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _stat(String label, String value, Color color) => Expanded(
        child: Column(
          children: [
            Text(value, style: AppTextStyles.labelLarge.copyWith(color: color)),
            Text(label, style: AppTextStyles.caption),
          ],
        ),
      );

  Widget _recordTile(Map<String, dynamic> r) {
    final sessionStatus = '${r['session_status'] ?? ''}';
    final status = '${r['status'] ?? ''}';
    final isCancelled = sessionStatus == 'cancelled';
    final isMakeup = sessionStatus == 'makeup';
    final (label, color, icon) = switch (isCancelled ? 'cancelled' : status) {
      'present' => ('Present', AppColors.success, Icons.check_circle_outline),
      'late' => ('Late', Colors.orange, Icons.schedule),
      'absent' => ('Absent', AppColors.error, Icons.cancel_outlined),
      'excused' => ('Excused', AppColors.textSecondary, Icons.event_busy_outlined),
      'cancelled' => ('Class cancelled', AppColors.textSecondary, Icons.block),
      _ => ('Not marked', AppColors.textHint, Icons.help_outline),
    };
    final reason = '${r['cancel_reason'] ?? ''}'.trim();
    final note = '${r['class_note'] ?? ''}'.trim();

    // For a cancelled class: where its make-up stands.
    String? makeupLine;
    Color makeupColor = makeupIndigo;
    if (isCancelled) {
      final madeUp = r['made_up'] == true;
      final date = '${r['makeup_date'] ?? ''}';
      if (madeUp && date.isNotEmpty) {
        makeupLine = 'Made up on ${makeupDayLabel(date)}';
      } else if (date.isNotEmpty) {
        final a = makeupClock('${r['makeup_start'] ?? ''}'), b = makeupClock('${r['makeup_end'] ?? ''}');
        makeupLine = 'Make-up on ${makeupDayLabel(date)}${a.isEmpty ? '' : ', $a${b.isEmpty ? '' : '–$b'}'}';
      } else {
        makeupLine = 'Make-up date to be announced';
        makeupColor = makeupAmber;
      }
    }
    final forDate = '${r['makeup_for_date'] ?? ''}';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Icon(isMakeup ? Icons.event_repeat_rounded : icon,
                  color: isMakeup ? makeupIndigo : color),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(formatDisplayDate('${r['session_date'] ?? ''}'),
                            style: AppTextStyles.bodyMedium),
                      ),
                      Text(label,
                          style: AppTextStyles.caption
                              .copyWith(color: color, fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    [
                      '${r['batch_name'] ?? ''}',
                      if (isCancelled && reason.isNotEmpty) reason,
                    ].where((s) => s.isNotEmpty).join(' · '),
                    style: AppTextStyles.caption,
                  ),
                  if (isMakeup) ...[
                    const SizedBox(height: 4),
                    _chip(
                      forDate.isEmpty
                          ? 'Make-up class'
                          : 'Make-up class for ${makeupDayLabel(forDate)}',
                      makeupIndigo,
                    ),
                  ],
                  if (makeupLine != null) ...[
                    const SizedBox(height: 4),
                    _chip(makeupLine, makeupColor),
                  ],
                  // What the teacher taught that day.
                  if (note.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(note,
                        style: AppTextStyles.caption.copyWith(color: AppColors.textPrimary)),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(text,
            style: AppTextStyles.caption
                .copyWith(color: color, fontWeight: FontWeight.w600)),
      );

  Widget _centered(String text, {VoidCallback? onRetry}) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(text, textAlign: TextAlign.center, style: AppTextStyles.bodyMedium),
              if (onRetry != null) ...[
                const SizedBox(height: 12),
                OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
              ],
            ],
          ),
        ),
      );
}
