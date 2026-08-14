import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/grade_model.dart';
import '../../../../data/models/user_model.dart';
import '../../../../di/injection_container.dart';

class StudentPickerSheet extends StatefulWidget {
  final List<int> excludeIds;
  final int? batchCourseId; // when set, offer a grade dropdown for this course
  final String? batchCourseName;

  const StudentPickerSheet({
    super.key,
    this.excludeIds = const [],
    this.batchCourseId,
    this.batchCourseName,
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
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadStudents();
    _loadGrades();
  }

  Future<void> _loadGrades() async {
    if (widget.batchCourseId == null) return;
    try {
      final r = await sl<ApiClient>().getGrades(courseId: widget.batchCourseId);
      if (r.statusCode == 200) {
        _grades = (r.data as List).map((j) => GradeModel.fromJson(j)).toList();
        if (mounted) setState(() {});
      }
    } catch (_) {}
  }

  Future<void> _loadStudents([String? search]) async {
    setState(() => _loading = true);
    try {
      final response = await sl<ApiClient>()
          .getUsers(role: 'Student', search: search);
      if (response.statusCode == 200) {
        final all = (response.data as List)
            .map((j) => UserModel.fromJson(j))
            .toList();
        _students = all
            .where((s) => !widget.excludeIds.contains(s.id))
            .toList();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Text('Add Students', style: AppTextStyles.h3),
                  ),
                  if (_selected.isNotEmpty)
                    FilledButton(
                      onPressed: () => Navigator.pop(context, {
                        'ids': _selected.toList(),
                        'grades': Map<int, int>.from(_gradeByStudent),
                      }),
                      child: Text('Add (${_selected.length})'),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search students...',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  contentPadding: EdgeInsets.zero,
                ),
                onSubmitted: (v) => _loadStudents(v.trim().isEmpty ? null : v.trim()),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _students.isEmpty
                      ? Center(
                          child: Text(
                            'No students available',
                            style: AppTextStyles.bodyMedium
                                .copyWith(color: AppColors.textSecondary),
                          ),
                        )
                      : ListView.builder(
                          controller: scrollController,
                          itemCount: _students.length,
                          itemBuilder: (context, index) {
                            final student = _students[index];
                            final isSelected = _selected.contains(student.id);
                            final gradesForCourse = _grades
                                .where((g) => g.courseId == widget.batchCourseId)
                                .toList();
                            final existing = widget.batchCourseName == null
                                ? null
                                : student.courseGrades.where((g) =>
                                    (g.courseName ?? '').toLowerCase() ==
                                    widget.batchCourseName!.toLowerCase());
                            final existingGrade = (existing != null &&
                                    existing.isNotEmpty)
                                ? existing.first.gradeName
                                : null;
                            return Column(
                              children: [
                                CheckboxListTile(
                                  value: isSelected,
                                  onChanged: (v) {
                                    setState(() {
                                      if (v == true) {
                                        _selected.add(student.id);
                                      } else {
                                        _selected.remove(student.id);
                                        _gradeByStudent.remove(student.id);
                                      }
                                    });
                                  },
                                  title: Text(student.name),
                                  subtitle: Text(
                                    existingGrade != null
                                        ? '${student.userId ?? student.email} · Grade: $existingGrade'
                                        : (student.userId ?? student.email),
                                    style: AppTextStyles.caption,
                                  ),
                                  secondary: CircleAvatar(
                                    backgroundColor: AppColors.studentAccent,
                                    child: Text(
                                      student.name[0].toUpperCase(),
                                      style: const TextStyle(color: Colors.white),
                                    ),
                                  ),
                                ),
                                if (isSelected && gradesForCourse.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.fromLTRB(72, 0, 16, 8),
                                    child: DropdownButtonFormField<int>(
                                      value: _gradeByStudent[student.id],
                                      isExpanded: true,
                                      decoration: InputDecoration(
                                        isDense: true,
                                        labelText: existingGrade != null
                                            ? 'Change grade (${widget.batchCourseName})'
                                            : 'Assign grade (${widget.batchCourseName})',
                                        prefixIcon:
                                            const Icon(Icons.grade, size: 18),
                                      ),
                                      items: gradesForCourse
                                          .map((g) => DropdownMenuItem(
                                                value: g.id,
                                                child: Text(
                                                    '${g.name} · ₹${g.monthlyFee.toStringAsFixed(0)}'),
                                              ))
                                          .toList(),
                                      onChanged: (v) => setState(() {
                                        if (v != null) {
                                          _gradeByStudent[student.id] = v;
                                        }
                                      }),
                                    ),
                                  ),
                              ],
                            );
                          },
                        ),
            ),
          ],
        );
      },
    );
  }
}
