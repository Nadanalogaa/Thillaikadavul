import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/course_model.dart';
import '../../../../data/models/grade_model.dart';
import '../../../../di/injection_container.dart';
import '../../../widgets/confirm_dialog.dart';

/// Admin screen to manage Grades (grade-based fees). A grade belongs to a
/// course and carries the monthly fee that drives student invoices.
class GradeManagementScreen extends StatefulWidget {
  const GradeManagementScreen({super.key});

  @override
  State<GradeManagementScreen> createState() => _GradeManagementScreenState();
}

class _GradeManagementScreenState extends State<GradeManagementScreen> {
  final _api = sl<ApiClient>();
  bool _loading = true;
  List<GradeModel> _grades = [];
  List<CourseModel> _courses = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([_api.getGrades(), _api.getCourses()]);
      if (results[0].statusCode == 200 && results[0].data is List) {
        _grades = (results[0].data as List)
            .map((j) => GradeModel.fromJson(j))
            .toList();
      }
      if (results[1].statusCode == 200 && results[1].data is List) {
        _courses = (results[1].data as List)
            .map((j) => CourseModel.fromJson(j))
            .toList();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Map<int?, List<GradeModel>> get _byCourse {
    final map = <int?, List<GradeModel>>{};
    for (final g in _grades) {
      map.putIfAbsent(g.courseId, () => []).add(g);
    }
    return map;
  }

  String _courseName(int? id) {
    if (id == null) return 'No course';
    try {
      return _courses.firstWhere((c) => c.id == id).name;
    } catch (_) {
      return 'Unknown course';
    }
  }

  @override
  Widget build(BuildContext context) {
    final grouped = _byCourse;
    final courseIds = grouped.keys.toList()
      ..sort((a, b) => _courseName(a).compareTo(_courseName(b)));

    return Scaffold(
      appBar: AppBar(title: const Text('Grade Management')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _courses.isEmpty ? null : () => _showForm(),
        icon: const Icon(Icons.add),
        label: const Text('Add Grade'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _grades.isEmpty
              ? _empty()
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      for (final cid in courseIds) ...[
                        Padding(
                          padding: const EdgeInsets.only(top: 8, bottom: 8),
                          child: Text(_courseName(cid),
                              style: AppTextStyles.h4
                                  .copyWith(color: AppColors.primary)),
                        ),
                        ...grouped[cid]!.map((g) => _gradeCard(g)),
                      ],
                    ],
                  ),
                ),
    );
  }

  Widget _empty() => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.school_outlined,
                  size: 56, color: AppColors.textSecondary),
              const SizedBox(height: 12),
              Text('No grades yet', style: AppTextStyles.h3),
              const SizedBox(height: 6),
              Text('Add a grade under a course and set its fee.',
                  style: AppTextStyles.bodyMedium
                      .copyWith(color: AppColors.textSecondary),
                  textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _courses.isEmpty ? null : () => _showForm(),
                icon: const Icon(Icons.add),
                label: const Text('Add Grade'),
              ),
              if (_courses.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text('Create a course first.',
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.error)),
                ),
            ],
          ),
        ),
      );

  Widget _gradeCard(GradeModel g) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppColors.primary.withValues(alpha: 0.12),
          child: const Icon(Icons.grade, color: AppColors.primary, size: 20),
        ),
        title: Text(g.name, style: AppTextStyles.labelLarge),
        subtitle: Text('₹${g.monthlyFee.toStringAsFixed(0)} / month',
            style: AppTextStyles.caption),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.edit, size: 20),
              onPressed: () => _showForm(grade: g),
            ),
            IconButton(
              icon: const Icon(Icons.delete, size: 20, color: AppColors.error),
              onPressed: () => _delete(g),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _delete(GradeModel g) async {
    final ok = await ConfirmDialog.show(
      context,
      title: 'Delete Grade',
      message: 'Delete "${g.name}"? Existing invoices are not affected.',
      confirmLabel: 'Delete',
      confirmColor: AppColors.error,
    );
    if (ok != true) return;
    try {
      final r = await _api.deleteGrade(g.id);
      if (r.statusCode == 200) {
        _load();
      }
    } catch (_) {}
  }

  void _showForm({GradeModel? grade}) {
    final formKey = GlobalKey<FormState>();
    final nameController = TextEditingController(text: grade?.name ?? '');
    final feeController = TextEditingController(
        text: grade != null ? grade.monthlyFee.toStringAsFixed(0) : '');
    int? courseId = grade?.courseId ?? (_courses.isNotEmpty ? _courses.first.id : null);
    bool saving = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialog) => AlertDialog(
          title: Text(grade == null ? 'Add Grade' : 'Edit Grade'),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<int>(
                  value: courseId,
                  decoration: const InputDecoration(
                      labelText: 'Course *', prefixIcon: Icon(Icons.menu_book)),
                  items: _courses
                      .map((c) =>
                          DropdownMenuItem(value: c.id, child: Text(c.name)))
                      .toList(),
                  onChanged: (v) => setDialog(() => courseId = v),
                  validator: (v) => v == null ? 'Select a course' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: nameController,
                  decoration: const InputDecoration(
                      labelText: 'Grade Name *',
                      hintText: 'e.g. Grade 1 / Beginner',
                      prefixIcon: Icon(Icons.grade)),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: feeController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                      labelText: 'Monthly Fee (₹) *',
                      prefixText: '₹ ',
                      prefixIcon: Icon(Icons.payments_outlined)),
                  validator: (v) {
                    final n = double.tryParse((v ?? '').trim());
                    if (n == null || n < 0) return 'Enter a valid amount';
                    return null;
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed:
                  saving ? null : () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: saving
                  ? null
                  : () async {
                      if (!formKey.currentState!.validate()) return;
                      setDialog(() => saving = true);
                      final data = {
                        'course_id': courseId,
                        'name': nameController.text.trim(),
                        'monthly_fee':
                            double.tryParse(feeController.text.trim()) ?? 0,
                      };
                      try {
                        final r = grade == null
                            ? await _api.createGrade(data)
                            : await _api.updateGrade(grade.id, data);
                        if (!mounted) return;
                        if (r.statusCode == 200 || r.statusCode == 201) {
                          Navigator.of(dialogContext).pop();
                          _load();
                        } else {
                          setDialog(() => saving = false);
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                                content: Text(r.data?['message'] ??
                                    'Failed to save grade'),
                                backgroundColor: AppColors.error),
                          );
                        }
                      } catch (e) {
                        if (!mounted) return;
                        setDialog(() => saving = false);
                        ScaffoldMessenger.of(this.context).showSnackBar(
                          SnackBar(
                              content: Text('Error: $e'),
                              backgroundColor: AppColors.error),
                        );
                      }
                    },
              child: saving
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }
}
