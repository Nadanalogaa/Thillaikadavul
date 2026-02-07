import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/invoice_model.dart';
import '../../../di/injection_container.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_state.dart';
import 'student_dashboard_screen.dart';
import 'student_profile_screen.dart';
import 'student_batches_screen.dart';
import 'student_fees_screen.dart';

class StudentShellScreen extends StatefulWidget {
  const StudentShellScreen({super.key});

  @override
  State<StudentShellScreen> createState() => _StudentShellScreenState();
}

class _StudentShellScreenState extends State<StudentShellScreen> {
  int _currentIndex = 0;

  // Shared data that will be loaded once and passed to child screens
  List<BatchModel> _batches = [];
  List<InvoiceModel> _invoices = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadStudentData();
  }

  Future<void> _loadStudentData() async {
    final authState = context.read<AuthBloc>().state;
    if (authState is! AuthAuthenticated) return;

    final userId = authState.user.id;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final apiClient = sl<ApiClient>();

      // Load batches and invoices in parallel
      final results = await Future.wait([
        apiClient.getBatches(),
        apiClient.getInvoices(),
      ]);

      if (!mounted) return;

      // Filter batches where student is enrolled
      final batchesResponse = results[0];
      if (batchesResponse.statusCode == 200 && batchesResponse.data is List) {
        final allBatches = (batchesResponse.data as List)
            .map((b) => BatchModel.fromJson(b))
            .toList();
        _batches = allBatches
            .where((b) => b.allStudentIds.contains(userId))
            .toList();
      }

      // Filter invoices for this student
      final invoicesResponse = results[1];
      if (invoicesResponse.statusCode == 200 && invoicesResponse.data is List) {
        final allInvoices = (invoicesResponse.data as List)
            .map((i) => InvoiceModel.fromJson(i))
            .toList();
        _invoices = allInvoices
            .where((i) => i.studentId == userId)
            .toList();
      }

      setState(() => _isLoading = false);
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = 'Failed to load data: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final user = authState is AuthAuthenticated ? authState.user : null;

        return Scaffold(
          body: IndexedStack(
            index: _currentIndex,
            children: [
              StudentDashboardScreen(
                batches: _batches,
                invoices: _invoices,
                isLoading: _isLoading,
                error: _error,
                onRefresh: _loadStudentData,
              ),
              const StudentProfileScreen(),
              StudentBatchesScreen(
                batches: _batches,
                isLoading: _isLoading,
                onRefresh: _loadStudentData,
              ),
              StudentFeesScreen(
                invoices: _invoices,
                isLoading: _isLoading,
                onRefresh: _loadStudentData,
              ),
              _StudentMoreMenuScreen(user: user),
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
                icon: Icon(Icons.person_outlined),
                selectedIcon: Icon(Icons.person),
                label: 'Profile',
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
    );
  }
}

class _StudentMoreMenuScreen extends StatelessWidget {
  final dynamic user;

  const _StudentMoreMenuScreen({this.user});

  @override
  Widget build(BuildContext context) {
    final menuItems = <_MenuItem>[
      _MenuItem(
        icon: Icons.menu_book,
        title: 'Courses',
        subtitle: 'View all courses',
        onTap: () => _showComingSoon(context, 'Courses'),
      ),
      _MenuItem(
        icon: Icons.event,
        title: 'Events',
        subtitle: 'Upcoming events',
        onTap: () => _showComingSoon(context, 'Events'),
      ),
      _MenuItem(
        icon: Icons.campaign,
        title: 'Notices',
        subtitle: 'Announcements',
        onTap: () => _showComingSoon(context, 'Notices'),
      ),
      _MenuItem(
        icon: Icons.auto_stories,
        title: 'Materials',
        subtitle: 'Study materials',
        onTap: () => _showComingSoon(context, 'Materials'),
      ),
      _MenuItem(
        icon: Icons.quiz,
        title: 'Exams',
        subtitle: 'Grade exams',
        onTap: () => _showComingSoon(context, 'Exams'),
      ),
      _MenuItem(
        icon: Icons.notifications,
        title: 'Notifications',
        subtitle: 'View all',
        onTap: () => _showComingSoon(context, 'Notifications'),
      ),
      _MenuItem(
        icon: Icons.settings,
        title: 'Settings',
        subtitle: 'App settings',
        onTap: () => _showComingSoon(context, 'Settings'),
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('More'),
        backgroundColor: AppColors.studentAccent,
      ),
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

  void _showComingSoon(BuildContext context, String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature coming soon!'),
        backgroundColor: AppColors.info,
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
                  color: AppColors.studentAccent.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(item.icon, color: AppColors.studentAccent, size: 24),
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
