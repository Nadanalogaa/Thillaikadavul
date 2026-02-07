import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../di/injection_container.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_state.dart';
import '../../bloc/batch/batch_bloc.dart';
import '../../bloc/batch/batch_event.dart';
import '../../bloc/dashboard/dashboard_bloc.dart';
import '../../bloc/dashboard/dashboard_event.dart';
import '../../bloc/fee/fee_bloc.dart';
import '../../bloc/fee/fee_event.dart';
import 'admin_dashboard_screen.dart';
import 'batches/batch_list_screen.dart';
import 'fees/fee_management_screen.dart';
import 'users/user_list_screen.dart';

class AdminShellScreen extends StatefulWidget {
  const AdminShellScreen({super.key});

  @override
  State<AdminShellScreen> createState() => _AdminShellScreenState();
}

class _AdminShellScreenState extends State<AdminShellScreen> {
  int _currentIndex = 0;

  // Create BLoCs once in state so they survive rebuilds
  late final DashboardBloc _dashboardBloc;
  late final BatchBloc _batchBloc;
  late final FeeBloc _feeBloc;

  @override
  void initState() {
    super.initState();
    _dashboardBloc = sl<DashboardBloc>()..add(LoadDashboardStats());
    _batchBloc = sl<BatchBloc>()..add(LoadBatches());
    _feeBloc = sl<FeeBloc>()..add(LoadFeeStructures());
  }

  @override
  void dispose() {
    _dashboardBloc.close();
    _batchBloc.close();
    _feeBloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<DashboardBloc>.value(value: _dashboardBloc),
        BlocProvider<BatchBloc>.value(value: _batchBloc),
        BlocProvider<FeeBloc>.value(value: _feeBloc),
      ],
      child: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, authState) {
          final user = authState is AuthAuthenticated ? authState.user : null;
          final isSuperAdmin = user?.isSuperAdmin == true;

          return Scaffold(
            body: IndexedStack(
              index: _currentIndex,
              children: [
                const AdminDashboardScreen(),
                const UserListScreen(),
                const BatchListScreen(),
                const FeeManagementScreen(),
                _MoreMenuScreen(isSuperAdmin: isSuperAdmin),
              ],
            ),
            bottomNavigationBar: NavigationBar(
              selectedIndex: _currentIndex,
              onDestinationSelected: (index) {
                setState(() => _currentIndex = index);
              },
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.dashboard_outlined),
                  selectedIcon: Icon(Icons.dashboard),
                  label: 'Dashboard',
                ),
                NavigationDestination(
                  icon: Icon(Icons.people_outlined),
                  selectedIcon: Icon(Icons.people),
                  label: 'Users',
                ),
                NavigationDestination(
                  icon: Icon(Icons.group_work_outlined),
                  selectedIcon: Icon(Icons.group_work),
                  label: 'Batches',
                ),
                NavigationDestination(
                  icon: Icon(Icons.payments_outlined),
                  selectedIcon: Icon(Icons.payments),
                  label: 'Fees',
                ),
                NavigationDestination(
                  icon: Icon(Icons.more_horiz),
                  selectedIcon: Icon(Icons.more_horiz),
                  label: 'More',
                ),
              ],
            ),
          );
        },
      ),
    );
  }

}

class _MoreMenuScreen extends StatelessWidget {
  final bool isSuperAdmin;

  const _MoreMenuScreen({required this.isSuperAdmin});

  @override
  Widget build(BuildContext context) {
    final menuItems = <_MenuItem>[
      _MenuItem(
        icon: Icons.menu_book,
        title: 'Courses',
        subtitle: 'Manage courses',
        onTap: () => context.push('/admin/courses'),
      ),
      _MenuItem(
        icon: Icons.event,
        title: 'Events',
        subtitle: 'Manage events',
        onTap: () => context.push('/admin/events'),
      ),
      _MenuItem(
        icon: Icons.campaign,
        title: 'Notices',
        subtitle: 'Announcements',
        onTap: () => context.push('/admin/notices'),
      ),
      _MenuItem(
        icon: Icons.auto_stories,
        title: 'Materials',
        subtitle: 'Study materials',
        onTap: () => context.push('/admin/materials'),
      ),
      _MenuItem(
        icon: Icons.quiz,
        title: 'Exams',
        subtitle: 'Grade exams',
        onTap: () => context.push('/admin/exams'),
      ),
      _MenuItem(
        icon: Icons.calendar_today,
        title: 'Demo Bookings',
        subtitle: 'Trial classes',
        onTap: () => context.push('/admin/demos'),
      ),
      if (isSuperAdmin) ...[
        _MenuItem(
          icon: Icons.location_on,
          title: 'Locations',
          subtitle: 'Branches',
          onTap: () => context.push('/admin/locations'),
        ),
        _MenuItem(
          icon: Icons.account_balance_wallet,
          title: 'Salary',
          subtitle: 'Staff payments',
          onTap: () => context.push('/admin/salary'),
        ),
      ],
      _MenuItem(
        icon: Icons.delete_outline,
        title: 'Trash',
        subtitle: 'Deleted users',
        onTap: () => context.push('/admin/trash'),
      ),
      _MenuItem(
        icon: Icons.settings,
        title: 'Settings',
        subtitle: 'App settings',
        onTap: () => context.push('/admin/settings'),
      ),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.95,
        ),
        itemCount: menuItems.length,
        itemBuilder: (context, index) {
          final item = menuItems[index];
          return _MoreMenuCard(item: item);
        },
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _MenuItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });
}

class _MoreMenuCard extends StatelessWidget {
  final _MenuItem item;

  const _MoreMenuCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: item.onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(item.icon, color: AppColors.primary, size: 24),
              ),
              const SizedBox(height: 8),
              Text(
                item.title,
                style: AppTextStyles.labelSmall,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                item.subtitle,
                style: AppTextStyles.caption.copyWith(fontSize: 10),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
