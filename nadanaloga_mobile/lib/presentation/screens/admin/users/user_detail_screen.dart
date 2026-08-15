import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/user_model.dart';
import '../../../../data/models/grade_model.dart';
import '../../../../data/models/course_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/auth/auth_bloc.dart';
import '../../../bloc/auth/auth_state.dart';
import '../../../bloc/user_management/user_management_bloc.dart';
import '../../../bloc/user_management/user_management_event.dart';
import '../../../bloc/user_management/user_management_state.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/role_badge.dart';

class UserDetailScreen extends StatefulWidget {
  final int userId;

  const UserDetailScreen({super.key, required this.userId});

  @override
  State<UserDetailScreen> createState() => _UserDetailScreenState();
}

class _UserDetailScreenState extends State<UserDetailScreen> {
  UserModel? _user;
  List<UserModel> _children = [];
  List<StudentGradeModel> _studentGrades = [];
  List<GradeModel> _allGrades = [];
  List<CourseModel> _allCourses = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = sl<ApiClient>();
      final response = await api.getUserById(widget.userId);
      if (response.statusCode == 200 && response.data != null) {
        // Load linked child profiles (empty for accounts that have none).
        List<UserModel> children = [];
        try {
          final childResp = await api.getChildren(widget.userId);
          if (childResp.statusCode == 200 && childResp.data is List) {
            children = (childResp.data as List)
                .map((c) => UserModel.fromJson(c))
                .toList();
          }
        } catch (_) {}
        final loaded = UserModel.fromJson(response.data);
        // For students, load their grade assignments + the grade/course catalog.
        List<StudentGradeModel> studentGrades = [];
        List<GradeModel> allGrades = [];
        List<CourseModel> allCourses = [];
        if (loaded.role == 'Student') {
          try {
            final r = await Future.wait([
              api.getStudentGrades(widget.userId),
              api.getGrades(),
              api.getCourses(),
            ]);
            if (r[0].statusCode == 200 && r[0].data is List) {
              studentGrades = (r[0].data as List)
                  .map((j) => StudentGradeModel.fromJson(j))
                  .toList();
            }
            if (r[1].statusCode == 200 && r[1].data is List) {
              allGrades =
                  (r[1].data as List).map((j) => GradeModel.fromJson(j)).toList();
            }
            if (r[2].statusCode == 200 && r[2].data is List) {
              allCourses = (r[2].data as List)
                  .map((j) => CourseModel.fromJson(j))
                  .toList();
            }
          } catch (_) {}
        }
        setState(() {
          _user = loaded;
          _children = children;
          _studentGrades = studentGrades;
          _allGrades = allGrades;
          _allCourses = allCourses;
          _loading = false;
        });
      } else {
        setState(() {
          _error = 'User not found.';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to load user.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.read<AuthBloc>().state;
    final currentUser =
        authState is AuthAuthenticated ? authState.user : null;
    final isSuperAdmin = currentUser?.isSuperAdmin == true;

    return BlocListener<UserManagementBloc, UserManagementState>(
      listener: (context, state) {
        if (state is UserManagementOperationSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message)),
          );
          _loadUser();
        } else if (state is UserManagementError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.error,
            ),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(_user?.name ?? 'User Details'),
          actions: [
            if (_user != null)
              PopupMenuButton<String>(
                onSelected: (value) => _handleAction(value, isSuperAdmin),
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'edit',
                    child: ListTile(
                      leading: Icon(Icons.edit),
                      title: Text('Edit'),
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                  if (isSuperAdmin && _user!.role != 'Admin')
                    const PopupMenuItem(
                      value: 'make_admin',
                      child: ListTile(
                        leading: Icon(Icons.admin_panel_settings),
                        title: Text('Make Admin'),
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  if (isSuperAdmin &&
                      _user!.role == 'Admin' &&
                      _user!.id != currentUser?.id)
                    const PopupMenuItem(
                      value: 'remove_admin',
                      child: ListTile(
                        leading: Icon(Icons.person_remove),
                        title: Text('Remove Admin'),
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  const PopupMenuItem(
                    value: 'delete',
                    child: ListTile(
                      leading: Icon(Icons.delete, color: AppColors.error),
                      title: Text('Delete',
                          style: TextStyle(color: AppColors.error)),
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ],
              ),
          ],
        ),
        body: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline,
                size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text(_error!, style: AppTextStyles.bodyMedium),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loadUser,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    final user = _user!;
    return RefreshIndicator(
      onRefresh: _loadUser,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Profile header
            Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 40,
                    backgroundColor: _avatarColor(user.role),
                    child: Text(
                      user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(user.name, style: AppTextStyles.h2),
                  const SizedBox(height: 4),
                  RoleBadge(
                      role: user.role, isSuperAdmin: user.isSuperAdmin),
                  if (user.userId != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      user.userId!,
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Personal info
            _SectionHeader(title: 'Personal Information'),
            _InfoRow(icon: Icons.email, label: 'Email', value: user.email),
            if (user.contactNumber != null)
              _InfoRow(
                  icon: Icons.phone,
                  label: 'Phone',
                  value: user.contactNumber!),
            if (user.fatherName != null)
              _InfoRow(
                  icon: Icons.person,
                  label: "Father's Name",
                  value: user.fatherName!),
            if (user.address != null)
              _InfoRow(
                  icon: Icons.location_on,
                  label: 'Address',
                  value: user.address!),
            if (user.dob != null)
              _InfoRow(
                  icon: Icons.cake, label: 'Date of Birth', value: user.dob!),
            if (user.sex != null)
              _InfoRow(icon: Icons.wc, label: 'Gender', value: user.sex!),

            // Academic info
            if (user.courses.isNotEmpty ||
                user.classPreference != null) ...[
              const SizedBox(height: 16),
              _SectionHeader(title: 'Academic Information'),
              if (user.classPreference != null)
                _InfoRow(
                  icon: Icons.school,
                  label: 'Class Mode',
                  value: user.classPreference!,
                ),
              if (user.courses.isNotEmpty)
                _InfoRow(
                  icon: Icons.menu_book,
                  label: 'Courses',
                  value: user.courses.join(', '),
                ),
              if (user.standard != null)
                _InfoRow(
                    icon: Icons.class_,
                    label: 'Standard',
                    value: user.standard!),
              if (user.schoolName != null)
                _InfoRow(
                    icon: Icons.apartment,
                    label: 'School',
                    value: user.schoolName!),
              if (user.grade != null)
                _InfoRow(
                    icon: Icons.star, label: 'Grade', value: user.grade!),
            ],

            // Status
            if (user.status != null || user.dateOfJoining != null) ...[
              const SizedBox(height: 16),
              _SectionHeader(title: 'Status'),
              if (user.status != null)
                _InfoRow(
                    icon: Icons.info,
                    label: 'Status',
                    value: user.status!),
              if (user.dateOfJoining != null)
                _InfoRow(
                  icon: Icons.calendar_today,
                  label: 'Joined',
                  value: user.dateOfJoining!,
                ),
            ],

            if (user.notes != null) ...[
              const SizedBox(height: 16),
              _SectionHeader(title: 'Notes'),
              Padding(
                padding: const EdgeInsets.only(left: 4),
                child: Text(user.notes!, style: AppTextStyles.bodyMedium),
              ),
            ],

            // Family — child profiles that share this account's single login.
            // Only for non-child, non-admin accounts.
            if (user.role != 'Admin' && user.parentId == null) ...[
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _SectionHeader(title: 'Children / Family'),
                  TextButton.icon(
                    onPressed: () => _showAddChildDialog(user),
                    icon: const Icon(Icons.person_add, size: 18),
                    label: const Text('Add Child'),
                  ),
                ],
              ),
              if (_children.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(left: 4, bottom: 8),
                  child: Text(
                    'No children linked. Use “Add Child” to add a family member '
                    'under this account — they share this login, no separate email needed.',
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.textSecondary),
                  ),
                )
              else
                ..._children.map(
                  (child) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: AppColors.studentAccent,
                        child: Text(
                          child.name.isNotEmpty
                              ? child.name[0].toUpperCase()
                              : '?',
                          style: const TextStyle(color: Colors.white),
                        ),
                      ),
                      title: Text(child.name),
                      subtitle: Text(child.userId ?? 'Student'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/admin/users/${child.id}'),
                    ),
                  ),
                ),
            ],

            // Enrollment — admin assigns the student's grade per course (drives fees).
            if (user.role == 'Student') ...[
              const SizedBox(height: 20),
              _SectionHeader(title: 'Grades & Fees'),
              const SizedBox(height: 10),
              _gradesFeesCard(user),
            ],

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  void _handleAction(String action, bool isSuperAdmin) async {
    final user = _user;
    if (user == null) return;

    switch (action) {
      case 'edit':
        context.push('/admin/users/${user.id}/edit');
        break;
      case 'make_admin':
        final confirmed = await ConfirmDialog.show(
          context,
          title: 'Promote to Admin',
          message:
              'Are you sure you want to make ${user.name} an Admin? They will have administrative access.',
          confirmLabel: 'Promote',
        );
        if (confirmed == true && mounted) {
          context.read<UserManagementBloc>().add(MakeAdmin(user.id));
        }
        break;
      case 'remove_admin':
        final confirmed = await ConfirmDialog.show(
          context,
          title: 'Remove Admin',
          message:
              'Are you sure you want to remove admin privileges from ${user.name}?',
          confirmLabel: 'Remove',
          confirmColor: AppColors.error,
        );
        if (confirmed == true && mounted) {
          context.read<UserManagementBloc>().add(RemoveAdmin(user.id));
        }
        break;
      case 'delete':
        final confirmed = await ConfirmDialog.show(
          context,
          title: 'Delete User',
          message:
              'Are you sure you want to delete ${user.name}? They can be restored from the trash.',
          confirmLabel: 'Delete',
          confirmColor: AppColors.error,
        );
        if (confirmed == true && mounted) {
          context.read<UserManagementBloc>().add(DeleteUser(user.id));
          context.pop();
        }
        break;
    }
  }

  void _showAddChildDialog(UserModel parent) {
    final formKey = GlobalKey<FormState>();
    final nameController = TextEditingController();
    final gradeController = TextEditingController();
    final dobController = TextEditingController();
    String? sex;
    bool isSaving = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text('Add Child to ${parent.name}'),
              content: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextFormField(
                      controller: nameController,
                      decoration: const InputDecoration(
                        labelText: 'Child Name *',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      validator: (v) => (v == null || v.trim().isEmpty)
                          ? 'Name is required'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: sex,
                      decoration: const InputDecoration(
                        labelText: 'Gender',
                        prefixIcon: Icon(Icons.wc),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'Male', child: Text('Male')),
                        DropdownMenuItem(
                            value: 'Female', child: Text('Female')),
                      ],
                      onChanged: (v) => setDialogState(() => sex = v),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: dobController,
                      decoration: const InputDecoration(
                        labelText: 'Date of Birth (YYYY-MM-DD)',
                        prefixIcon: Icon(Icons.cake),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: gradeController,
                      decoration: const InputDecoration(
                        labelText: 'Grade / Standard',
                        prefixIcon: Icon(Icons.star_outline),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSaving
                      ? null
                      : () => Navigator.of(dialogContext).pop(),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: isSaving
                      ? null
                      : () async {
                          if (!formKey.currentState!.validate()) return;
                          setDialogState(() => isSaving = true);
                          try {
                            final resp = await sl<ApiClient>().addChild(
                              parent.id,
                              {
                                'name': nameController.text.trim(),
                                if (sex != null) 'sex': sex,
                                if (dobController.text.trim().isNotEmpty)
                                  'dob': dobController.text.trim(),
                                if (gradeController.text.trim().isNotEmpty)
                                  'grade': gradeController.text.trim(),
                              },
                            );
                            if (!mounted) return;
                            if (resp.statusCode == 201) {
                              Navigator.of(dialogContext).pop();
                              ScaffoldMessenger.of(this.context).showSnackBar(
                                const SnackBar(
                                  content: Text('Child added to family'),
                                  backgroundColor: AppColors.success,
                                ),
                              );
                              _loadUser();
                            } else {
                              setDialogState(() => isSaving = false);
                              ScaffoldMessenger.of(this.context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    resp.data?['message'] ??
                                        'Failed to add child',
                                  ),
                                  backgroundColor: AppColors.error,
                                ),
                              );
                            }
                          } catch (e) {
                            if (!mounted) return;
                            setDialogState(() => isSaving = false);
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              SnackBar(
                                content: Text('Error: $e'),
                                backgroundColor: AppColors.error,
                              ),
                            );
                          }
                        },
                  child: isSaving
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child:
                              CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Add'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _gradesFeesCard(UserModel user) {
    final gross =
        _studentGrades.fold<double>(0, (s, g) => s + g.monthlyFee);
    final total =
        _studentGrades.fold<double>(0, (s, g) => s + g.netAmount);
    final hasAnyDiscount = _studentGrades.any((g) => g.hasDiscount);
    final gradedCount = _studentGrades.length;
    final courseCount = user.courses.length;

    StudentGradeModel? gradeFor(String courseName) {
      for (final g in _studentGrades) {
        if ((g.courseName ?? '').toLowerCase() == courseName.toLowerCase()) {
          return g;
        }
      }
      return null;
    }

    int? courseIdFor(String courseName) {
      for (final c in _allCourses) {
        if (c.name.toLowerCase() == courseName.toLowerCase()) return c.id;
      }
      return null;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Total banner
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.primary,
                AppColors.primary.withValues(alpha: 0.75),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Monthly Fee',
                        style: TextStyle(color: Colors.white70, fontSize: 13)),
                    const SizedBox(height: 2),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '₹${total.toStringAsFixed(0)}',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 26,
                              fontWeight: FontWeight.bold),
                        ),
                        if (hasAnyDiscount) ...[
                          const SizedBox(width: 8),
                          Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Text(
                              '₹${gross.toStringAsFixed(0)}',
                              style: const TextStyle(
                                color: Colors.white54,
                                fontSize: 15,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    Text(
                      courseCount == 0
                          ? 'No courses applied yet'
                          : hasAnyDiscount
                              ? '$gradedCount of $courseCount graded · discount applied'
                              : '$gradedCount of $courseCount course(s) graded',
                      style:
                          const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.account_balance_wallet,
                  color: Colors.white, size: 40),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Per-course rows
        if (courseCount == 0)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              'Student has not applied for any course yet.',
              style: AppTextStyles.caption
                  .copyWith(color: AppColors.textSecondary),
            ),
          )
        else
          ...user.courses.map((courseName) {
            final sg = gradeFor(courseName);
            final courseId = courseIdFor(courseName);
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: (sg != null
                      ? AppColors.primary
                      : AppColors.textSecondary)
                      .withValues(alpha: 0.12),
                  child: Icon(Icons.menu_book,
                      color: sg != null
                          ? AppColors.primary
                          : AppColors.textSecondary,
                      size: 20),
                ),
                title: Text(courseName,
                    style: AppTextStyles.labelLarge),
                subtitle: sg != null
                    ? (sg.hasDiscount
                        ? Text(
                            '${sg.gradeName ?? 'Grade'} · ₹${sg.netAmount.toStringAsFixed(0)}/month '
                            '(₹${sg.monthlyFee.toStringAsFixed(0)} − ${sg.discountPercentage.toStringAsFixed(0)}%)',
                            style: AppTextStyles.caption
                                .copyWith(color: AppColors.success))
                        : Text(
                            '${sg.gradeName ?? 'Grade'} · ₹${sg.monthlyFee.toStringAsFixed(0)}/month',
                            style: AppTextStyles.caption
                                .copyWith(color: AppColors.primary)))
                    : Text('No grade assigned',
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.textSecondary)),
                trailing: sg != null
                    ? IconButton(
                        icon: const Icon(Icons.edit, size: 20),
                        onPressed: () =>
                            _showAssignGrade(user, existing: sg),
                      )
                    : TextButton(
                        onPressed: courseId == null
                            ? null
                            : () => _showAssignGrade(user,
                                presetCourseId: courseId),
                        child: const Text('Assign'),
                      ),
              ),
            );
          }),
      ],
    );
  }

  void _showAssignGrade(UserModel student,
      {StudentGradeModel? existing, int? presetCourseId}) {
    final formKey = GlobalKey<FormState>();
    int? courseId = existing?.courseId ??
        presetCourseId ??
        (_allCourses.isNotEmpty ? _allCourses.first.id : null);
    int? gradeId = existing?.gradeId;
    final lockCourse = existing != null || presetCourseId != null;
    bool saving = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialog) {
          final gradesForCourse =
              _allGrades.where((g) => g.courseId == courseId).toList();
          return AlertDialog(
            title: Text(existing == null ? 'Assign Grade' : 'Change Grade'),
            content: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<int>(
                    value: courseId,
                    decoration: const InputDecoration(
                        labelText: 'Course *',
                        prefixIcon: Icon(Icons.menu_book)),
                    items: _allCourses
                        .map((c) =>
                            DropdownMenuItem(value: c.id, child: Text(c.name)))
                        .toList(),
                    onChanged: lockCourse
                        ? null
                        : (v) => setDialog(() {
                              courseId = v;
                              gradeId = null;
                            }),
                    validator: (v) => v == null ? 'Select a course' : null,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int>(
                    value: gradeId,
                    decoration: const InputDecoration(
                        labelText: 'Grade *', prefixIcon: Icon(Icons.grade)),
                    items: gradesForCourse
                        .map((g) => DropdownMenuItem(
                            value: g.id,
                            child: Text(
                                '${g.name}  ·  ₹${g.monthlyFee.toStringAsFixed(0)}')))
                        .toList(),
                    onChanged: (v) => setDialog(() => gradeId = v),
                    validator: (v) => v == null ? 'Select a grade' : null,
                  ),
                  if (gradesForCourse.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        'No grades for this course. Add them in Grades & Fees first.',
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.error),
                      ),
                    ),
                ],
              ),
            ),
            actions: [
              if (existing != null && existing.courseId != null)
                TextButton(
                  onPressed: saving
                      ? null
                      : () async {
                          setDialog(() => saving = true);
                          try {
                            final r = await sl<ApiClient>()
                                .removeStudentGrade(
                                    student.id, existing.courseId!);
                            if (!mounted) return;
                            if (r.statusCode == 200 ||
                                r.statusCode == 204) {
                              Navigator.of(dialogContext).pop();
                              ScaffoldMessenger.of(this.context)
                                  .showSnackBar(
                                const SnackBar(
                                    content: Text('Grade removed'),
                                    backgroundColor: AppColors.warning),
                              );
                              _loadUser();
                            } else {
                              setDialog(() => saving = false);
                              ScaffoldMessenger.of(this.context)
                                  .showSnackBar(
                                SnackBar(
                                    content: Text(r.data?['message'] ??
                                        'Failed to remove grade'),
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
                  child: const Text('Remove',
                      style: TextStyle(color: AppColors.error)),
                ),
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
                        try {
                          final r = await sl<ApiClient>().assignStudentGrade(
                              student.id, courseId!, gradeId!);
                          if (!mounted) return;
                          if (r.statusCode == 200 || r.statusCode == 201) {
                            Navigator.of(dialogContext).pop();
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              const SnackBar(
                                  content: Text(
                                      'Grade assigned — student notified'),
                                  backgroundColor: AppColors.success),
                            );
                            _loadUser();
                          } else {
                            setDialog(() => saving = false);
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              SnackBar(
                                  content: Text(r.data?['message'] ??
                                      'Failed to assign grade'),
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
          );
        },
      ),
    );
  }

  Color _avatarColor(String role) {
    switch (role) {
      case 'Admin':
        return AppColors.adminAccent;
      case 'Teacher':
        return AppColors.teacherAccent;
      case 'Student':
        return AppColors.studentAccent;
      default:
        return AppColors.textSecondary;
    }
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;

  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: AppTextStyles.h4.copyWith(color: AppColors.primary),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: 12),
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: AppTextStyles.caption.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(value, style: AppTextStyles.bodyMedium),
          ),
        ],
      ),
    );
  }
}
