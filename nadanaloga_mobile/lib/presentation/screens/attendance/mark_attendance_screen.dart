import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/date_display.dart';
import '../../../di/injection_container.dart';

/// Teacher marks one class: everyone starts present, tap the few who are not.
/// A class the academy calls off is cancelled here, which owes a make-up.
class MarkAttendanceScreen extends StatefulWidget {
  final int batchId;
  final String batchName;
  final String date; // YYYY-MM-DD

  const MarkAttendanceScreen({
    super.key,
    required this.batchId,
    required this.batchName,
    required this.date,
  });

  @override
  State<MarkAttendanceScreen> createState() => _MarkAttendanceScreenState();
}

class _MarkAttendanceScreenState extends State<MarkAttendanceScreen> {
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String _sessionStatus = 'not_marked';
  String? _cancelReason;
  String? _batchTiming;
  final List<_Row> _rows = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final r = await sl<ApiClient>().getAttendanceRoster(widget.batchId, widget.date);
      final code = r.statusCode ?? 0;
      if (code < 200 || code >= 300) {
        setState(() { _error = _message(r.data, 'Could not load the class.'); _loading = false; });
        return;
      }
      final data = r.data as Map<String, dynamic>;
      final batch = (data['batch'] as Map?) ?? {};
      _rows
        ..clear()
        ..addAll(((data['students'] as List?) ?? []).map((s) => _Row(
              id: int.tryParse('${s['id']}') ?? 0,
              name: '${s['name'] ?? 'Student'}',
              status: '${s['status'] ?? 'present'}',
            )));
      setState(() {
        _sessionStatus = '${data['session_status'] ?? 'not_marked'}';
        _cancelReason = data['cancel_reason'] as String?;
        _batchTiming = [
          formatDisplayTime('${batch['start_time'] ?? ''}'),
          formatDisplayTime('${batch['end_time'] ?? ''}'),
        ].where((s) => s.isNotEmpty).join(' – ');
        _loading = false;
      });
    } catch (_) {
      setState(() { _error = 'Connection error. Please try again.'; _loading = false; });
    }
  }

  String _message(dynamic data, String fallback) =>
      data is Map && data['message'] is String ? data['message'] as String : fallback;

  Future<void> _save() async {
    setState(() => _saving = true);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      final r = await sl<ApiClient>().markAttendance(
        widget.batchId,
        widget.date,
        _rows.map((row) => {'student_id': row.id, 'status': row.status}).toList(),
      );
      final code = r.statusCode ?? 0;
      if (code >= 200 && code < 300) {
        final notified = (r.data is Map ? r.data['notified'] : 0) ?? 0;
        messenger.showSnackBar(SnackBar(
          content: Text(notified == 0
              ? 'Attendance saved.'
              : 'Attendance saved. $notified parent${notified == 1 ? '' : 's'} notified.'),
        ));
        navigator.pop(true);
        return;
      }
      messenger.showSnackBar(SnackBar(
        content: Text(_message(r.data, 'Could not save attendance.')),
        backgroundColor: AppColors.error,
      ));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(
        content: Text('Connection error. Attendance was not saved.'),
        backgroundColor: AppColors.error,
      ));
    }
    if (mounted) setState(() => _saving = false);
  }

  Future<void> _cancelClass() async {
    final controller = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Cancel this class?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Every family in this batch is told the class is off and that a '
              'make-up will be arranged. The academy owes them this class.',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Reason (shown to parents)',
                hintText: 'e.g. Deepavali holiday',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Keep class')),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Cancel class'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _saving = true);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      final r = await sl<ApiClient>().cancelClass(widget.batchId, widget.date, controller.text.trim());
      final code = r.statusCode ?? 0;
      if (code >= 200 && code < 300) {
        messenger.showSnackBar(const SnackBar(
          content: Text('Class cancelled. Families have been told a make-up is owed.'),
        ));
        navigator.pop(true);
        return;
      }
      messenger.showSnackBar(SnackBar(
        content: Text(_message(r.data, 'Could not cancel the class.')),
        backgroundColor: AppColors.error,
      ));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(
        content: Text('Connection error. The class was not cancelled.'),
        backgroundColor: AppColors.error,
      ));
    }
    if (mounted) setState(() => _saving = false);
  }

  int get _absentCount => _rows.where((r) => r.status == 'absent').length;

  @override
  Widget build(BuildContext context) {
    final cancelled = _sessionStatus == 'cancelled';
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mark attendance'),
        actions: [
          if (!_loading && !cancelled && _rows.isNotEmpty)
            TextButton(
              onPressed: _saving ? null : _cancelClass,
              child: const Text('Class off', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _Centered(text: _error!, onRetry: _load)
              : Column(
                  children: [
                    _header(cancelled),
                    if (cancelled)
                      Expanded(
                        child: _Centered(
                          text: 'This class is cancelled${_cancelReason?.isNotEmpty == true ? ' (${_cancelReason!})' : ''}.'
                              '\nThe academy owes a make-up class.',
                        ),
                      )
                    else if (_rows.isEmpty)
                      const Expanded(child: _Centered(text: 'No students in this batch yet.'))
                    else
                      Expanded(
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                          itemCount: _rows.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, i) => _studentCard(_rows[i]),
                        ),
                      ),
                  ],
                ),
      bottomNavigationBar: (_loading || cancelled || _rows.isEmpty)
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton.icon(
                  onPressed: _saving ? null : _save,
                  icon: _saving
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.check),
                  label: Text(_saving ? 'Saving…' : 'Save attendance'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    backgroundColor: AppColors.primary,
                  ),
                ),
              ),
            ),
    );
  }

  Widget _header(bool cancelled) => Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        color: AppColors.primary.withValues(alpha: 0.06),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.batchName, style: AppTextStyles.labelLarge),
            const SizedBox(height: 2),
            Text(
              [formatDisplayDate(widget.date), if (_batchTiming?.isNotEmpty == true) _batchTiming!]
                  .join(' · '),
              style: AppTextStyles.caption,
            ),
            if (!cancelled && _rows.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                _absentCount == 0
                    ? 'All ${_rows.length} present'
                    : '$_absentCount of ${_rows.length} absent',
                style: AppTextStyles.caption.copyWith(
                  color: _absentCount == 0 ? AppColors.success : AppColors.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            if (_sessionStatus == 'held') ...[
              const SizedBox(height: 4),
              Text('Already marked — saving again updates it.', style: AppTextStyles.caption),
            ],
          ],
        ),
      );

  Widget _studentCard(_Row row) {
    final color = switch (row.status) {
      'absent' => AppColors.error,
      'late' => Colors.orange,
      'excused' => AppColors.textSecondary,
      _ => AppColors.success,
    };
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withValues(alpha: 0.15),
              child: Text(row.name.isNotEmpty ? row.name[0].toUpperCase() : '?',
                  style: TextStyle(color: color, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(row.name, style: AppTextStyles.bodyMedium)),
            SegmentedButton<String>(
              style: const ButtonStyle(visualDensity: VisualDensity.compact),
              segments: const [
                ButtonSegment(value: 'present', label: Text('P'), tooltip: 'Present'),
                ButtonSegment(value: 'late', label: Text('L'), tooltip: 'Late'),
                ButtonSegment(value: 'absent', label: Text('A'), tooltip: 'Absent'),
              ],
              selected: {row.status == 'excused' ? 'absent' : row.status},
              showSelectedIcon: false,
              onSelectionChanged: (sel) => setState(() => row.status = sel.first),
            ),
          ],
        ),
      ),
    );
  }
}

class _Row {
  final int id;
  final String name;
  String status;
  _Row({required this.id, required this.name, required this.status});
}

class _Centered extends StatelessWidget {
  final String text;
  final VoidCallback? onRetry;
  const _Centered({required this.text, this.onRetry});

  @override
  Widget build(BuildContext context) => Center(
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
