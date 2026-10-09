import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/location_model.dart';
import '../../../di/injection_container.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../bloc/auth/auth_state.dart';

class StudentProfileScreen extends StatefulWidget {
  const StudentProfileScreen({super.key});

  @override
  State<StudentProfileScreen> createState() => _StudentProfileScreenState();
}

class _StudentProfileScreenState extends State<StudentProfileScreen> {
  LocationModel? _location;
  bool _isLoadingLocation = false;
  bool _deleting = false;

  @override
  void initState() {
    super.initState();
    _loadLocationIfNeeded();
  }

  Future<void> _loadLocationIfNeeded() async {
    final state = context.read<AuthBloc>().state;
    if (state is AuthAuthenticated && state.user.preferredLocationId != null) {
      setState(() => _isLoadingLocation = true);
      try {
        final apiClient = sl<ApiClient>();
        final response = await apiClient.getLocations();
        if (mounted && response.statusCode == 200 && response.data is List) {
          final locations = (response.data as List)
              .map((l) => LocationModel.fromJson(l))
              .toList();
          final match = locations
              .where((l) => l.id == state.user.preferredLocationId)
              .toList();
          if (match.isNotEmpty) {
            setState(() => _location = match.first);
          }
        }
      } catch (_) {}
      setState(() => _isLoadingLocation = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        final user = state is AuthAuthenticated ? state.user : null;

        return Scaffold(
          appBar: AppBar(
            // No automaticallyImplyLeading:false — this screen is now PUSHED from
            // the More menu and needs its back button.
            title: const Text('Profile'),
            backgroundColor: AppColors.studentAccent,
          ),
          body: user == null
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      // Profile Header Card
                      _ProfileHeaderCard(user: user)
                          .animate()
                          .fadeIn(duration: 400.ms)
                          .slideY(begin: -0.1, end: 0),
                      const SizedBox(height: 24),

                      // Personal Information Section
                      _SectionTitle(title: 'Personal Information')
                          .animate(delay: 100.ms)
                          .fadeIn(),
                      const SizedBox(height: 12),
                      _InfoCard(
                        children: [
                          _InfoRow(
                            icon: Icons.person,
                            label: 'Full Name',
                            value: user.name,
                          ),
                          _InfoRow(
                            icon: Icons.email,
                            label: 'Email',
                            value: user.email,
                          ),
                          if (user.contactNumber != null)
                            _InfoRow(
                              icon: Icons.phone,
                              label: 'Contact',
                              value: user.contactNumber!,
                            ),
                          _InfoRow(
                            icon: Icons.badge,
                            label: 'Student ID',
                            value: user.userId ?? 'Not assigned',
                          ),
                        ],
                      ).animate(delay: 150.ms).fadeIn().slideX(begin: 0.05, end: 0),
                      const SizedBox(height: 24),

                      // Academic Information Section
                      _SectionTitle(title: 'Academic Information')
                          .animate(delay: 200.ms)
                          .fadeIn(),
                      const SizedBox(height: 12),
                      _InfoCard(
                        children: [
                          _InfoRow(
                            icon: Icons.school,
                            label: 'Class Mode',
                            value: user.classPreference ?? 'Not set',
                            valueColor: AppColors.info,
                          ),
                          _InfoRow(
                            icon: Icons.location_city,
                            label: 'Branch',
                            value: _isLoadingLocation
                                ? 'Loading...'
                                : _location?.name ?? 'Not assigned',
                          ),
                          if (_location?.city != null)
                            _InfoRow(
                              icon: Icons.map,
                              label: 'City',
                              value: _location!.city!,
                            ),
                        ],
                      ).animate(delay: 250.ms).fadeIn().slideX(begin: 0.05, end: 0),
                      const SizedBox(height: 24),

                      // Enrolled Courses Section
                      _SectionTitle(title: 'Enrolled Courses')
                          .animate(delay: 300.ms)
                          .fadeIn(),
                      const SizedBox(height: 12),
                      if (user.courses.isEmpty)
                        _EmptyCoursesCard()
                            .animate(delay: 350.ms)
                            .fadeIn()
                      else
                        ...user.courses.asMap().entries.map((entry) {
                          final index = entry.key;
                          final courseName = entry.value;
                          return _CourseChip(courseName: courseName)
                              .animate(delay: Duration(milliseconds: 350 + (index * 50)))
                              .fadeIn()
                              .slideX(begin: 0.05, end: 0);
                        }),
                      const SizedBox(height: 24),

                      // Account Information Section
                      _SectionTitle(title: 'Account Information')
                          .animate(delay: 400.ms)
                          .fadeIn(),
                      const SizedBox(height: 12),
                      _InfoCard(
                        children: [
                          _InfoRow(
                            icon: Icons.verified_user,
                            label: 'Role',
                            value: user.role,
                            valueColor: AppColors.studentAccent,
                          ),
                          if (user.createdAt != null)
                            _InfoRow(
                              icon: Icons.calendar_today,
                              label: 'Member Since',
                              value: _formatDate(user.createdAt!),
                            ),
                        ],
                      ).animate(delay: 450.ms).fadeIn().slideX(begin: 0.05, end: 0),
                      const SizedBox(height: 24),

                      // Account deletion — Google Play requires this for any app
                      // where people can create an account.
                      _SectionTitle(title: 'Account')
                          .animate(delay: 500.ms)
                          .fadeIn(),
                      const SizedBox(height: 12),
                      _InfoCard(
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Deleting your account signs you out for good and removes your details, '
                                  'and your children\'s profiles, within 30 days. Payment receipts are kept '
                                  'as long as the law requires.',
                                  style: AppTextStyles.caption,
                                ),
                                const SizedBox(height: 12),
                                SizedBox(
                                  width: double.infinity,
                                  child: OutlinedButton.icon(
                                    onPressed: _deleting ? null : _confirmDelete,
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppColors.error,
                                      side: const BorderSide(color: AppColors.error),
                                    ),
                                    icon: _deleting
                                        ? const SizedBox(
                                            width: 16, height: 16,
                                            child: CircularProgressIndicator(strokeWidth: 2))
                                        : const Icon(Icons.delete_forever_outlined, size: 18),
                                    label: Text(_deleting ? 'Deleting…' : 'Delete my account'),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ).animate(delay: 550.ms).fadeIn(),
                      const SizedBox(height: 8),
                    ],
                  ),
                ),
        );
      },
    );
  }

  Future<void> _confirmDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete your account?'),
        content: const Text(
          'This cannot be undone. You will be signed out, and your details and '
          'your children\'s profiles are removed within 30 days.\n\n'
          'Payment receipts are kept as long as the law requires.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Keep my account'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _deleting = true);
    final messenger = ScaffoldMessenger.of(context);
    final authBloc = context.read<AuthBloc>();
    try {
      final response = await sl<ApiClient>().deleteMyAccount();
      final code = response.statusCode ?? 0;
      if (code >= 200 && code < 300) {
        messenger.showSnackBar(const SnackBar(
          content: Text('Your account has been deleted.'),
        ));
        authBloc.add(AuthLogoutRequested());
        return;
      }
      final message = response.data is Map
          ? (response.data['message'] as String?) ?? 'Could not delete the account.'
          : 'Could not delete the account.';
      messenger.showSnackBar(SnackBar(content: Text(message), backgroundColor: AppColors.error));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(
        content: Text('Could not delete the account. Please check your connection.'),
        backgroundColor: AppColors.error,
      ));
    }
    if (mounted) setState(() => _deleting = false);
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return '${date.day} ${months[date.month - 1]} ${date.year}';
    } catch (_) {
      return dateStr;
    }
  }
}

