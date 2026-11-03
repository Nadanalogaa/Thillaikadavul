import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/grade_model.dart';
import '../../../../data/models/user_model.dart';
import '../../../../di/injection_container.dart';
import '../../../widgets/user_avatar.dart';

/// Choose students to add to a batch.
///
/// By default lists the students of the batch's course who are not in any
/// batch of that course yet; a switch shows every student of the course
/// (those already in another batch are marked — moving is usually better).
/// Pops with `{'ids': List<int>, 'grades': Map<int, int>}`.
class StudentPickerSheet extends StatefulWidget {
  /// Students already in this batch (never listed).
  final List<int> currentIds;
  final int? batchCourseId; // when set, offer a grade dropdown for this course
  final String? batchCourseName;

  /// Students in OTHER batches of the same course → that batch's name.
  final Map<int, String> otherBatchOf;

  const StudentPickerSheet({
    super.key,
    this.currentIds = const [],
    this.batchCourseId,
    this.batchCourseName,
    this.otherBatchOf = const {},
  });

  @override
  State<StudentPickerSheet> createState() => _StudentPickerSheetState();
}

class _StudentPickerSheetState extends State<StudentPickerSheet> {
  List<UserModel> _students = [];
  final Set<int> _selected = {};
  final Map<int, int> _gradeByStudent = {}; // studentId -> gradeId
  List<GradeModel> _grades = [];
  bool _loading = true;
  String? _error;
  bool _showAll = false;
  String _query = '';
  final _searchController = TextEditingController();

  bool get _hasCourse => (widget.batchCourseName ?? '').trim().isNotEmpty;

