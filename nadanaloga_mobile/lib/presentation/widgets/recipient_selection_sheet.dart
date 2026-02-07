import 'package:flutter/material.dart';

import '../../config/theme/app_colors.dart';
import '../../config/theme/app_text_styles.dart';
import '../../core/network/api_client.dart';
import '../../data/models/batch_model.dart';
import '../../data/models/course_model.dart';
import '../../data/models/user_model.dart';
import '../../di/injection_container.dart';

class RecipientSelectionResult {
  final List<int> recipientIds;
  final bool sendEmail;

  const RecipientSelectionResult({
    required this.recipientIds,
    this.sendEmail = true,
  });
}

class RecipientSelectionSheet extends StatefulWidget {
  final String contentTitle;
  final String contentType;

  const RecipientSelectionSheet({
    super.key,
    required this.contentTitle,
    required this.contentType,
  });

  @override
  State<RecipientSelectionSheet> createState() =>
      _RecipientSelectionSheetState();
}

class _RecipientSelectionSheetState extends State<RecipientSelectionSheet>
    with SingleTickerProviderStateMixin {
  List<UserModel> _allUsers = [];
  List<BatchModel> _allBatches = [];
  List<CourseModel> _allCourses = [];
  bool _loading = true;

  late TabController _tabController;

  // By User tab
  final Set<int> _selectedStudentIds = {};
  final Set<int> _selectedTeacherIds = {};
  String _studentSearch = '';
  String _teacherSearch = '';

  // By Group tab
  final Set<int> _selectedBatchIds = {};
  final Set<int> _selectedCourseIds = {};

  // Broadcast tab
  String? _broadcastOption;

  // Options
  bool _sendEmail = true;

  List<UserModel> get _students =>
      _allUsers.where((u) => u.role == 'Student' && !u.isDeleted).toList();

  List<UserModel> get _teachers =>
      _allUsers.where((u) => u.role == 'Teacher' && !u.isDeleted).toList();

  List<UserModel> get _filteredStudents {
    if (_studentSearch.isEmpty) return _students;
    final q = _studentSearch.toLowerCase();
    return _students
        .where((u) =>
            u.name.toLowerCase().contains(q) ||
            u.email.toLowerCase().contains(q))
        .toList();
  }

  List<UserModel> get _filteredTeachers {
    if (_teacherSearch.isEmpty) return _teachers;
    final q = _teacherSearch.toLowerCase();
    return _teachers
        .where((u) =>
            u.name.toLowerCase().contains(q) ||
            u.email.toLowerCase().contains(q))
        .toList();
  }

  Set<int> get _finalRecipientIds {
    final ids = <int>{};
    switch (_tabController.index) {
      case 0: // By User
        ids.addAll(_selectedStudentIds);
        ids.addAll(_selectedTeacherIds);
        break;
      case 1: // By Group
        for (final batchId in _selectedBatchIds) {
          final batch = _allBatches.where((b) => b.id == batchId).firstOrNull;
          if (batch != null) ids.addAll(batch.allStudentIds);
        }
        for (final courseId in _selectedCourseIds) {
          final course =
              _allCourses.where((c) => c.id == courseId).firstOrNull;
          if (course != null) {
            ids.addAll(_students
                .where((u) => u.courses.contains(course.name))
                .map((u) => u.id));
            ids.addAll(_teachers
                .where((u) => u.courseExpertise.contains(course.name))
                .map((u) => u.id));
          }
        }
        break;
      case 2: // Broadcast
        if (_broadcastOption == 'allStudents') {
          ids.addAll(_students.map((s) => s.id));
        } else if (_broadcastOption == 'allTeachers') {
          ids.addAll(_teachers.map((t) => t.id));
        } else if (_broadcastOption == 'everyone') {
          ids.addAll(
              _allUsers.where((u) => u.role != 'Admin' && !u.isDeleted).map((u) => u.id));
        }
        break;
    }
    return ids;
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final api = sl<ApiClient>();
      final responses = await Future.wait([
        api.getUsers(),
        api.getBatches(),
        api.getCourses(),
      ]);

      if (responses[0].statusCode == 200 && responses[0].data is List) {
        _allUsers = (responses[0].data as List)
            .map((j) => UserModel.fromJson(j))
            .toList();
      }
      if (responses[1].statusCode == 200 && responses[1].data is List) {
        _allBatches = (responses[1].data as List)
            .map((j) => BatchModel.fromJson(j))
            .toList();
      }
      if (responses[2].statusCode == 200 && responses[2].data is List) {
        _allCourses = (responses[2].data as List)
            .map((j) => CourseModel.fromJson(j))
            .toList();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  void _onSend() {
    final ids = _finalRecipientIds;
    if (ids.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one recipient')),
      );
      return;
    }
    Navigator.pop(
      context,
      RecipientSelectionResult(
        recipientIds: ids.toList(),
        sendEmail: _sendEmail,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final recipientCount = _finalRecipientIds.length;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Drag handle
              Container(
                margin: const EdgeInsets.only(top: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 8, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Share ${widget.contentType}',
                              style: AppTextStyles.h3),
                          const SizedBox(height: 2),
                          Text(
                            widget.contentTitle,
                            style: AppTextStyles.bodySmall
                                .copyWith(color: AppColors.textSecondary),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              // Tabs
              TabBar(
                controller: _tabController,
                labelColor: AppColors.primary,
                unselectedLabelColor: AppColors.textSecondary,
                indicatorColor: AppColors.primary,
                labelStyle: AppTextStyles.labelLarge,
                tabs: const [
                  Tab(text: 'By User'),
                  Tab(text: 'By Group'),
                  Tab(text: 'Broadcast'),
                ],
              ),
              const Divider(height: 1),
              // Content
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : TabBarView(
                        controller: _tabController,
                        children: [
                          _buildByUserTab(scrollController),
                          _buildByGroupTab(scrollController),
                          _buildBroadcastTab(scrollController),
                        ],
                      ),
              ),
              // Footer
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border:
                      Border(top: BorderSide(color: Colors.grey.shade200)),
                ),
                child: SafeArea(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          SizedBox(
                            height: 24,
                            width: 24,
                            child: Checkbox(
                              value: _sendEmail,
                              onChanged: (v) =>
                                  setState(() => _sendEmail = v ?? true),
                              activeColor: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text('Send email notifications',
                              style: AppTextStyles.bodySmall),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: recipientCount > 0
                                  ? AppColors.primary.withValues(alpha: 0.1)
                                  : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '$recipientCount recipient${recipientCount != 1 ? 's' : ''}',
                              style: AppTextStyles.labelSmall.copyWith(
                                color: recipientCount > 0
                                    ? AppColors.primary
                                    : AppColors.textSecondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: recipientCount > 0 ? _onSend : null,
                          icon: const Icon(Icons.send, size: 18),
                          label: Text('Send to $recipientCount'),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ─── By User Tab ───

  Widget _buildByUserTab(ScrollController scrollController) {
    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.all(16),
      children: [
        // Students section
        _buildSectionHeader(
          'Students (${_students.length})',
          allSelected: _selectedStudentIds.length == _students.length &&
              _students.isNotEmpty,
          onSelectAll: (val) {
            setState(() {
              if (val) {
                _selectedStudentIds.addAll(_students.map((s) => s.id));
              } else {
                _selectedStudentIds.clear();
              }
            });
          },
        ),
        _buildSearchField(
          hint: 'Search students...',
          onChanged: (v) => setState(() => _studentSearch = v),
        ),
        const SizedBox(height: 8),
        ..._filteredStudents.map((student) => _buildUserCheckbox(
              user: student,
              selected: _selectedStudentIds.contains(student.id),
              onChanged: (val) {
                setState(() {
                  if (val) {
                    _selectedStudentIds.add(student.id);
                  } else {
                    _selectedStudentIds.remove(student.id);
                  }
                });
              },
            )),
        if (_filteredStudents.isEmpty)
          _buildEmptyMessage('No students found'),

        const SizedBox(height: 20),

        // Teachers section
        _buildSectionHeader(
          'Teachers (${_teachers.length})',
          allSelected: _selectedTeacherIds.length == _teachers.length &&
              _teachers.isNotEmpty,
          onSelectAll: (val) {
            setState(() {
              if (val) {
                _selectedTeacherIds.addAll(_teachers.map((t) => t.id));
              } else {
                _selectedTeacherIds.clear();
              }
            });
          },
        ),
        _buildSearchField(
          hint: 'Search teachers...',
          onChanged: (v) => setState(() => _teacherSearch = v),
        ),
        const SizedBox(height: 8),
        ..._filteredTeachers.map((teacher) => _buildUserCheckbox(
              user: teacher,
              selected: _selectedTeacherIds.contains(teacher.id),
              onChanged: (val) {
                setState(() {
                  if (val) {
                    _selectedTeacherIds.add(teacher.id);
                  } else {
                    _selectedTeacherIds.remove(teacher.id);
                  }
                });
              },
            )),
        if (_filteredTeachers.isEmpty)
          _buildEmptyMessage('No teachers found'),
      ],
    );
  }

  // ─── By Group Tab ───

  Widget _buildByGroupTab(ScrollController scrollController) {
    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.all(16),
      children: [
        // Batches section
        Text('Batches', style: AppTextStyles.h4),
        const SizedBox(height: 8),
        if (_allBatches.isEmpty)
          _buildEmptyMessage('No batches available')
        else
          ..._allBatches.map((batch) {
            final studentCount = batch.allStudentIds.length;
            return CheckboxListTile(
              value: _selectedBatchIds.contains(batch.id),
              onChanged: (val) {
                setState(() {
                  if (val == true) {
                    _selectedBatchIds.add(batch.id);
                  } else {
                    _selectedBatchIds.remove(batch.id);
                  }
                });
              },
              activeColor: AppColors.primary,
              title: Text(batch.batchName, style: AppTextStyles.labelLarge),
              subtitle: Text(
                '$studentCount student${studentCount != 1 ? 's' : ''}${batch.mode != null ? ' \u00b7 ${batch.mode}' : ''}',
                style: AppTextStyles.caption,
              ),
              secondary:
                  const Icon(Icons.group_work, color: AppColors.primary),
              dense: true,
              contentPadding: EdgeInsets.zero,
            );
          }),

        const SizedBox(height: 20),

        // Courses section
        Text('Courses', style: AppTextStyles.h4),
        const SizedBox(height: 8),
        if (_allCourses.isEmpty)
          _buildEmptyMessage('No courses available')
        else
          ..._allCourses.map((course) {
            final studentCount = _students
                .where((u) => u.courses.contains(course.name))
                .length;
            final teacherCount = _teachers
                .where((u) => u.courseExpertise.contains(course.name))
                .length;
            return CheckboxListTile(
              value: _selectedCourseIds.contains(course.id),
              onChanged: (val) {
                setState(() {
                  if (val == true) {
                    _selectedCourseIds.add(course.id);
                  } else {
                    _selectedCourseIds.remove(course.id);
                  }
                });
              },
              activeColor: AppColors.primary,
              title: Text(course.name, style: AppTextStyles.labelLarge),
              subtitle: Text(
                '$studentCount students \u00b7 $teacherCount teachers',
                style: AppTextStyles.caption,
              ),
              secondary:
                  const Icon(Icons.school, color: AppColors.secondary),
              dense: true,
              contentPadding: EdgeInsets.zero,
            );
          }),
      ],
    );
  }

  // ─── Broadcast Tab ───

  Widget _buildBroadcastTab(ScrollController scrollController) {
    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.all(16),
      children: [
        const SizedBox(height: 8),
        _buildBroadcastOption(
          'allStudents',
          'All Students',
          '${_students.length} students',
          Icons.people,
          AppColors.primary,
        ),
        const SizedBox(height: 8),
        _buildBroadcastOption(
          'allTeachers',
          'All Teachers',
          '${_teachers.length} teachers',
          Icons.school,
          AppColors.secondary,
        ),
        const SizedBox(height: 8),
        _buildBroadcastOption(
          'everyone',
          'Everyone',
          '${_allUsers.where((u) => u.role != 'Admin' && !u.isDeleted).length} users (students + teachers)',
          Icons.public,
          AppColors.info,
        ),
      ],
    );
  }

  Widget _buildBroadcastOption(
    String value,
    String title,
    String subtitle,
    IconData icon,
    Color color,
  ) {
    final selected = _broadcastOption == value;
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: selected ? color : Colors.grey.shade200,
          width: selected ? 2 : 1,
        ),
      ),
      color: selected ? color.withValues(alpha: 0.05) : null,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.1),
          child: Icon(icon, color: color, size: 22),
        ),
        title: Text(title, style: AppTextStyles.labelLarge),
        subtitle:
            Text(subtitle, style: AppTextStyles.caption),
        trailing: Radio<String>(
          value: value,
          groupValue: _broadcastOption,
          onChanged: (v) => setState(() => _broadcastOption = v),
          activeColor: color,
        ),
        onTap: () => setState(() => _broadcastOption = value),
      ),
    );
  }

  // ─── Shared Builders ───

  Widget _buildSectionHeader(
    String title, {
    required bool allSelected,
    required ValueChanged<bool> onSelectAll,
  }) {
    return Row(
      children: [
        Text(title, style: AppTextStyles.h4),
        const Spacer(),
        TextButton(
          onPressed: () => onSelectAll(!allSelected),
          child: Text(
            allSelected ? 'Deselect All' : 'Select All',
            style: AppTextStyles.labelSmall
                .copyWith(color: AppColors.primary),
          ),
        ),
      ],
    );
  }

  Widget _buildSearchField({
    required String hint,
    required ValueChanged<String> onChanged,
  }) {
    return TextField(
      onChanged: onChanged,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle:
            AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
        prefixIcon:
            const Icon(Icons.search, size: 20, color: AppColors.textSecondary),
        isDense: true,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
      ),
      style: AppTextStyles.bodySmall,
    );
  }

  Widget _buildUserCheckbox({
    required UserModel user,
    required bool selected,
    required ValueChanged<bool> onChanged,
  }) {
    return CheckboxListTile(
      value: selected,
      onChanged: (val) => onChanged(val ?? false),
      activeColor: AppColors.primary,
      title: Text(user.name, style: AppTextStyles.labelLarge),
      subtitle: Text(user.email, style: AppTextStyles.caption),
      secondary: CircleAvatar(
        radius: 18,
        backgroundColor: AppColors.primary.withValues(alpha: 0.1),
        child: Text(
          user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
          style: AppTextStyles.labelLarge.copyWith(color: AppColors.primary),
        ),
      ),
      dense: true,
      contentPadding: EdgeInsets.zero,
    );
  }

  Widget _buildEmptyMessage(String msg) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Center(
        child: Text(msg,
            style: AppTextStyles.bodySmall
                .copyWith(color: AppColors.textSecondary)),
      ),
    );
  }
}
