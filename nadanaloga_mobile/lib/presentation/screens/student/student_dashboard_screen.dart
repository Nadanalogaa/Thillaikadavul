import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/course_model.dart';
import '../../../data/models/invoice_model.dart';
import '../../../data/models/location_model.dart';
import '../../../di/injection_container.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../bloc/auth/auth_state.dart';
import '../../widgets/stat_card.dart';

class StudentDashboardScreen extends StatefulWidget {
  final List<BatchModel> batches;
  final List<CourseModel> courses;
  final List<InvoiceModel> invoices;
  final bool isLoading;
  final String? error;
  final VoidCallback onRefresh;

  const StudentDashboardScreen({
    super.key,
    required this.batches,
    required this.courses,
    required this.invoices,
    required this.isLoading,
    this.error,
    required this.onRefresh,
  });

  @override
  State<StudentDashboardScreen> createState() => _StudentDashboardScreenState();
}

class _StudentDashboardScreenState extends State<StudentDashboardScreen> {
  LocationModel? _location;

  @override
  void initState() {
    super.initState();
    _loadLocationIfNeeded();
  }

  Future<void> _loadLocationIfNeeded() async {
    final state = context.read<AuthBloc>().state;
    if (state is AuthAuthenticated && state.user.preferredLocationId != null) {
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
    }
  }

  int get _pendingFees =>
      widget.invoices.where((i) => i.status == 'pending').length;

  int get _overdueFees =>
      widget.invoices.where((i) => i.status == 'overdue').length;

  double get _totalPendingAmount => widget.invoices
      .where((i) => i.status == 'pending' || i.status == 'overdue')
      .fold(0.0, (sum, i) => sum + (i.amount ?? 0));

