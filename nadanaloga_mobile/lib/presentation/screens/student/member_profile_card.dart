import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/utils/date_display.dart';
import '../../../data/models/user_model.dart';
import '../../widgets/user_avatar.dart';
import 'edit_member_sheet.dart';

/// One family member's details, the same card on Students Profile and on
/// More → Profile, with the edit pencil (name, date of birth, school, address,
/// family email…). Courses, grades, batches and the phone number are shown but
/// only the academy changes them.
class MemberProfileCard extends StatelessWidget {
  final UserModel member;
  /// Shown when given: an "Open" button to that member's dashboard.
  final VoidCallback? onOpen;
  /// Called after the edit sheet saved something.
  final VoidCallback onChanged;
  /// The signed-in account's own card: shows phone and email too.
  final bool isAccount;

  const MemberProfileCard({
    super.key,
    required this.member,
    required this.onChanged,
    this.onOpen,
    this.isAccount = false,
  });

  @override
  Widget build(BuildContext context) {
    final s = member;
    final isParent = s.role.trim().toLowerCase() == 'parent';
    final rows = <List<String>>[
      if (s.userId != null && s.userId!.isNotEmpty) ['ID', s.userId!],
      if (isAccount && (s.contactNumber ?? '').isNotEmpty) ['Phone (sign-in)', s.contactNumber!],
      if (isAccount && s.shownEmail.isNotEmpty) ['Email', s.shownEmail],
      if (s.dob != null && s.dob!.isNotEmpty) ['Date of birth', formatDisplayDate(s.dob!)],
      if (s.sex != null && s.sex!.isNotEmpty) ['Gender', s.sex!],
      if (!isParent && s.schoolName != null && s.schoolName!.isNotEmpty) ['School', s.schoolName!],
      if (!isParent && s.standard != null && s.standard!.isNotEmpty) ['Standard', s.standard!],
      if (s.gradeLabel != null) ['Grade', s.gradeLabel!],
      if (s.batchLabel != null) ['Batches', s.batchLabel!],
      if (!isParent && s.classPreference != null && s.classPreference!.isNotEmpty)
        ['Class preference', s.classPreference!],
      if (s.dateOfJoining != null && s.dateOfJoining!.isNotEmpty)
        ['Joined', formatDisplayDate(s.dateOfJoining!)],
      if (!isParent && s.fatherName != null && s.fatherName!.isNotEmpty) ['Parent / guardian', s.fatherName!],
      if (s.address != null && s.address!.trim().isNotEmpty) ['Address', s.address!.trim()],
    ];
    return Card(
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: AppColors.primary.withValues(alpha: 0.15)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                UserAvatar(
                  photoUrl: s.photoUrl,
                  name: s.name,
                  color: AppColors.primary.withValues(alpha: 0.12),
                  foreground: AppColors.primary,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s.name, style: AppTextStyles.labelLarge),
                      Text(
                        isParent ? 'Parent · your account' : (s.coursesLabel ?? (isAccount ? 'Your account' : 'No courses yet')),
                        style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Edit details',
                  icon: const Icon(Icons.edit_outlined, color: AppColors.primary),
                  onPressed: () async {
                    final saved = await showEditMemberSheet(context, s);
                    if (saved) onChanged();
                  },
                ),
                if (onOpen != null) TextButton(onPressed: onOpen, child: const Text('Open')),
              ],
            ),
            if (rows.isNotEmpty) const Divider(height: 18),
            for (final r in rows)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 130,
                      child: Text(r[0],
                          style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                    ),
                    Expanded(child: Text(r[1], style: AppTextStyles.bodyMedium)),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
