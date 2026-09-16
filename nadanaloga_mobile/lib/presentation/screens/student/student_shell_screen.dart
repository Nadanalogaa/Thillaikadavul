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
import 'student_change_password_screen.dart';
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

    // Use provided studentId (when viewing a specific child) or fall back to the
    // first linked child, then to the logged-in user's own id. This covers a pure
    // student, a parent, and a teacher-who-is-also-a-parent — anyone with children.
    final students = authState.user.students ?? [];
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
        // The household behind this login: every student sharing the phone
        // (children + the adult if she learns) and the teacher role if any.
        final profiles = user?.profiles ?? const <ProfileModel>[];
        final householdStudents =
            profiles.where((p) => p.role == 'Student').toList();
        final hasTeacherRole =
            profiles.any((p) => p.role == 'Teacher' && !p.isChild);
        // Legacy parent_id children — still what the "Add student" action uses.
        final students = user?.students ?? [];
        final hasChildren = students.isNotEmpty;
        // Show the member strip whenever there is more than one thing to open.
        final showStrip = householdStudents.length > 1 || hasTeacherRole;

        // Default to the first household student: a parent's own row is not a
        // student, so falling back to user.id would open an empty dashboard.
        final firstStudent =
            householdStudents.isNotEmpty ? householdStudents.first : null;
        final currentStudent = widget.student ??
            (firstStudent != null
                ? UserModel(
                    id: firstStudent.id,
                    name: firstStudent.name,
                    email: '',
                    role: 'Student',
                    photoUrl: firstStudent.photoUrl,
                    courses: firstStudent.courses,
                  )
                : (students.isNotEmpty ? students[0] : null));
        final currentStudentId = widget.studentId ?? currentStudent?.id ?? user?.id;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Dashboard'),
            backgroundColor: AppColors.studentAccent,
            automaticallyImplyLeading: false,
            // Show a back arrow only when this shell was pushed (e.g. a teacher
            // opening a child's dashboard from their own). A parent/student who
            // landed here as their home has nothing to pop, so no arrow shows.
            leading: Navigator.of(context).canPop()
                ? BackButton(color: Colors.white, onPressed: () => context.pop())
                : null,
            actions: [
              if (hasChildren)
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
              // Household member strip below app bar (students + Teaching)
              if (showStrip)
                Container(
                  margin: const EdgeInsets.fromLTRB(12, 10, 12, 0),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.studentAccent.withValues(alpha: 0.15),
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                    child: SizedBox(
                      height: 56,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: householdStudents.length + (hasTeacherRole ? 1 : 0),
                        itemBuilder: (context, index) {
                          // First chip is "Teaching" when this adult also teaches.
                          final isTeachingChip = hasTeacherRole && index == 0;
                          final ProfileModel? p = isTeachingChip
                              ? null
                              : householdStudents[index - (hasTeacherRole ? 1 : 0)];
                          final isSelected = !isTeachingChip && p!.id == currentStudentId;
                          final label = isTeachingChip ? 'Teaching' : p!.name;
                          final icon = isTeachingChip
                              ? Icons.school
                              : (p!.isChild ? Icons.child_care : Icons.person);

                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    icon,
                                    size: 16,
                                    color: isSelected
                                        ? AppColors.studentAccent
                                        : AppColors.textSecondary,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(label),
                                ],
                              ),
                              selected: isSelected,
                              onSelected: (_) {
                                if (isTeachingChip) {
                                  context.go('/teacher');
                                  return;
                                }
                                if (!isSelected) {
                                  final sp = p!;
                                  context.go('/student', extra: {
                                    'studentId': sp.id,
                                    'student': UserModel(
                                      id: sp.id,
                                      name: sp.name,
                                      email: '',
                                      role: 'Student',
                                      photoUrl: sp.photoUrl,
                                      courses: sp.courses,
                                    ),
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
    // Only real, working destinations. Courses/Events/Notices/Materials/Exams
    // are shown inline on the dashboard, so they don't belong here as well.
    final menuItems = <_MenuItem>[
      _MenuItem(
        icon: Icons.notifications_outlined,
        title: 'Notifications',
        subtitle: 'View all announcements',
        onTap: () => context.push('/student/notifications'),
      ),
      _MenuItem(
        icon: Icons.lock_reset,
        title: 'Change Password',
        subtitle: 'Update your password',
        onTap: () {
          final id = user?.id;
          if (id == null) return;
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => StudentChangePasswordScreen(userId: id),
            ),
          );
        },
      ),
      _MenuItem(
        icon: Icons.logout,
        title: 'Log out',
        subtitle: 'Sign out of your account',
        onTap: () => context.read<AuthBloc>().add(AuthLogoutRequested()),
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('More'),
        backgroundColor: AppColors.studentAccent,
      ),
      body: ListView.separated(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: menuItems.length,
        separatorBuilder: (_, __) =>
            const Divider(height: 1, indent: 72, endIndent: 16),
        itemBuilder: (context, index) {
          final item = menuItems[index];
          final isLogout = item.title == 'Log out';
          final color = isLogout ? AppColors.error : AppColors.studentAccent;
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: color.withValues(alpha: 0.12),
              child: Icon(item.icon, color: color),
            ),
            title: Text(item.title, style: AppTextStyles.labelLarge),
            subtitle: Text(item.subtitle,
                style: AppTextStyles.caption
                    .copyWith(color: AppColors.textSecondary)),
            trailing: isLogout
                ? null
                : const Icon(Icons.chevron_right, color: AppColors.textSecondary),
            onTap: item.onTap,
          );
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