  bool get _hasFeesDueThisMonth {
    final now = DateTime.now();
    return widget.invoices.any((i) {
      if (i.status != 'pending') return false;
      if (i.dueDate == null) return true;
      try {
        final dueDate = DateTime.parse(i.dueDate!);
        return dueDate.month == now.month && dueDate.year == now.year;
      } catch (_) {
        return false;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        final user = state is AuthAuthenticated ? state.user : null;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Dashboard'),
            backgroundColor: AppColors.studentAccent,
            automaticallyImplyLeading: false,
            actions: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                onPressed: () => context.push('/student/notifications'),
              ),
              IconButton(
                icon: const Icon(Icons.logout),
                onPressed: () {
                  context.read<AuthBloc>().add(AuthLogoutRequested());
                },
              ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: () async {
              widget.onRefresh();
              await _loadLocationIfNeeded();
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Welcome Header with Animation
                  Text(
                    'Welcome, ${user?.name ?? 'Student'}',
                    style: AppTextStyles.h2,
                  ).animate().fadeIn(duration: 400.ms).slideX(begin: -0.1, end: 0),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (user?.userId != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.studentAccent.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'ID: ${user!.userId}',
                            style: AppTextStyles.labelSmall.copyWith(
                              color: AppColors.studentAccent,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      if (user?.classPreference != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.info.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            user!.classPreference!,
                            style: AppTextStyles.labelSmall.copyWith(
                              color: AppColors.info,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ).animate(delay: 100.ms).fadeIn(),
                  const SizedBox(height: 24),

                  // Fee Alert Banner (if dues)
                  if (_hasFeesDueThisMonth || _overdueFees > 0)
                    _FeeAlertBanner(
                      pendingAmount: _totalPendingAmount,
                      isOverdue: _overdueFees > 0,
                    ).animate(delay: 150.ms).fadeIn().slideY(begin: -0.1, end: 0),

                  if (_hasFeesDueThisMonth || _overdueFees > 0)
                    const SizedBox(height: 16),

                  // Stats Grid
                  if (widget.isLoading)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  else if (widget.error != null)
                    Card(
                      color: AppColors.error.withValues(alpha: 0.1),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: AppColors.error),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(widget.error!, style: AppTextStyles.bodyMedium),
                            ),
                            TextButton(
                              onPressed: widget.onRefresh,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      childAspectRatio: 2.2,
                      children: [
                        StatCard(
                          title: 'My Batches',
                          value: '${widget.batches.length}',
                          icon: Icons.group_work,
                          color: AppColors.primary,
                          animationIndex: 0,
                        ),
                        StatCard(
                          title: 'Courses',
                          value: '${user?.courses.length ?? 0}',
                          icon: Icons.menu_book,
                          color: AppColors.secondary,
                          animationIndex: 1,
                        ),
                        StatCard(
                          title: 'Pending Fees',
                          value: '$_pendingFees',
                          icon: Icons.receipt_long,
                          color: _pendingFees > 0 ? AppColors.warning : AppColors.success,
                          animationIndex: 2,
                        ),
                        if (_overdueFees > 0)
                          StatCard(
                            title: 'Overdue',
                            value: '$_overdueFees',
                            icon: Icons.warning_amber,
                            color: AppColors.error,
                            animationIndex: 3,
                          ),
                      ],
                    ),
                  const SizedBox(height: 24),

                  // Branch Info
                  if (_location != null) ...[
                    Text('Your Branch', style: AppTextStyles.h4)
                        .animate(delay: 300.ms)
                        .fadeIn(),
                    const SizedBox(height: 8),
                    _BranchCard(location: _location!),
                    const SizedBox(height: 24),
                  ],

                  // Enrolled Courses Section
                  if (user != null && user.courses.isNotEmpty) ...[
                    Text('Enrolled Courses', style: AppTextStyles.h4)
                        .animate(delay: 350.ms)
                        .fadeIn(),
                    const SizedBox(height: 12),
                    ...user.courses.asMap().entries.map((entry) {
                      final index = entry.key;
                      final courseName = entry.value;
                      final courseId = widget.courses
                          .firstWhere(
                            (c) => c.name.toLowerCase() == courseName.toLowerCase(),
                            orElse: () => const CourseModel(id: 0, name: ''),
                          )
                          .id;
                      final batchForCourse = widget.batches.firstWhere(
                        (b) =>
                            (courseId != 0 && b.courseId == courseId) ||
                            b.batchName
                                .toLowerCase()
                                .contains(courseName.toLowerCase()),
                        orElse: () => const BatchModel(id: 0, batchName: ''),
                      );
                      return _CourseCard(
                        courseName: courseName,
                        batch: batchForCourse.id != 0 ? batchForCourse : null,
                        index: index,
                      );
                    }),
                  ] else if (user != null && user.courses.isEmpty) ...[
                    _EmptyCoursesCard(),
                  ],

                  const SizedBox(height: 24),

                  // Upcoming Classes / Schedule Preview
                  if (widget.batches.isNotEmpty) ...[
                    Text('Your Schedule', style: AppTextStyles.h4)
                        .animate(delay: 450.ms)
                        .fadeIn(),
                    const SizedBox(height: 12),
                    ...widget.batches.take(3).map((batch) => _ScheduleCard(batch: batch)),
                  ],

                  // Info Card
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.info.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.info_outline,
                            size: 18, color: AppColors.info),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Fees are due on the 1st of every month. Please pay on time to avoid late fees.',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ).animate(delay: 500.ms).fadeIn(),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _FeeAlertBanner extends StatelessWidget {
  final double pendingAmount;
  final bool isOverdue;

  const _FeeAlertBanner({
    required this.pendingAmount,
    required this.isOverdue,
  });

  @override
  Widget build(BuildContext context) {
    final color = isOverdue ? AppColors.error : AppColors.warning;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            color.withValues(alpha: 0.15),
            color.withValues(alpha: 0.08),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isOverdue ? Icons.warning_amber_rounded : Icons.payments_outlined,
              color: color,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isOverdue ? 'Fees Overdue!' : 'Fees Due',
                  style: AppTextStyles.labelLarge.copyWith(
                    color: color,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Total: ₹${pendingAmount.toStringAsFixed(0)}',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right,
            color: color.withValues(alpha: 0.6),
          ),
        ],
      ),
    );
  }
}

class _BranchCard extends StatelessWidget {
  final LocationModel location;

  const _BranchCard({required this.location});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.info.withValues(alpha: 0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.info.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.location_city, color: AppColors.info, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    location.name,
                    style: AppTextStyles.labelLarge.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (location.city != null)
                    Text(
                      location.city!,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate(delay: 320.ms).fadeIn().slideX(begin: 0.05, end: 0);
  }
}

class _CourseCard extends StatelessWidget {
  final String courseName;
  final BatchModel? batch;
  final int index;

  const _CourseCard({
    required this.courseName,
    this.batch,
    required this.index,
  });

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
    final hasAssignment = batch != null;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: color.withValues(alpha: 0.2)),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(_courseIcon(courseName), color: color, size: 24),
        ),
        title: Text(
          courseName,
          style: AppTextStyles.bodyLarge.copyWith(
            fontWeight: FontWeight.w500,
          ),
        ),
        subtitle: Text(
          hasAssignment
              ? 'Batch: ${batch!.batchName}'
              : 'Batch assignment pending',
          style: AppTextStyles.caption.copyWith(
            color: hasAssignment ? AppColors.success : AppColors.warning,
          ),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: hasAssignment
                ? AppColors.success.withValues(alpha: 0.1)
                : AppColors.warning.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            hasAssignment ? 'Active' : 'Pending',
            style: AppTextStyles.labelSmall.copyWith(
              color: hasAssignment ? AppColors.success : AppColors.warning,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    )
        .animate(delay: Duration(milliseconds: 370 + (index * 50)))
        .fadeIn(duration: 300.ms)
        .slideX(begin: 0.05, end: 0);
  }
}

class _ScheduleCard extends StatelessWidget {
  final BatchModel batch;

  const _ScheduleCard({required this.batch});

  String _formatSchedule(List<BatchScheduleEntry> schedule) {
    if (schedule.isEmpty) return 'Schedule not set';
    return schedule
        .where((s) => s.timing != null && s.timing!.isNotEmpty)
        .map((s) => s.timing!)
        .take(2)
        .join(', ');
  }

  @override
  Widget build(BuildContext context) {
    final scheduleText = _formatSchedule(batch.schedule);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.schedule, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    batch.batchName,
                    style: AppTextStyles.labelLarge.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    scheduleText,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.info.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                batch.mode ?? 'N/A',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.info,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyCoursesCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Icon(
              Icons.library_books_outlined,
              size: 48,
              color: AppColors.studentAccent.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 12),
            Text(
              'No Courses Selected',
              style: AppTextStyles.h3,
            ),
            const SizedBox(height: 8),
            Text(
              'Contact the admin to get enrolled in courses.',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
