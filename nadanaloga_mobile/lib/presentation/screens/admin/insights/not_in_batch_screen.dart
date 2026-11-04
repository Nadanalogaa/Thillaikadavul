import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/batch_model.dart';
import '../../../../data/models/grade_model.dart';
import '../../../../di/injection_container.dart';
import '../../../widgets/batch_views.dart';
import '../../../widgets/confirm_dialog.dart';
import 'insights_data.dart';

/// Students enrolled in a course but in no batch of it, grouped by course,
/// each with an "Add to batch" action. Students with no course at all are
/// listed last, without the action.
class NotInBatchScreen extends StatefulWidget {
  const NotInBatchScreen({super.key});

  @override
  State<NotInBatchScreen> createState() => _NotInBatchScreenState();
}

class _NotInBatchScreenState extends State<NotInBatchScreen> {
  final _api = sl<ApiClient>();
  final _search = TextEditingController();
  NotInBatchInsights? _data;
  String? _error;
  bool _loading = true;
  bool _busy = false;

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

  Future<void> _load({bool quiet = false}) async {
    if (!quiet) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final d = await AdminInsights.load();
      if (!mounted) return;
      setState(() {
        _data = d.notInBatch;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  void _snack(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: error ? AppColors.error : null,
    ));
  }

  static String _messageOf(Response r, String fallback) {
    final d = r.data;
    if (d is Map && d['message'] is String && (d['message'] as String).isNotEmpty) {
      return d['message'] as String;
    }
    return fallback;
  }

  static bool _ok(Response r) {
    final c = r.statusCode ?? 0;
    return c >= 200 && c < 300;
  }

  /// Same steps as the batch screen's "Add students": load the batch, save
  /// its student_ids with this student added, then set the course grade if
  /// one was picked.
  Future<void> _addToBatch(NotInBatchRow row) async {
    final courseId = row.courseId;
    if (courseId == null || row.batches.isEmpty) return;
    final pick = await showModalBottomSheet<_BatchPick>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _BatchPickerSheet(row: row),
    );
    if (pick == null || !mounted) return;

    setState(() => _busy = true);
    try {
      final r = await _api.getBatchDetails(pick.batchId);
      if (!_ok(r) || r.data is! Map) {
        _snack(_messageOf(r, 'Could not load that batch.'), error: true);
        return;
      }
      final batch =
          BatchModel.fromJson(Map<String, dynamic>.from(r.data as Map));
      if (batch.studentIds.contains(row.studentId)) {
        _snack('${row.name} is already in ${batch.batchName}.');
        await _load(quiet: true);
        return;
      }
      final newIds = <int>{...batch.studentIds, row.studentId}.toList();
      final max = batch.maxStudents;
      if (max != null && max > 0 && newIds.length > max) {
        if (!mounted) return;
        final go = await ConfirmDialog.show(
          context,
          title: 'Over the limit',
          message:
              '${batch.batchName} allows $max students; this makes ${newIds.length}. Add anyway?',
          confirmLabel: 'Add anyway',
        );
        if (go != true || !mounted) return;
      }
      final u = await _api.updateBatch(batch.id, {'student_ids': newIds});
      if (!_ok(u)) {
        _snack(_messageOf(u, 'Could not add ${row.name}.'), error: true);
        return;
      }
      final gradeId = pick.gradeId;
      if (gradeId != null) {
        try {
          await _api.assignStudentGrade(row.studentId, courseId, gradeId);
        } catch (_) {}
      }
      _snack('Added ${row.name} to ${batch.batchName}.');
      await _load(quiet: true);
    } catch (_) {
      _snack('Could not add ${row.name}. Check the connection.', error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Not in a batch'),
        bottom: _busy || (_loading && _data != null)
            ? const PreferredSize(
                preferredSize: Size.fromHeight(2),
                child: LinearProgressIndicator(minHeight: 2),
              )
            : null,
      ),
      body: _body(),
    );
  }