  @override
  void initState() {
    super.initState();
    _loadStudents();
    _loadGrades();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadGrades() async {
    if (widget.batchCourseId == null) return;
    try {
      final r = await sl<ApiClient>().getGrades(courseId: widget.batchCourseId);
      if (r.statusCode == 200 && r.data is List) {
        _grades = (r.data as List)
            .map((j) => GradeModel.fromJson(j))
            .where((g) => g.courseId == widget.batchCourseId)
            .toList();
        if (mounted) setState(() {});
      }
    } catch (_) {}
  }

  Future<void> _loadStudents() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await sl<ApiClient>().getUsers(role: 'Student');
      if (r.statusCode == 200 && r.data is List) {
        final current = widget.currentIds.toSet();
        _students = (r.data as List)
            .whereType<Map<String, dynamic>>()
            .map(UserModel.fromJson)
            .where((s) => !current.contains(s.id))
            .toList()
          ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
      } else {
        _error = 'Could not load students.';
      }
    } catch (_) {
      _error = 'Could not load students. Check the connection.';
    }
    if (mounted) setState(() => _loading = false);
  }

  bool _inCourse(UserModel s) {
    if (!_hasCourse) return true;
    final c = widget.batchCourseName!.trim().toLowerCase();
    return s.courses.any((x) => x.trim().toLowerCase() == c) ||
        s.courseGrades.any((g) => (g.courseName ?? '').trim().toLowerCase() == c);
  }

  String? _gradeIn(UserModel s) {
    if (!_hasCourse) return null;
    final c = widget.batchCourseName!.trim().toLowerCase();
    for (final g in s.courseGrades) {
      if ((g.courseName ?? '').trim().toLowerCase() == c) return g.gradeName;
    }
    return null;
  }

  List<UserModel> get _visible {
    final q = _query.trim().toLowerCase();
    return _students.where((s) {
      if (!_inCourse(s)) return false;
      if (!_showAll && widget.otherBatchOf.containsKey(s.id)) return false;
      if (q.isEmpty) return true;
      return s.name.toLowerCase().contains(q) ||
          (s.userId ?? '').toLowerCase().contains(q) ||
          (s.fatherName ?? '').toLowerCase().contains(q) ||
          (s.contactNumber ?? '').contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final courseStudents = _students.where(_inCourse).toList();
    final unbatched =
        courseStudents.where((s) => !widget.otherBatchOf.containsKey(s.id)).length;
    final visible = _visible;
    final courseLabel = _hasCourse ? widget.batchCourseName!.trim() : 'any course';

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 8, 4),
              child: Row(
                children: [
                  const Expanded(child: Text('Add students', style: AppTextStyles.h3)),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search name, ID, parent or phone',
                  prefixIcon: const Icon(Icons.search),
                  isDense: true,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onChanged: (v) => setState(() => _query = v),
              ),
            ),
            if (_hasCourse)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    ChoiceChip(
                      label: Text('Not in a batch ($unbatched)'),
                      selected: !_showAll,
                      onSelected: (_) => setState(() => _showAll = false),
                    ),
                    ChoiceChip(
                      label: Text('All $courseLabel (${courseStudents.length})'),
                      selected: _showAll,
                      onSelected: (_) => setState(() => _showAll = true),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 6),
            const Divider(height: 1),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(_error!, style: AppTextStyles.bodyMedium),
                              TextButton(
                                  onPressed: _loadStudents,
                                  child: const Text('Retry')),
                            ],
                          ),
                        )
                      : visible.isEmpty
                          ? Center(
                              child: Padding(
                                padding: const EdgeInsets.all(24),
                                child: Text(
                                  _query.isNotEmpty
                                      ? 'No student matches "$_query".'
                                      : _showAll || !_hasCourse
                                          ? 'No other $courseLabel students.'
                                          : 'Every $courseLabel student is already in a batch.\nTap "All $courseLabel" to see them.',
                                  textAlign: TextAlign.center,
                                  style: AppTextStyles.bodyMedium
                                      .copyWith(color: AppColors.textSecondary),
                                ),
                              ),
                            )
                          : ListView.builder(
                              controller: scrollController,
                              padding: const EdgeInsets.only(bottom: 16),
                              itemCount: visible.length,
                              itemBuilder: (context, i) =>
                                  _studentRow(visible[i]),
                            ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _selected.isEmpty
                        ? null
                        : () => Navigator.pop(context, {
                              'ids': _selected.toList(),
                              'grades': Map<int, int>.from(_gradeByStudent),
                            }),
                    icon: const Icon(Icons.person_add_alt_1),
                    label: Text(_selected.isEmpty
                        ? 'Select students'
                        : 'Add ${_selected.length} ${_selected.length == 1 ? 'student' : 'students'}'),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _studentRow(UserModel s) {
    final isSelected = _selected.contains(s.id);
    final grade = _gradeIn(s);
    final other = widget.otherBatchOf[s.id];
    final details = [
      if ((s.userId ?? '').isNotEmpty) s.userId!,
      if ((s.fatherName ?? '').isNotEmpty) 'Parent: ${s.fatherName}',
      if (grade != null && grade.isNotEmpty) 'Grade: $grade',
    ].join(' · ');

    return Column(
      children: [
        CheckboxListTile(
          value: isSelected,
          onChanged: (v) {
            setState(() {
              if (v == true) {
                _selected.add(s.id);
              } else {
                _selected.remove(s.id);
                _gradeByStudent.remove(s.id);
              }
            });
          },
          secondary: UserAvatar(
            photoUrl: s.photoUrl,
            name: s.name,
            color: AppColors.studentAccent,
          ),
          title: Text(s.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.labelLarge),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (details.isNotEmpty)
                Text(details,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AppTextStyles.caption),
              if (other != null)
                Text(
                  'Already in $other${isSelected ? ' — they will be in both. Use Move there instead.' : ''}',
                  style: AppTextStyles.caption.copyWith(
                    color: const Color(0xFFB45309),
                    fontWeight: FontWeight.w600,
                  ),
                ),
            ],
          ),
        ),
        if (isSelected && _grades.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(72, 0, 16, 8),
            child: DropdownButtonFormField<int>(
              initialValue: _gradeByStudent[s.id],
              isExpanded: true,
              decoration: InputDecoration(
                isDense: true,
                labelText: grade != null
                    ? 'Change grade (optional)'
                    : 'Assign grade (optional)',
                prefixIcon: const Icon(Icons.grade, size: 18),
              ),
              items: _grades
                  .map((g) => DropdownMenuItem(
                        value: g.id,
                        child: Text(
                          '${g.name} · ₹${g.monthlyFee.toStringAsFixed(0)}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ))
                  .toList(),
              onChanged: (v) => setState(() {
                if (v != null) _gradeByStudent[s.id] = v;
              }),
            ),
          ),
      ],
    );
  }
}
