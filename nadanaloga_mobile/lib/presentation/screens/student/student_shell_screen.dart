import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../auth/set_password_sheet.dart';
import '../home/home_dashboard.dart';
import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/course_model.dart';
import '../../../data/models/user_model.dart';
import '../../../di/injection_container.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../bloc/auth/auth_state.dart';
import 'household_fees_screen.dart';
import 'student_profile_screen.dart';
import 'student_batches_screen.dart';
import 'student_courses_screen.dart';
import 'students_profile_screen.dart';
import 'events_list_screen.dart';
import 'notices_list_screen.dart';
import 'book_materials_list_screen.dart';
import 'grade_exams_list_screen.dart';
import 'student_change_password_screen.dart';

/// Home for a household login (students, parents, and a teacher who also has
/// children or learns). Four tabs; the whole family is shown together, so
/// there is no member switcher.
class StudentShellScreen extends StatefulWidget {
  final int? studentId; // A specific student (older deep links)
  final UserModel? student;

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

  // Bumped when a tab is re-entered so it reloads (a payment made in Fees
  // shows on Home, and vice versa).
  int _homeRefresh = 0;
  int _feesRefresh = 0;

  List<BatchModel> _allBatches = [];
  List<CourseModel> _courses = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
    _promptSetPasswordIfNeeded();
  }

  /// Ask a user still on the academy's default password to set their own —
  /// here, on the dashboard they have already landed on, NOT on the login
  /// screen (a sheet opened there is destroyed by go_router's redirect, which
  /// previously logged the user straight back out).
  void _promptSetPasswordIfNeeded() {
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final state = context.read<AuthBloc>().state;
      if (state is! AuthAuthenticated) return;
      if (!state.user.mustChangePassword) return;
      await showSetPasswordSheet(context);
    });
  }

  /// Batches and courses for the Courses tab and More → Batches.
  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final api = sl<ApiClient>();
      final results = await Future.wait([api.getBatches(), api.getCourses()]);
      if (!mounted) return;
      final batches = results[0];
      final courses = results[1];
      setState(() {
        if (batches.statusCode == 200 && batches.data is List) {
          _allBatches = (batches.data as List)
              .whereType<Map>()
              .map((b) => BatchModel.fromJson(Map<String, dynamic>.from(b)))
              .toList();
        }
        if (courses.statusCode == 200 && courses.data is List) {
          _courses = (courses.data as List)
              .whereType<Map>()
              .map((c) => CourseModel.fromJson(Map<String, dynamic>.from(c)))
              .toList();
        }
        _isLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<BatchModel> _batchesOf(int? id) => id == null
      ? const []
      : _allBatches.where((b) => b.allStudentIds.contains(id)).toList();

  void _selectTab(int index) {
    setState(() {
      if (index != _currentIndex) {
        if (index == 0) _homeRefresh++;
        if (index == 2) _feesRefresh++;
      }
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final user = authState is AuthAuthenticated ? authState.user : null;
        // Every student behind this phone number (children + the adult if
        // she learns).
        final householdStudents = (user?.profiles ?? const <ProfileModel>[])
            .where((p) => p.role == 'Student')
            .toList();
        final legacyChildren = user?.students ?? const <UserModel>[];

        // The student the single-student screens (More → Batches, Exams,
        // Materials) use: an explicit one, else the first household student.
        final int? primaryStudentId = widget.studentId ??
            widget.student?.id ??
            (householdStudents.isNotEmpty
                ? householdStudents.first.id
                : (legacyChildren.isNotEmpty ? legacyChildren.first.id : user?.id));
        final primaryCourses = widget.student?.courses ??
            (householdStudents.isNotEmpty
                ? householdStudents.first.courses
                : (user?.courses ?? const <String>[]));

        return Scaffold(
          body: IndexedStack(
            index: _currentIndex,
            children: [
              HomeDashboard(
                accent: AppColors.studentAccent,
                notificationsRoute: '/student/notifications',
                refreshToken: _homeRefresh,
                onOpenCourses: () => _selectTab(1),
              ),
              StudentCoursesScreen(
                registered: primaryCourses,
                batches: _batchesOf(primaryStudentId),
                courses: _courses,
                isLoading: _isLoading,
                onRefresh: _loadData,
                sections: [
                  for (final p in householdStudents)
                    CourseSection(
                      name: p.name,
                      registered: p.courses,
                      batches: _batchesOf(p.id),
                    ),
                ],
              ),
              // The whole family's bills, grouped by student, with Pay and
              // receipts — the same view as the website.
              HouseholdFeesScreen(key: ValueKey(_feesRefresh)),
              _StudentMoreMenuScreen(
                user: user,
                studentId: primaryStudentId,
                batches: _batchesOf(primaryStudentId),
                isLoading: _isLoading,
                onRefresh: _loadData,
              ),
            ],
          ),
          // Four simple tabs; every other web menu lives under "More".
          bottomNavigationBar: NavigationBar(
            selectedIndex: _currentIndex,
            onDestinationSelected: _selectTab,
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home),
                label: 'Home',
              ),
              NavigationDestination(
                icon: Icon(Icons.menu_book_outlined),
                selectedIcon: Icon(Icons.menu_book),
                label: 'Courses',
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
  final int? studentId;
  final List<BatchModel> batches;
  final bool isLoading;
  final VoidCallback onRefresh;

  const _StudentMoreMenuScreen({
    this.user,
    this.studentId,
    this.batches = const [],
    this.isLoading = false,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    // Every web menu that isn't a bottom tab, in the same order as the web
    // sidebar, so both surfaces offer the same things in the same place.
    final menuItems = <_MenuItem>[
      _MenuItem(
        icon: Icons.people_outline,
        title: 'Students Profile',
        subtitle: 'Everyone in your family',
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const StudentsProfileScreen()),
        ),
      ),
      _MenuItem(
        icon: Icons.quiz_outlined,
        title: 'Grade Exams',
        subtitle: 'Exams and syllabus',
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
              builder: (_) => GradeExamsListScreen(studentId: studentId)),
        ),
      ),
      _MenuItem(
        icon: Icons.auto_stories_outlined,
        title: 'Book Materials',
        subtitle: 'Study materials',
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
              builder: (_) => BookMaterialsListScreen(studentId: studentId)),
        ),
      ),
      _MenuItem(
        icon: Icons.event_outlined,
        title: 'Events',
        subtitle: 'Upcoming events',
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const EventsListScreen()),
        ),
      ),
      _MenuItem(
        icon: Icons.campaign_outlined,
        title: 'Notice',
        subtitle: 'Announcements',
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const NoticesListScreen()),
        ),
      ),
      _MenuItem(
        icon: Icons.group_work_outlined,
        title: 'Batches',
        subtitle: 'Your batches and schedule',
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => StudentBatchesScreen(
              batches: batches,
              isLoading: isLoading,
              onRefresh: onRefresh,
            ),
          ),
        ),
      ),
      _MenuItem(
        icon: Icons.person_outline,
        title: 'Profile',
        subtitle: 'Your account details',
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const StudentProfileScreen()),
        ),
      ),
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

