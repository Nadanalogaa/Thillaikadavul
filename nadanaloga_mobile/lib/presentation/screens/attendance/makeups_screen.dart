import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/makeup_model.dart';
import '../../../di/injection_container.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_state.dart';
import '../admin/insights/dashboard_widgets.dart';

/// Owed is amber, scheduled indigo, done green (as on the website).
const Color makeupOwedColor = Color(0xFFB45309);
const Color makeupScheduledColor = Color(0xFF4F46E5);
const Color makeupDoneColor = Color(0xFF15803D);

(String, Color) makeupStateLabel(String state) => switch (state) {
      'scheduled' => ('Scheduled', makeupScheduledColor),
      'done' => ('Done', makeupDoneColor),
      _ => ('Owed · date not fixed', makeupOwedColor),
    };

/// Make-up (compensation) classes: a cancelled class is owed until the admin
/// or the batch's teacher fixes a day and time (any day, not only the batch's
/// usual days); it can be moved until attendance is marked for it, and it is
/// done once held: marking attendance for the make-up closes it, or "Mark as
/// done" does. The server tells families, the teacher and admins each time.
class MakeupsScreen extends StatefulWidget {
  const MakeupsScreen({super.key});

  @override
  State<MakeupsScreen> createState() => _MakeupsScreenState();
}

class _MakeupsScreenState extends State<MakeupsScreen> {
  List<MakeupRow>? _rows;
  String? _error;
  bool _loading = true;
  bool _all = false;
  int? _busy;

  bool get _isAdmin {
    try {
      final s = context.read<AuthBloc>().state;
      return s is AuthAuthenticated && s.user.isAdmin;
    } catch (_) {
      return false;
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await sl<ApiClient>().getMakeups(all: _all);
      final code = r.statusCode ?? 0;
      if (!mounted) return;
      if (code < 200 || code >= 300 || r.data is! List) {
        setState(() {
          _error = _message(r.data, 'Could not load make-up classes.');
          _loading = false;
        });
        return;
      }
      setState(() {
        _rows = MakeupRow.listFrom(r.data);
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Connection error. Please try again.';
        _loading = false;
      });
    }
  }

  static String _message(dynamic data, String fallback) => data is Map &&
          data['message'] is String &&
          '${data['message']}'.isNotEmpty
      ? data['message'] as String
      : fallback;

