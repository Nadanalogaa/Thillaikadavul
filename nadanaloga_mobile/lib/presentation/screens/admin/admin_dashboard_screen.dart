import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../bloc/auth/auth_state.dart';
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
              context
                  .read<DashboardBloc>()
                  .add(RefreshDashboardStats());
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Greeting
                  Text(
                    'Welcome, ${user?.name ?? 'Admin'}',
                    style: AppTextStyles.h2,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.isSuperAdmin == true
                        ? 'Super Admin'
                        : 'Administrator',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
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
                                const Icon(Icons.error_outline,
                                    color: AppColors.error),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(state.message,
                                      style: AppTextStyles.bodyMedium),
                                ),
                                TextButton(
                                  onPressed: () => context
                                      .read<DashboardBloc>()
                                      .add(LoadDashboardStats()),
                                  child: const Text('Retry'),
                                ),
                              ],
                            ),
                          ),
                        );
                      }

                      final stats = state is DashboardLoaded
                          ? state.stats
                          : null;

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
                          ),
                          StatCard(
                            title: 'Teachers',
                            value: '${stats?.teachers ?? '--'}',
                            icon: Icons.person,
                            color: AppColors.teacherAccent,
                          ),
                          StatCard(
                            title: 'Batches',
                            value: '${stats?.batches ?? '--'}',
                            icon: Icons.group_work,
                            color: AppColors.primary,
                          ),
                          StatCard(
                            title: 'Courses',
                            value: '${stats?.courses ?? '--'}',
                            icon: Icons.menu_book,
                            color: AppColors.secondary,
                          ),
                          if (user?.isSuperAdmin == true)
                            StatCard(
                              title: 'Locations',
                              value: '${stats?.locations ?? '--'}',
                              icon: Icons.location_on,
                              color: AppColors.info,
                            ),
                          StatCard(
                            title: 'Pending Fees',
                            value: '${stats?.pendingInvoices ?? '--'}',
                            icon: Icons.payments,
                            color: AppColors.warning,
                          ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 24),

                  // Quick Actions
                  Text('Quick Actions', style: AppTextStyles.h3),
                  const SizedBox(height: 12),
                  _QuickActionCard(
                    icon: Icons.person_add,
                    title: 'Add Student',
                    subtitle: 'Register a new student',
                    onTap: () => context.push('/admin/users/add'),
                  ),
                  _QuickActionCard(
                    icon: Icons.group_add,
                    title: 'Create Batch',
                    subtitle: 'Setup a new batch',
                    onTap: () => context.push('/admin/batches/add'),
                  ),
                  _QuickActionCard(
                    icon: Icons.event,
                    title: 'Add Event',
                    subtitle: 'Create a new event',
                    onTap: () => context.push('/admin/events/add'),
                  ),
                  if (user?.isSuperAdmin == true)
                    _QuickActionCard(
                      icon: Icons.admin_panel_settings,
                      title: 'Manage Admins',
                      subtitle: 'Promote or demote users',
                      onTap: () => context.push('/admin/users/add'),
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
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppColors.primary),
        ),
        title: Text(title, style: AppTextStyles.labelLarge),
        subtitle: Text(subtitle, style: AppTextStyles.caption),
        trailing:
            const Icon(Icons.chevron_right, color: AppColors.textSecondary),
        onTap: onTap,
      ),
    );
  }
}
