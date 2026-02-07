import 'package:flutter/material.dart';

import '../../config/theme/app_colors.dart';
import '../../config/theme/app_text_styles.dart';

class RoleBadge extends StatelessWidget {
  final String role;
  final bool isSuperAdmin;

  const RoleBadge({
    super.key,
    required this.role,
    this.isSuperAdmin = false,
  });

  @override
  Widget build(BuildContext context) {
    final label = isSuperAdmin ? 'Super Admin' : role;
    final color = _colorForRole(role, isSuperAdmin);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: AppTextStyles.caption.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
          fontSize: 11,
        ),
      ),
    );
  }

  static Color _colorForRole(String role, bool isSuperAdmin) {
    if (isSuperAdmin) return AppColors.error;
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
