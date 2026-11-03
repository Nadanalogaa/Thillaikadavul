import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/batch_model.dart';
import '../../../../di/injection_container.dart';
import '../../../widgets/batch_views.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/user_avatar.dart';
import 'student_picker_sheet.dart';
import 'transfer_student_sheet.dart';

/// One batch: teacher, class times and size up top, then its students, each
/// of whom can be moved to another batch of the same course or removed.
class BatchDetailScreen extends StatefulWidget {
  final int batchId;
  const BatchDetailScreen({super.key, required this.batchId});

  @override
  State<BatchDetailScreen> createState() => _BatchDetailScreenState();
}

class _BatchDetailScreenState extends State<BatchDetailScreen> {
  final _api = sl<ApiClient>();

  BatchModel? _batch;
  List<Map<String, dynamic>> _students = const [];

  /// Every batch (for the Move sheet and the picker); may be empty if that
  /// request failed.
  List<BatchModel> _allBatches = const [];

  bool _loading = true;
  String? _error;

  /// A change is being saved; actions are disabled meanwhile.
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
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

  Future<void> _load({bool quiet = false}) async {
    if (!quiet) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final results = await Future.wait([
        _api.getBatchDetails(widget.batchId),
        _api.getBatches().catchError((Object _) => Response(
            requestOptions: RequestOptions(path: ''), statusCode: 0)),
      ]);
      if (!mounted) return;
      final details = results[0];
      if (!_ok(details) || details.data is! Map) {
        setState(() {
          _error = _messageOf(details, 'Could not load this batch.');
          _loading = false;
        });
        return;
      }
      final d = Map<String, dynamic>.from(details.data as Map);
      final batches = results[1];
      setState(() {
        _batch = BatchModel.fromJson(d);
        _students = ((d['students'] as List?) ?? const [])
            .whereType<Map>()
            .map((s) => Map<String, dynamic>.from(s))
            .toList();
        _allBatches = (_ok(batches) && batches.data is List)
            ? (batches.data as List)
                .whereType<Map<String, dynamic>>()
                .map(BatchModel.fromJson)
                .toList()
            : _allBatches;
        _error = null;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load this batch. Check the connection.';
        _loading = false;
      });
    }
  }

  /// Other batches of the same course, as the batch list knows them.
  List<BatchModel> get _siblings {
    final b = _batch;
    if (b == null) return const [];
    return _allBatches
        .where((x) => x.id != b.id && x.courseId == b.courseId)
        .toList();
  }

  void _snack(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: error ? AppColors.error : null,
    ));
  }

  /// Runs one change against the server, then reloads.
  Future<bool> _save(Future<Response> Function() call, String done,
      String failed) async {
    setState(() => _busy = true);
    var ok = false;
    try {
      final r = await call();
      ok = _ok(r);
      _snack(ok ? done : _messageOf(r, failed), error: !ok);
    } catch (_) {
      _snack('$failed Check the connection.', error: true);
    }
    if (ok) await _load(quiet: true);
    if (mounted) setState(() => _busy = false);
    return ok;
  }

  int? _idOf(Map<String, dynamic> s) {
    final v = s['id'];
    return v is int ? v : int.tryParse('$v');
  }

  Future<void> _move(Map<String, dynamic> s) async {
    final batch = _batch;
    final id = _idOf(s);
    if (batch == null || id == null) return;
    final name = (s['name'] ?? 'Student').toString();
    final to = await TransferStudentSheet.show(
      context,
      studentName: name,
      fromBatch: batch,
      candidates: _siblings,
    );
    if (to == null || !mounted) return;
    final confirmed = await ConfirmDialog.show(
      context,
      title: 'Move student',
      message: 'Move $name from ${batch.batchName} to ${to.batchName}?',
      confirmLabel: 'Move',
    );
    if (confirmed != true || !mounted) return;
    await _save(
      () => _api.transferStudent(
          studentId: id, fromBatchId: batch.id, toBatchId: to.id),
      'Moved $name to ${to.batchName}.',
      'Could not move $name.',
    );
  }

  Future<void> _remove(Map<String, dynamic> s) async {
    final batch = _batch;
    final id = _idOf(s);
    if (batch == null || id == null) return;
    final name = (s['name'] ?? 'Student').toString();
    final confirmed = await ConfirmDialog.show(
      context,
      title: 'Remove student',
      message: 'Remove $name from ${batch.batchName}?',
      confirmLabel: 'Remove',
      confirmColor: AppColors.error,
    );
    if (confirmed != true || !mounted) return;
    final ids = batch.studentIds.where((x) => x != id).toSet().toList();
    await _save(
      () => _api.updateBatch(batch.id, {'student_ids': ids}),
      'Removed $name from ${batch.batchName}.',
      'Could not remove $name.',
    );
  }

  Future<void> _addStudents() async {
    final batch = _batch;
    if (batch == null) return;
    final otherBatchOf = <int, String>{};
    for (final b in _siblings) {
      for (final id in b.studentIds) {
        otherBatchOf.putIfAbsent(id, () => b.batchName);
      }
    }
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => StudentPickerSheet(
        currentIds: batch.studentIds,
        batchCourseId: batch.courseId,
        batchCourseName: batch.courseName,
        otherBatchOf: otherBatchOf,
      ),
    );
    if (result == null || !mounted) return;
    final picked = List<int>.from(result['ids'] ?? const []);
    final gradeByStudent = Map<int, int>.from(result['grades'] ?? const {});
    if (picked.isEmpty) return;

    final newIds = <int>{...batch.studentIds, ...picked}.toList();
    final max = batch.maxStudents;
    if (max != null && max > 0 && newIds.length > max) {
      final go = await ConfirmDialog.show(
        context,
        title: 'Over the limit',
        message:
            '${batch.batchName} allows $max students; this makes ${newIds.length}. Add anyway?',
        confirmLabel: 'Add anyway',
      );
      if (go != true || !mounted) return;
    }

    final n = picked.length;
    final ok = await _save(
      () => _api.updateBatch(batch.id, {'student_ids': newIds}),
      'Added $n ${n == 1 ? 'student' : 'students'} to ${batch.batchName}.',
      'Could not add the students.',
    );

    // Assign the batch course's grade for any student the admin picked one for.
    final courseId = batch.courseId;
    if (ok && courseId != null && gradeByStudent.isNotEmpty) {
      for (final entry in gradeByStudent.entries) {
        try {
          await _api.assignStudentGrade(entry.key, courseId, entry.value);
        } catch (_) {}
      }
      if (mounted) await _load(quiet: true);
    }
  }

  Future<void> _edit() async {
    final saved =
        await context.push<bool>('/admin/batches/${widget.batchId}/edit');
    if (saved == true && mounted) _load(quiet: true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_batch?.batchName ?? 'Batch'),
        actions: [
          if (_batch != null)
            IconButton(
              tooltip: 'Edit batch',
              icon: const Icon(Icons.edit_outlined),
              onPressed: _busy ? null : _edit,
            ),
        ],
        bottom: _busy
            ? const PreferredSize(
                preferredSize: Size.fromHeight(2),
                child: LinearProgressIndicator(minHeight: 2),
              )
            : null,
      ),
      floatingActionButton: _batch == null
          ? null
          : FloatingActionButton.extended(
              onPressed: _busy ? null : _addStudents,
              icon: const Icon(Icons.person_add_alt_1),
              label: const Text('Add students'),
            ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null || _batch == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_outlined,
                  size: 48, color: AppColors.textSecondary),
              const SizedBox(height: 12),
              Text(_error ?? 'Batch not found',
                  textAlign: TextAlign.center, style: AppTextStyles.bodyMedium),
              const SizedBox(height: 8),
              FilledButton(onPressed: _load, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }
    final b = _batch!;
    return RefreshIndicator(
      onRefresh: () => _load(quiet: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
        children: [
          _header(b),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: Text('Students (${_students.length})',
                    style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700)),
              ),
              TextButton.icon(
                onPressed: _busy ? null : _addStudents,
                icon: const Icon(Icons.person_add_alt_1, size: 18),
                label: const Text('Add'),
              ),
            ],
          ),
          const SizedBox(height: 6),
          if (_students.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.divider),
              ),
              child: Column(
                children: [
                  const Icon(Icons.people_outline,
                      size: 40, color: AppColors.textSecondary),
                  const SizedBox(height: 8),
                  Text('No students in this batch yet.',
                      style: AppTextStyles.bodyMedium
                          .copyWith(color: AppColors.textSecondary)),
                ],
              ),
            )
          else
            for (final s in _students) _studentCard(s),
        ],
      ),
    );
  }

  Widget _header(BatchModel b) {
    final place = [
      if ((b.studio ?? '').isNotEmpty) b.studio!,
      if ((b.locationName ?? '').isNotEmpty) b.locationName!,
    ].join(' · ');
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.divider),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(b.batchName,
                style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                if ((b.courseName ?? '').isNotEmpty)
                  BatchPill(
                      label: b.courseName!,
                      color: BatchPalette.course,
                      icon: Icons.menu_book_rounded),
                if ((b.mode ?? '').isNotEmpty)
                  BatchPill(label: b.mode!, color: BatchPalette.mode(b.mode)),
                if (place.isNotEmpty)
                  BatchPill(
                      label: place,
                      color: AppColors.textSecondary,
                      icon: Icons.place_outlined),
              ],
            ),
            const SizedBox(height: 12),
            BatchHighlights(batch: b, large: true, maxTimingLines: null),
          ],
        ),
      ),
    );
  }

  Widget _studentCard(Map<String, dynamic> s) {
    final name = (s['name'] ?? '').toString();
    final userId = (s['user_id'] ?? '').toString();
    final parent = (s['parent_name'] ?? '').toString();
    final phone = (s['contact_number'] ?? '').toString();
    final grade = (s['grade'] ?? '').toString();

    Widget line(IconData icon, String text, {VoidCallback? onTap}) {
      final row = Row(
        children: [
          Icon(icon, size: 14, color: AppColors.textSecondary),
          const SizedBox(width: 4),
          Flexible(
            child: Text(text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.caption.copyWith(
                  color: onTap != null ? AppColors.info : null,
                )),
          ),
        ],
      );
      return Padding(
        padding: const EdgeInsets.only(top: 2),
        child: onTap == null ? row : InkWell(onTap: onTap, child: row),
      );
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.divider),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 8, 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                UserAvatar(
                  photoUrl: s['photo_url'] as String?,
                  name: name,
                  radius: 22,
                  color: AppColors.studentAccent,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTextStyles.labelLarge
                                    .copyWith(fontWeight: FontWeight.w700)),
                          ),
                          if (grade.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            BatchPill(label: grade, color: AppColors.info),
                          ],
                        ],
                      ),
                      if (userId.isNotEmpty) line(Icons.badge_outlined, userId),
                      if (parent.isNotEmpty)
                        line(Icons.family_restroom, 'Parent: $parent'),
                      if (phone.isNotEmpty)
                        line(Icons.phone_outlined, phone,
                            onTap: () => launchUrl(Uri(scheme: 'tel', path: phone))),
                    ],
                  ),
                ),
              ],
            ),
            Align(
              alignment: Alignment.centerRight,
              child: Wrap(
                spacing: 4,
                children: [
                  TextButton.icon(
                    onPressed: _busy ? null : () => _move(s),
                    icon: const Icon(Icons.swap_horiz_rounded, size: 18),
                    label: const Text('Move'),
                  ),
                  TextButton.icon(
                    onPressed: _busy ? null : () => _remove(s),
                    style: TextButton.styleFrom(foregroundColor: AppColors.error),
                    icon: const Icon(Icons.person_remove_outlined, size: 18),
                    label: const Text('Remove'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
