import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../bloc/auth/auth_state.dart';
import '../../bloc/batch/batch_bloc.dart';
import '../../bloc/batch/batch_event.dart';
import '../../bloc/dashboard/dashboard_bloc.dart';
import '../../bloc/dashboard/dashboard_event.dart';
import '../../bloc/dashboard/dashboard_state.dart';
import '../../widgets/stat_card.dart';

class AdminDashboardScreen extends StatelessWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final user = authState is AuthAuthenticated ? authState.user : null;
        return Scaffold(
          appBar: AppBar(
            title: const Text('Dashboard'),
            automaticallyImplyLeading: false,
            actions: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                onPressed: () => context.push('/admin/notifications'),
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
              context.read<DashboardBloc>().add(RefreshDashboardStats());
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Greeting with Animation
                  Text(
                    'Welcome, ${user?.name ?? 'Admin'}',
                    style: AppTextStyles.h2,
                  ).animate().fadeIn(duration: 400.ms).slideX(begin: -0.1, end: 0),
                  const SizedBox(height: 4),
                  Text(
                    user?.isSuperAdmin == true ? 'Super Admin' : 'Administrator',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ).animate(delay: 100.ms).fadeIn(),
                  const SizedBox(height: 24),

                  // Stats Grid
                  BlocBuilder<DashboardBloc, DashboardState>(
                    builder: (context, state) {
                      if (state is DashboardLoading) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(32),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }

                      if (state is DashboardError) {
                        return Card(
                          color: AppColors.error.withValues(alpha: 0.1),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline, color: AppColors.error),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(state.message, style: AppTextStyles.bodyMedium),
                                ),
                                TextButton(
                                  onPressed: () =>
                                      context.read<DashboardBloc>().add(LoadDashboardStats()),
                                  child: const Text('Retry'),
                                ),
                              ],
                            ),
                          ),
                        );
                      }

                      final stats = state is DashboardLoaded ? state.stats : null;

                      return GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        mainAxisSpacing: 10,
                        crossAxisSpacing: 10,
                        childAspectRatio: 2.2,
                        children: [
                          StatCard(
                            title: 'Students',
                            value: '${stats?.students ?? '--'}',
                            icon: Icons.school,
                            color: AppColors.studentAccent,
                            animationIndex: 0,
                            onTap: () => context.push('/admin/drilldown/students'),
                          ),
                          StatCard(
                            title: 'Teachers',
                            value: '${stats?.teachers ?? '--'}',
                            icon: Icons.person,
                            color: AppColors.teacherAccent,
                            animationIndex: 1,
                            onTap: () => context.push('/admin/drilldown/teachers'),
                          ),
                          StatCard(
                            title: 'Batches',
                            value: '${stats?.batches ?? '--'}',
                            icon: Icons.group_work,
                            color: AppColors.primary,
                            animationIndex: 2,
                            onTap: () => context.push('/admin/drilldown/batches'),
                          ),
                          StatCard(
                            title: 'Courses',
                            value: '${stats?.courses ?? '--'}',
                            icon: Icons.menu_book,
                            color: AppColors.secondary,
                            animationIndex: 3,
                            onTap: () => context.push('/admin/courses'),
                          ),
                          if (user?.isSuperAdmin == true)
                            StatCard(
                              title: 'Locations',
                              value: '${stats?.locations ?? '--'}',
                              icon: Icons.location_on,
                              color: AppColors.info,
                              animationIndex: 4,
                              onTap: () => context.push('/admin/locations'),
                            ),
                          StatCard(
                            title: 'Pending Fees',
                            value: '${stats?.pendingInvoices ?? '--'}',
                            icon: Icons.payments,
                            color: AppColors.warning,
                            animationIndex: 5,
                            onTap: () => context.push('/admin/drilldown/pending-fees'),
                          ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 24),

                  // Quick Actions
                  Text('Quick Actions', style: AppTextStyles.h3)
                      .animate(delay: 400.ms)
                      .fadeIn(),
                  const SizedBox(height: 12),
                  _QuickActionCard(
                    icon: Icons.person_add,
                    title: 'Add Student',
                    subtitle: 'Register a new student',
                    color: AppColors.studentAccent,
                    onTap: () => context.push('/admin/users/add'),
                    index: 0,
                  ),
                  _QuickActionCard(
                    icon: Icons.group_add,
                    title: 'Create Batch',
                    subtitle: 'Setup a new batch',
                    color: AppColors.primary,
                    onTap: () async {
                      final created = await context.push<bool>('/admin/batches/add');
                      if (created == true && context.mounted) {
                        context.read<BatchBloc>().add(LoadBatches());
                      }
                    },
                    index: 1,
                  ),
                  _QuickActionCard(
                    icon: Icons.event,
                    title: 'Add Event',
                    subtitle: 'Create a new event',
                    color: AppColors.info,
                    onTap: () => context.push('/admin/events/add'),
                    index: 2,
                  ),
                  _QuickActionCard(
                    icon: Icons.receipt_long,
                    title: 'Create Invoice',
                    subtitle: 'Generate fee invoice',
                    color: AppColors.success,
                    onTap: () => context.push('/admin/fees/invoices/add'),
                    index: 3,
                  ),
                  if (user?.isSuperAdmin == true)
                    _QuickActionCard(
                      icon: Icons.admin_panel_settings,
                      title: 'Manage Admins',
                      subtitle: 'Promote or demote users',
                      color: AppColors.warning,
                      onTap: () => context.push('/admin/users/add'),
                      index: 4,
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;
  final int index;

  const _QuickActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
    required this.index,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: color.withOpacity(0.15)),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color),
        ),
        title: Text(title, style: AppTextStyles.labelLarge),
        subtitle: Text(subtitle, style: AppTextStyles.caption),
        trailing: Icon(Icons.chevron_right, color: color.withOpacity(0.5)),
        onTap: onTap,
      ),
    )
        .animate(delay: Duration(milliseconds: 450 + (index * 50)))
        .fadeIn(duration: 300.ms)
        .slideX(begin: 0.05, end: 0);
  }
}
