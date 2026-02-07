import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/user_model.dart';
import '../../../../di/injection_container.dart';

class StudentPickerSheet extends StatefulWidget {
  final List<int> excludeIds;

  const StudentPickerSheet({super.key, this.excludeIds = const []});

  @override
  State<StudentPickerSheet> createState() => _StudentPickerSheetState();
}

class _StudentPickerSheetState extends State<StudentPickerSheet> {
  List<UserModel> _students = [];
  final Set<int> _selected = {};
  bool _loading = true;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadStudents();
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
                      onPressed: () => Navigator.pop(context, _selected.toList()),
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
                            return CheckboxListTile(
                              value: isSelected,
                              onChanged: (v) {
                                setState(() {
                                  if (v == true) {
                                    _selected.add(student.id);
                                  } else {
                                    _selected.remove(student.id);
                                  }
                                });
                              },
                              title: Text(student.name),
                              subtitle: Text(
                                student.userId ?? student.email,
                                style: AppTextStyles.caption,
                              ),
                              secondary: CircleAvatar(
                                backgroundColor: AppColors.studentAccent,
                                child: Text(
                                  student.name[0].toUpperCase(),
                                  style: const TextStyle(color: Colors.white),
                                ),
                              ),
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
