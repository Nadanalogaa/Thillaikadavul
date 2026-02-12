import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/course_model.dart';
import '../../../data/models/invoice_model.dart';
import '../../../data/models/user_model.dart';
import '../../../di/injection_container.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../bloc/auth/auth_state.dart';
import 'student_dashboard_screen.dart';
import 'student_profile_screen.dart';
import 'student_batches_screen.dart';
import 'student_fees_screen.dart';

class StudentShellScreen extends StatefulWidget {
  final int? studentId; // For parents viewing child
  final UserModel? student; // Student data

  const StudentShellScreen({
    super.key,
    this.studentId,
    this.student,
  });

  @override
  State<StudentShellScreen> createState() => _StudentShellScreenState();
}

class _StudentShellScreenState extends State<StudentShellScreen> {
  int _currentIndex = 0;
  int? _pendingFeeInvoiceId;

  // Shared data that will be loaded once and passed to child screens
  List<BatchModel> _batches = [];
  List<CourseModel> _courses = [];
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

    // Use provided studentId (for parents) or current user's id (for students)
    // For parents, use first child's ID if no specific student selected
    final isParent = authState.user.role == 'Parent';
    final students = isParent ? (authState.user.students ?? []) : [];
    final userId = widget.studentId ??
                   (students.isNotEmpty ? students[0].id : authState.user.id);
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final apiClient = sl<ApiClient>();

      // Load batches, courses and invoices in parallel
      final results = await Future.wait([
        apiClient.getBatches(),
        apiClient.getCourses(),
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

      // Courses
      final coursesResponse = results[1];
      if (coursesResponse.statusCode == 200 && coursesResponse.data is List) {
        _courses = (coursesResponse.data as List)
            .map((c) => CourseModel.fromJson(c))
            .toList();
      }

      // Filter invoices for this student
      final invoicesResponse = results[2];
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

  void _showAddStudentDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Student'),
        content: const Text(
          'To add a new student to your account, please contact the admin at support@nadanaloga.com or call the academy.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final user = authState is AuthAuthenticated ? authState.user : null;
        final isParent = user?.role == 'Parent';
        final students = isParent ? (user?.students ?? []) : [];

        // Auto-select first child if parent logged in without specific student
        final currentStudent = widget.student ?? (students.isNotEmpty ? students[0] : null);
        final currentStudentId = widget.studentId ?? currentStudent?.id ?? user?.id;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Dashboard'),
            backgroundColor: AppColors.studentAccent,
            automaticallyImplyLeading: false,
            actions: [
              if (isParent && students.isNotEmpty)
                OutlinedButton.icon(
                  onPressed: () => _showAddStudentDialog(context),
                  icon: const Icon(Icons.person_add, size: 18),
                  label: const Text('Add'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white70),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    visualDensity: VisualDensity.compact,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
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
          body: Column(
            children: [
              // Student tabs below app bar
              if (isParent && students.isNotEmpty)
                Container(
                  margin: const EdgeInsets.fromLTRB(12, 10, 12, 0),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.vertical(
                      bottom: Radius.circular(3),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 10,
                        offset: const Offset(0, 6),
                      ),
                    ],
                    border: Border.all(
                      color: AppColors.studentAccent.withValues(alpha: 0.08),
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                    child: SizedBox(
                      height: 56,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: students.length,
                        itemBuilder: (context, index) {
                          final student = students[index];
                          final isSelected = student.id == currentStudentId;
                          final sex = (student.sex ?? '').toLowerCase();
                          final sexIcon = (sex.startsWith('m'))
                              ? Icons.male
                              : (sex.startsWith('f') ? Icons.female : Icons.person);

                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    sexIcon,
                                    size: 16,
                                    color: isSelected
                                        ? AppColors.studentAccent
                                        : AppColors.textSecondary,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(student.name),
                                ],
                              ),
                              selected: isSelected,
                              onSelected: (_) {
                                if (!isSelected) {
                                  context.go('/student', extra: {
                                    'studentId': student.id,
                                    'student': student,
                                  });
                                }
                              },
                              selectedColor: AppColors.studentAccent.withValues(alpha: 0.12),
                              backgroundColor: const Color(0xFFF4F5F7),
                              labelStyle: TextStyle(
                                color: isSelected
                                    ? AppColors.studentAccent
                                    : AppColors.textPrimary,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                fontSize: 14,
                              ),
                              side: BorderSide(
                                color: isSelected
                                    ? AppColors.studentAccent.withValues(alpha: 0.35)
                                    : Colors.transparent,
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ),
              // Main content
              Expanded(child:
                IndexedStack(
                  index: _currentIndex,
                  children: [
                    StudentDashboardScreen(
                      batches: _batches,
                      courses: _courses,
                      invoices: _invoices,
                      isLoading: _isLoading,
                      error: _error,
                      onRefresh: _loadStudentData,
                      student: currentStudent,
                      onOpenFees: (invoiceId) {
                        setState(() {
                          _pendingFeeInvoiceId = invoiceId;
                          _currentIndex = 3;
                        });
                      },
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
                      initialInvoiceToPay: _pendingFeeInvoiceId,
                    ),
                    _StudentMoreMenuScreen(user: user),
                  ],
                ),
              ),
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
