import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/batch_model.dart';
import '../../../di/injection_container.dart';

/// A teacher's teaching at a glance: the batches she takes, their timings and
/// how many students are in each. Pushed from the household home when the
/// teacher member is selected, so Back returns to the family view.
class TeachingSummaryScreen extends StatelessWidget {
  final int teacherId;
  final String teacherName;

  const TeachingSummaryScreen({
    super.key,
    required this.teacherId,
    required this.teacherName,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('$teacherName · Teaching'),
        backgroundColor: AppColors.teacherAccent,
      ),
      body: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: TeachingSummaryBody(teacherId: teacherId),
      ),
    );
  }
}

/// Non-scrolling body (a Column) so it can also be embedded in the teacher
/// dashboard, which has its own scroll view.
class TeachingSummaryBody extends StatefulWidget {
  final int teacherId;

  const TeachingSummaryBody({super.key, required this.teacherId});

  @override
  State<TeachingSummaryBody> createState() => _TeachingSummaryBodyState();
}

class _TeachingSummaryBodyState extends State<TeachingSummaryBody> {
  List<BatchModel> _batches = [];
  bool _loading = true;
  String? _error;

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
      final r = await sl<ApiClient>().getBatches();
      if (!mounted) return;
      if (r.statusCode == 200 && r.data is List) {
        final all = (r.data as List)
            .whereType<Map>()
            .map((b) => BatchModel.fromJson(Map<String, dynamic>.from(b)))
            .toList();
        setState(() {
          _batches =
              all.where((b) => b.teacherId == widget.teacherId).toList();
        });
      } else {
        setState(() => _error = 'Could not load batches.');
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load batches.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Human-readable timings, preferring per-day slots, then schedule strings,
  /// then the batch-level days + time range.
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
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.all(24),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null) {
      return Column(
        children: [
          Text(_error!, style: AppTextStyles.bodyMedium),
          TextButton(onPressed: _load, child: const Text('Retry')),
        ],
      );
    }
    final totalStudents =
        _batches.expand((b) => b.allStudentIds).toSet().length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _chip(Icons.group_work_outlined,
                '${_batches.length} ${_batches.length == 1 ? 'batch' : 'batches'}'),
            _chip(Icons.people_outline,
                '$totalStudents ${totalStudents == 1 ? 'student' : 'students'}'),
          ],
        ),
        const SizedBox(height: 14),
        if (_batches.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 28),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: AppColors.textSecondary.withValues(alpha: 0.3)),
            ),
            child: Text(
              'No batches assigned yet.',
              textAlign: TextAlign.center,
              style: AppTextStyles.bodyMedium
                  .copyWith(color: AppColors.textSecondary),
            ),
          )
        else
          for (final b in _batches) _batchCard(b),
      ],
    );
  }

  Widget _chip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: AppColors.teacherAccent.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppColors.teacherAccent),
          const SizedBox(width: 6),
          Text(label,
              style: AppTextStyles.labelLarge
                  .copyWith(color: AppColors.teacherAccent)),
        ],
      ),
    );
  }

  Widget _batchCard(BatchModel b) {
    final count = b.allStudentIds.length;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
            color: AppColors.teacherAccent.withValues(alpha: 0.15)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(b.batchName, style: AppTextStyles.labelLarge),
                      if (b.mode != null && b.mode!.isNotEmpty)
                        Text(b.mode!,
                            style: AppTextStyles.caption
                                .copyWith(color: AppColors.textSecondary)),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.teacherAccent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '$count ${count == 1 ? 'student' : 'students'}',
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.teacherAccent),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            for (final t in _timings(b))
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    const Icon(Icons.schedule,
                        size: 16, color: AppColors.textSecondary),
                    const SizedBox(width: 6),
                    Expanded(child: Text(t, style: AppTextStyles.bodyMedium)),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
