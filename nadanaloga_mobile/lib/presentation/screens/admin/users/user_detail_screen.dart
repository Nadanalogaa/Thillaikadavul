import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/user_model.dart';
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
      final response = await sl<ApiClient>().getUserById(widget.userId);
      if (response.statusCode == 200 && response.data != null) {
        setState(() {
          _user = UserModel.fromJson(response.data);
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