  void _snack(String text, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(text),
      backgroundColor: error ? AppColors.error : null,
    ));
  }

  /// Runs one action; on success reloads and shows [done], else the
  /// server's own message.
  Future<void> _run(MakeupRow r, Future<dynamic> Function() call, String done,
      String fallback) async {
    setState(() => _busy = r.id);
    try {
      final res = await call();
      final code = res.statusCode ?? 0;
      if (!mounted) return;
      if (code >= 200 && code < 300) {
        _snack(done);
        await _load();
      } else {
        _snack(_message(res.data, fallback), error: true);
      }
    } catch (_) {
      if (mounted) _snack('Connection error. Please try again.', error: true);
    }
    if (mounted) setState(() => _busy = null);
  }

  Future<void> _fixDate(MakeupRow r) async {
    final picked = await showModalBottomSheet<_Draft>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _ScheduleSheet(row: r),
    );
    if (picked == null || !mounted) return;
    await _run(
      r,
      () => sl<ApiClient>().scheduleMakeup(r.id, picked.dateIso,
          startTime: picked.startHhmm, endTime: picked.endHhmm),
      r.isScheduled
          ? 'Make-up moved. Families, the teacher and admins have been told.'
          : 'Make-up scheduled. Families, the teacher and admins have been told.',
      'Could not schedule the make-up class.',
    );
  }

  Future<void> _markDone(MakeupRow r) async {
    final ok = await _confirm(
      title: 'Mark as done?',
      body: 'Mark the make-up for "${r.batchName}" as done?\n\n'
          'It also closes by itself when attendance is marked for the make-up class.',
      action: 'Mark as done',
    );
    if (!ok || !mounted) return;
    await _run(r, () => sl<ApiClient>().closeMakeup(r.id),
        'Make-up marked as done.', 'Could not mark the make-up as done.');
  }

  Future<void> _undo(MakeupRow r) async {
    final ok = await _confirm(
      title: 'Undo cancel?',
      body: 'Undo the cancellation of "${r.batchName}" on '
          '${makeupDayLabel(r.cancelledDate)}?\n\n'
          'The class goes back to "not marked"'
          '${r.makeupId != null ? ' and the planned make-up is removed' : ''}. '
          'Nothing is sent to families.',
      action: 'Undo cancel',
      destructive: true,
    );
    if (!ok || !mounted) return;
    await _run(r, () => sl<ApiClient>().reinstateClass(r.id),
        'Cancellation undone.', 'Could not undo the cancellation.');
  }

  Future<bool> _confirm({
    required String title,
    required String body,
    required String action,
    bool destructive = false,
  }) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (d) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(d, false),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(d, true),
            style: destructive
                ? FilledButton.styleFrom(backgroundColor: AppColors.error)
                : null,
            child: Text(action),
          ),
        ],
      ),
    );
    return ok == true;
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Make-up classes'),
        bottom: _loading && rows != null
            ? const PreferredSize(
                preferredSize: Size.fromHeight(2),
                child: LinearProgressIndicator(minHeight: 2),
              )
            : null,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: [
            Center(
              child: SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(value: false, label: Text('Pending')),
                  ButtonSegment(value: true, label: Text('All history')),
                ],
                selected: {_all},
                showSelectedIcon: false,
                onSelectionChanged: (s) {
                  setState(() => _all = s.first);
                  _load();
                },
              ),
            ),
            const SizedBox(height: 12),
            if (rows == null && _loading)
              const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null && rows == null)
              _errorBox(_error!)
            else ...[
              _summary(rows ?? const []),
              const SizedBox(height: 12),
              for (final r in rows ?? const <MakeupRow>[])
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _card(r),
                ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _errorBox(String text) => DashPanel(
        border: AppColors.error.withValues(alpha: 0.3),
        child: Row(
          children: [
            const Icon(Icons.cloud_off_outlined, color: AppColors.error),
            const SizedBox(width: 10),
            Expanded(child: Text(text, style: AppTextStyles.bodySmall)),
            TextButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      );

  Widget _summary(List<MakeupRow> rows) {
    final open = rows.where((r) => !r.isDone).toList();
    final owed = open.where((r) => r.isOwed).length;
    final text = open.isEmpty
        ? (rows.isEmpty
            ? 'No make-up classes pending.'
            : 'No make-up classes pending. Recently done ones are listed below.')
        : '$owed owed (date not fixed) · ${open.length - owed} scheduled. '
            '${_isAdmin ? 'Fix or move the date any time — everyone is told.' : 'The academy fixes the date; you are told.'}';
    return Text(text,
        style:
            AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary));
  }

  Widget _card(MakeupRow r) {
    final (label, color) = makeupStateLabel(r.state);
    final busy = _busy == r.id;
    final meta = [
      if (r.courseName != null) r.courseName!,
      if (r.teacherName != null) r.teacherName!,
      '${r.students} ${r.students == 1 ? 'student' : 'students'}',
    ].join(' · ');
    return DashPanel(
      border: r.isOwed ? makeupOwedColor.withValues(alpha: 0.35) : null,
      padding: const EdgeInsets.fromLTRB(14, 12, 12, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(r.batchName,
                    style: AppTextStyles.labelLarge
                        .copyWith(fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 8),
              _StateChip(label, color),
            ],
          ),
          const SizedBox(height: 2),
          Text(meta,
              style: AppTextStyles.caption
                  .copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: 6),
          Text(
            'Cancelled ${makeupDayLabel(r.cancelledDate)}'
            '${r.cancelReason != null ? ' — ${r.cancelReason}' : ''}',
            style: AppTextStyles.bodySmall
                .copyWith(color: AppColors.textSecondary),
          ),
          if (r.makeupDate != null) ...[
            const SizedBox(height: 2),
            Text(
              'Make-up: ${r.when}',
              style: AppTextStyles.bodySmall.copyWith(
                color:
                    r.isDone ? AppColors.textSecondary : AppColors.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          if (r.isDone && r.closedByName != null) ...[
            const SizedBox(height: 2),
            Text('Closed by ${r.closedByName}',
                style: AppTextStyles.caption
                    .copyWith(color: AppColors.textSecondary)),
          ],
          // Only the admin sets up make-ups; a teacher can still mark one done.
          if (!r.isDone && (_isAdmin || r.isScheduled)) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                if (_isAdmin)
                  FilledButton.icon(
                    onPressed: busy ? null : () => _fixDate(r),
                    icon: busy
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.edit_calendar_outlined, size: 18),
                    label: Text(r.isScheduled ? 'Change date' : 'Fix date'),
                    style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        minimumSize: const Size(0, 38),
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        textStyle: const TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w600)),
                  ),
                if (r.isScheduled)
                  OutlinedButton.icon(
                    onPressed: busy ? null : () => _markDone(r),
                    icon: const Icon(Icons.task_alt_rounded, size: 18),
                    label: const Text('Mark as done'),
                    style: _outlined(),
                  ),
                if (_isAdmin)
                  OutlinedButton.icon(
                    onPressed: busy ? null : () => _undo(r),
                    icon: const Icon(Icons.undo_rounded, size: 18),
                    label: const Text('Undo cancel'),
                    style: _outlined(AppColors.error),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

ButtonStyle _outlined([Color? color]) => OutlinedButton.styleFrom(
      foregroundColor: color ?? AppColors.primary,
      backgroundColor: Colors.transparent,
      side: BorderSide(
          color: (color ?? AppColors.primary).withValues(alpha: 0.5)),
      minimumSize: const Size(0, 38),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
    );

class _StateChip extends StatelessWidget {
  final String label;
  final Color color;
  const _StateChip(this.label, this.color);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label,
            style: AppTextStyles.caption.copyWith(
                color: color, fontWeight: FontWeight.w700, fontSize: 11)),
      );
}

// ----------------------------------------------------------- schedule ----

class _Draft {
  final DateTime date;
  final TimeOfDay? start;
  final TimeOfDay? end;
  const _Draft(this.date, this.start, this.end);

  static String _two(int n) => n.toString().padLeft(2, '0');
  String get dateIso => '${date.year}-${_two(date.month)}-${_two(date.day)}';
  static String? _hhmm(TimeOfDay? t) =>
      t == null ? null : '${_two(t.hour)}:${_two(t.minute)}';
  String? get startHhmm => _hhmm(start);
  String? get endHhmm => _hhmm(end);
}

/// Date (no past days) and optional start/end times for a make-up.
class _ScheduleSheet extends StatefulWidget {
  final MakeupRow row;
  const _ScheduleSheet({required this.row});

  @override
  State<_ScheduleSheet> createState() => _ScheduleSheetState();
}

class _ScheduleSheetState extends State<_ScheduleSheet> {
  DateTime? _date;
  TimeOfDay? _start;
  TimeOfDay? _end;
  String? _error;

  static TimeOfDay? _parse(String? hhmm) {
    if (hhmm == null) return null;
    final p = hhmm.split(':');
    final h = int.tryParse(p[0]);
    final m = p.length > 1 ? int.tryParse(p[1]) : 0;
    return h == null || m == null ? null : TimeOfDay(hour: h, minute: m);
  }

  DateTime get _today {
    final n = DateTime.now();
    return DateTime(n.year, n.month, n.day);
  }

  @override
  void initState() {
    super.initState();
    final r = widget.row;
    final d = r.makeupDate == null ? null : DateTime.tryParse(r.makeupDate!);
    // A date already in the past can't be kept; make them pick again.
    _date = d != null && !d.isBefore(_today) ? d : null;
    _start = _parse(r.startTime);
    _end = _parse(r.endTime);
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? _today,
      firstDate: _today,
      lastDate: _today.add(const Duration(days: 365)),
      helpText: 'Make-up date',
    );
    if (picked != null) {
      setState(() {
        _date = picked;
        _error = null;
      });
    }
  }

  Future<void> _pickTime(bool start) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: (start ? _start : _end) ??
          (start
              ? const TimeOfDay(hour: 17, minute: 0)
              : (_start == null
                  ? const TimeOfDay(hour: 18, minute: 0)
                  : TimeOfDay(
                      hour: (_start!.hour + 1) % 24, minute: _start!.minute))),
      helpText: start ? 'Starts' : 'Ends',
    );
    if (picked == null) return;
    setState(() {
      if (start) {
        _start = picked;
      } else {
        _end = picked;
      }
      _error = null;
    });
  }

  void _save() {
    if (_date == null) {
      setState(() => _error = 'Pick the date of the make-up class.');
      return;
    }
    // One time alone could end up before (or after) the batch's usual other
    // time, so it is both or neither.
    if ((_start == null) != (_end == null)) {
      setState(() => _error =
          'Set both the start and end time, or leave both empty for the usual timing.');
      return;
    }
    if (_start != null && _end != null) {
      final a = _start!.hour * 60 + _start!.minute;
      final b = _end!.hour * 60 + _end!.minute;
      if (b <= a) {
        setState(() => _error = 'The end time must be after the start time.');
        return;
      }
    }
    Navigator.pop(context, _Draft(_date!, _start, _end));
  }

  String _fmt(TimeOfDay t) =>
      makeupClock('${t.hour}:${t.minute.toString().padLeft(2, '0')}');

  @override
  Widget build(BuildContext context) {
    final r = widget.row;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
            20, 0, 20, 16 + MediaQuery.of(context).viewInsets.bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(r.isScheduled ? 'Change make-up date' : 'Fix make-up date',
                style: AppTextStyles.h4),
            const SizedBox(height: 2),
            Text(
              '${r.batchName} · cancelled ${makeupDayLabel(r.cancelledDate)}',
              style: AppTextStyles.caption
                  .copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 14),
            _field(
              icon: Icons.event_outlined,
              label: 'Date',
              value: _date == null
                  ? 'Choose a date'
                  : makeupDayLabel(_Draft(_date!, null, null).dateIso),
              onTap: _pickDate,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _field(
                    icon: Icons.schedule_outlined,
                    label: 'Starts',
                    value: _start == null ? 'Usual time' : _fmt(_start!),
                    onTap: () => _pickTime(true),
                    onClear: _start == null
                        ? null
                        : () => setState(() => _start = null),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _field(
                    icon: Icons.schedule_outlined,
                    label: 'Ends',
                    value: _end == null ? 'Usual time' : _fmt(_end!),
                    onTap: () => _pickTime(false),
                    onClear:
                        _end == null ? null : () => setState(() => _end = null),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text("Leave both times empty to keep the batch's usual timing.",
                style: AppTextStyles.caption
                    .copyWith(color: AppColors.textSecondary)),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!,
                  style:
                      AppTextStyles.bodySmall.copyWith(color: AppColors.error)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _save,
              style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(46),
                  backgroundColor: AppColors.primary),
              child: Text(r.isScheduled ? 'Move make-up' : 'Schedule make-up'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field({
    required IconData icon,
    required String label,
    required String value,
    required VoidCallback onTap,
    VoidCallback? onClear,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, size: 20),
          suffixIcon: onClear == null
              ? null
              : IconButton(
                  tooltip: 'Clear',
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: onClear),
          isDense: true,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: Text(value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppTextStyles.bodyMedium),
      ),
    );
  }
}