  Widget _body() {
    final d = _data;
    if (d == null) {
      if (_loading) return const Center(child: CircularProgressIndicator());
      return InsightError(message: _error ?? 'Could not load.', onRetry: _load);
    }
    final rows = d.students
        .where((r) => insightMatches(_search.text,
            [r.name, r.parentName, r.phone, r.courseName, r.gradeName, r.userId]))
        .toList();

    // Group by course; students without a course go last.
    final groups = <String, List<NotInBatchRow>>{};
    for (final r in rows) {
      groups.putIfAbsent(r.courseName ?? '', () => []).add(r);
    }
    final keys = groups.keys.toList()
      ..sort((a, b) {
        if (a.isEmpty) return 1;
        if (b.isEmpty) return -1;
        return a.toLowerCase().compareTo(b.toLowerCase());
      });

    return RefreshIndicator(
      onRefresh: () => _load(quiet: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          InsightSearchField(
            controller: _search,
            hint: 'Search name, parent, phone or course',
            onChanged: (_) => setState(() {}),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              d.studentsCount == 0
                  ? 'Every student is in a batch.'
                  : '${d.studentsCount} ${d.studentsCount == 1 ? 'student' : 'students'} not in a batch for their course',
              style: AppTextStyles.caption,
            ),
          ),
          if (rows.isEmpty && d.students.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 32),
              child: Center(
                child: Text('No students match.',
                    style: AppTextStyles.bodyMedium
                        .copyWith(color: AppColors.textSecondary)),
              ),
            ),
          for (final k in keys) ...[
            Padding(
              padding: const EdgeInsets.only(top: 8, bottom: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Text(k.isEmpty ? 'No course yet' : k,
                        style: AppTextStyles.h4,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ),
                  Text('${groups[k]!.length}', style: AppTextStyles.caption),
                ],
              ),
            ),
            for (final r in groups[k]!) _row(r),
          ],
        ],
      ),
    );
  }

  Widget _row(NotInBatchRow r) {
    final canAdd = r.courseId != null && r.batches.isNotEmpty;
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
                      if (r.parentName != null)
                        Text('Parent: ${r.parentName}',
                            style: AppTextStyles.caption,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                if (r.courseId == null)
                  const InsightChip('No course yet',
                      color: AppColors.textSecondary)
                else if (r.gradeName != null)
                  InsightChip(r.gradeName!, color: AppColors.primary)
                else
                  const InsightChip('No grade', color: AppColors.warning),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: PhoneLink(r.phone),
                  ),
                ),
                const SizedBox(width: 8),
                if (canAdd)
                  FilledButton.tonalIcon(
                    onPressed: _busy ? null : () => _addToBatch(r),
                    icon: const Icon(Icons.group_add, size: 18),
                    label: const Text('Add to batch'),
                    style: FilledButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                  )
                else if (r.courseId != null)
                  const Text('No batches for this course',
                      style: AppTextStyles.caption),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _BatchPick {
  final int batchId;
  final int? gradeId;
  const _BatchPick(this.batchId, this.gradeId);
}

/// Pick one of the course's batches (with teacher, times and size when the
/// batch list loads) and, if the student has no grade yet, optionally one.
class _BatchPickerSheet extends StatefulWidget {
  final NotInBatchRow row;
  const _BatchPickerSheet({required this.row});

  @override
  State<_BatchPickerSheet> createState() => _BatchPickerSheetState();
}

class _BatchPickerSheetState extends State<_BatchPickerSheet> {
  final _api = sl<ApiClient>();
  Map<int, BatchModel> _info = const {};
  List<GradeModel> _grades = const [];
  int? _batchId;
  int? _gradeId;

  bool get _needsGrade => widget.row.gradeName == null;

  @override
  void initState() {
    super.initState();
    if (widget.row.batches.length == 1) _batchId = widget.row.batches.first.id;
    _loadInfo();
    if (_needsGrade) _loadGrades();
  }

  Future<void> _loadInfo() async {
    try {
      final r = await _api.getBatches();
      if (r.statusCode == 200 && r.data is List && mounted) {
        final m = <int, BatchModel>{};
        for (final j in (r.data as List).whereType<Map<String, dynamic>>()) {
          final b = BatchModel.fromJson(j);
          m[b.id] = b;
        }
        setState(() => _info = m);
      }
    } catch (_) {
      // Names alone are enough to pick.
    }
  }

  Future<void> _loadGrades() async {
    try {
      final r = await _api.getGrades(courseId: widget.row.courseId);
      if (r.statusCode == 200 && r.data is List && mounted) {
        setState(() {
          _grades = (r.data as List)
              .whereType<Map<String, dynamic>>()
              .map(GradeModel.fromJson)
              .where((g) => g.isActive)
              .toList();
        });
      }
    } catch (_) {}
  }

  String? _details(int id) {
    final b = _info[id];
    if (b == null) return null;
    final count = batchStudentCount(b);
    final parts = <String>[
      batchTeacherLabel(b),
      if (b.formattedSlots.isNotEmpty) b.formattedSlots,
      b.maxStudents != null && b.maxStudents! > 0
          ? '$count/${b.maxStudents} students'
          : '$count ${count == 1 ? 'student' : 'students'}',
    ];
    return parts.where((p) => p.trim().isNotEmpty).join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    final row = widget.row;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
              child: Text('Add ${row.name} to a batch',
                  style: AppTextStyles.h4,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                [row.courseName ?? '', if (row.gradeName != null) row.gradeName!]
                    .where((s) => s.isNotEmpty)
                    .join(' · '),
                style: AppTextStyles.caption,
              ),
            ),
            const SizedBox(height: 8),
            Flexible(
              child: RadioGroup<int>(
                groupValue: _batchId,
                onChanged: (v) => setState(() => _batchId = v),
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    for (final b in row.batches)
                      RadioListTile<int>(
                        value: b.id,
                        title: Text(b.name,
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                        subtitle: _details(b.id) == null
                            ? null
                            : Text(_details(b.id)!,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: AppTextStyles.caption),
                        dense: true,
                      ),
                  ],
                ),
              ),
            ),
            if (_needsGrade && _grades.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                child: DropdownButtonFormField<int>(
                  initialValue: _gradeId,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Assign grade (optional)',
                    prefixIcon: Icon(Icons.grade, size: 18),
                    isDense: true,
                  ),
                  items: [
                    for (final g in _grades)
                      DropdownMenuItem(
                        value: g.id,
                        child: Text(g.name, overflow: TextOverflow.ellipsis),
                      ),
                  ],
                  onChanged: (v) => setState(() => _gradeId = v),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              child: FilledButton.icon(
                onPressed: _batchId == null
                    ? null
                    : () => Navigator.of(context)
                        .pop(_BatchPick(_batchId!, _gradeId)),
                icon: const Icon(Icons.check),
                label: const Text('Add to batch'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
