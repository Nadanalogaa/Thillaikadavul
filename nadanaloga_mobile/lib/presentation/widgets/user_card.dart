import 'package:flutter/material.dart';

import '../../config/theme/app_colors.dart';
import '../../config/theme/app_text_styles.dart';
import '../../data/models/user_model.dart';
import 'role_badge.dart';

class UserCard extends StatelessWidget {
  final UserModel user;
  final VoidCallback? onTap;

  const UserCard({
    super.key,
    required this.user,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 8, 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: _avatarColor(user.role),
                child: Text(
                  user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: user.isStudent ? _studentBody() : _genericBody(),
              ),
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Icon(Icons.chevron_right, color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _studentBody() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                user.name,
                style: AppTextStyles.labelLarge,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            RoleBadge(role: user.role, isSuperAdmin: user.isSuperAdmin),
          ],
        ),
        const SizedBox(height: 4),
        // Phone + ID row
        Row(
          children: [
            if (user.contactNumber != null && user.contactNumber!.isNotEmpty) ...[
              const Icon(Icons.phone, size: 13, color: AppColors.textSecondary),
              const SizedBox(width: 3),
              Text(user.contactNumber!, style: AppTextStyles.caption),
              const SizedBox(width: 10),
            ],
            if (user.userId != null)
              Flexible(
                child: Text(
                  user.userId!,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
          ],
        ),
        if (user.coursesLabel != null) ...[
          const SizedBox(height: 3),
          _infoRow(Icons.menu_book, user.coursesLabel!),
        ],
        // Grade + Batch chips
        if (user.gradeLabel != null || user.batchLabel != null) ...[
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              if (user.gradeLabel != null)
                _chip(Icons.grade, user.gradeLabel!, AppColors.primary),
              if (user.batchLabel != null)
                _chip(Icons.group_work, user.batchLabel!, AppColors.studentAccent),
            ],
          ),
        ],
      ],
    );
  }

  Widget _genericBody() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                user.name,
                style: AppTextStyles.labelLarge,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            RoleBadge(role: user.role, isSuperAdmin: user.isSuperAdmin),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          user.email,
          style: AppTextStyles.caption,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        if (user.userId != null)
          Text(
            user.userId!,
            style: AppTextStyles.caption.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w500,
            ),
          ),
      ],
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 13, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            text,
            style: AppTextStyles.caption,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _chip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: AppTextStyles.caption.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
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