class _ProfileHeaderCard extends StatelessWidget {
  final dynamic user;

  const _ProfileHeaderCard({required this.user});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.studentAccent.withValues(alpha: 0.15),
        ),
      ),
      child: Column(
        children: [
          // Avatar
          Container(
            width: 88,
            height: 88,
            decoration: BoxDecoration(
              color: AppColors.studentAccent,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                _getInitials(user.name),
                style: AppTextStyles.h1.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 36,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Name
          Text(
            user.name,
            style: AppTextStyles.h2.copyWith(
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),

          // Email
          Text(
            user.email,
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),

          // Badges row
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (user.userId != null)
                _Badge(
                  icon: Icons.badge,
                  label: user.userId!,
                  color: AppColors.studentAccent,
                ),
              if (user.userId != null) const SizedBox(width: 8),
              _Badge(
                icon: Icons.person,
                label: 'Student',
                color: AppColors.info,
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }
}

class _Badge extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _Badge({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: AppTextStyles.labelSmall.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        title,
        style: AppTextStyles.h4,
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final List<Widget> children;

  const _InfoCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AppColors.divider),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: children),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.studentAccent.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: AppColors.studentAccent),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                Text(
                  value,
                  style: AppTextStyles.bodyMedium.copyWith(
                    fontWeight: FontWeight.w500,
                    color: valueColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CourseChip extends StatelessWidget {
  final String courseName;

  const _CourseChip({required this.courseName});

  IconData _courseIcon(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('bharatanatyam') || lower.contains('dance')) {
      return Icons.sports_gymnastics;
    }
    if (lower.contains('vocal') || lower.contains('music') ||
        lower.contains('western')) {
      return Icons.music_note;
    }
    if (lower.contains('veena') || lower.contains('instrument')) {
      return Icons.piano;
    }
    if (lower.contains('drawing') || lower.contains('art')) {
      return Icons.palette;
    }
    if (lower.contains('abacus') || lower.contains('math')) {
      return Icons.calculate;
    }
    if (lower.contains('phonics') || lower.contains('language')) {
      return Icons.abc;
    }
    return Icons.school;
  }

  @override
  Widget build(BuildContext context) {
    final color = AppColors.getCourseColor(courseName);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(_courseIcon(courseName), size: 20, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              courseName,
              style: AppTextStyles.labelLarge.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Icon(
            Icons.chevron_right,
            color: color.withValues(alpha: 0.5),
          ),
        ],
      ),
    );
  }
}

class _EmptyCoursesCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.info.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(
            Icons.library_books_outlined,
            size: 40,
            color: AppColors.info.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 8),
          Text(
            'No courses enrolled yet',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
