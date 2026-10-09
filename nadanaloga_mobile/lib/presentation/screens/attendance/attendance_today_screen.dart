import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/date_display.dart';
import '../../../di/injection_container.dart';
import 'mark_attendance_screen.dart';

/// A teacher's classes for a day, with whether each one is marked yet.
class AttendanceTodayScreen extends StatefulWidget {
  const AttendanceTodayScreen({super.key});

  @override
  State<AttendanceTodayScreen> createState() => _AttendanceTodayScreenState();
}

class _AttendanceTodayScreenState extends State<AttendanceTodayScreen> {
  DateTime _date = DateTime.now();
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _classes = [];

  String get _dateIso =>
      '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final r = await sl<ApiClient>().getMyClasses(_dateIso);
      final code = r.statusCode ?? 0;
      if (code < 200 || code >= 300) {
        setState(() {
          _error = r.data is Map && r.data['message'] is String
              ? r.data['message'] as String
              : 'Could not load your classes.';
          _loading = false;
        });
        return;
      }
      setState(() {
        _classes = ((r.data as List?) ?? []).cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (_) {
      setState(() { _error = 'Connection error. Please try again.'; _loading = false; });
    }
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: now.subtract(const Duration(days: 60)),
      lastDate: now.add(const Duration(days: 30)),
    );
    if (picked != null && mounted) {
      setState(() => _date = picked);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance'),
        actions: [
          IconButton(
            tooltip: 'Pick a date',
            icon: const Icon(Icons.calendar_today_outlined),
            onPressed: _pickDate,
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
            color: AppColors.primary.withValues(alpha: 0.06),
            child: Row(
              children: [
                Expanded(
                  child: Text(formatDisplayDate(_dateIso), style: AppTextStyles.labelLarge),
                ),
                TextButton(
                  onPressed: () {
                    setState(() => _date = DateTime.now());
                    _load();
                  },
                  child: const Text('Today'),
                ),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? _centered(_error!, onRetry: _load)
                    : _classes.isEmpty
                        ? _centered('No classes on this day.')
                        : RefreshIndicator(
                            onRefresh: _load,
                            child: ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: _classes.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 10),
                              itemBuilder: (context, i) => _classCard(_classes[i]),
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _classCard(Map<String, dynamic> c) {
    final status = '${c['status'] ?? 'not_marked'}';
    final (label, color) = switch (status) {
      'held' => ('Marked', AppColors.success),
      'cancelled' => ('Cancelled', AppColors.error),
      'makeup' => ('Make-up class', AppColors.primary),
      _ => ('Not marked', Colors.orange),
    };
    final timing = [
      formatDisplayTime('${c['start_time'] ?? ''}'),
      formatDisplayTime('${c['end_time'] ?? ''}'),
    ].where((s) => s.isNotEmpty).join(' – ');

    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        contentPadding: const EdgeInsets.fromLTRB(16, 8, 12, 8),
        title: Text('${c['batch_name'] ?? 'Batch'}', style: AppTextStyles.labelLarge),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 2),
            Text(
              [
                if (timing.isNotEmpty) timing,
                '${c['student_count'] ?? 0} students',
                if (c['mode'] != null) '${c['mode']}',
              ].join(' · '),
              style: AppTextStyles.caption,
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(label,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
            ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () async {
          final changed = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => MarkAttendanceScreen(
                batchId: int.tryParse('${c['batch_id']}') ?? 0,
                batchName: '${c['batch_name'] ?? 'Batch'}',
                date: _dateIso,
              ),
            ),
          );
          if (changed == true) _load();
        },
      ),
    );
  }

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
