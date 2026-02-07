import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../data/models/user_model.dart';
import '../../../../data/models/course_model.dart';
import '../../../bloc/user_management/user_management_bloc.dart';
import '../../../bloc/user_management/user_management_event.dart';
import '../../../bloc/user_management/user_management_state.dart';
import '../../../bloc/course/course_bloc.dart';
import '../../../bloc/course/course_event.dart';
import '../../../bloc/course/course_state.dart';
import '../../../widgets/empty_state_widget.dart';

class StudentsDrilldownScreen extends StatefulWidget {
  const StudentsDrilldownScreen({super.key});

  @override
  State<StudentsDrilldownScreen> createState() => _StudentsDrilldownScreenState();
}

class _StudentsDrilldownScreenState extends State<StudentsDrilldownScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    context.read<UserManagementBloc>().add(LoadUsers());
    context.read<CourseBloc>().add(LoadCourses());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Students by Course'),
        centerTitle: true,
      ),
      body: BlocBuilder<CourseBloc, CourseState>(
        builder: (context, courseState) {
          return BlocBuilder<UserManagementBloc, UserManagementState>(
            builder: (context, userState) {
              if (courseState is CourseLoading || userState is UserManagementLoading) {
                return const Center(child: CircularProgressIndicator());
              }

              if (courseState is CourseError) {
                return Center(child: Text('Error: ${courseState.message}'));
              }

              final courses = courseState is CourseLoaded ? courseState.courses : <CourseModel>[];
              final users = userState is UserManagementLoaded ? userState.users : <UserModel>[];
              final students = users.where((u) => u.role == 'Student' && !u.isDeleted).toList();

              if (courses.isEmpty) {
                return const EmptyStateWidget(
                  icon: Icons.menu_book_outlined,
                  title: 'No Courses Found',
                  subtitle: 'Add courses to see student distribution',
                );
              }

              // Calculate course-wise counts
              final courseStudentCounts = <String, int>{};
              for (final course in courses) {
                courseStudentCounts[course.name] =
                    students.where((s) => s.courses.contains(course.name)).length;
              }

              // Students not enrolled in any course
              final unassignedCount = students.where((s) => s.courses.isEmpty).length;

              // Filter courses by search
              var displayCourses = courses.toList();
              if (_searchQuery.isNotEmpty) {
                displayCourses = courses
                    .where((c) => c.name.toLowerCase().contains(_searchQuery.toLowerCase()))
                    .toList();
              }

              return RefreshIndicator(
                onRefresh: () async {
                  context.read<UserManagementBloc>().add(LoadUsers());
                  context.read<CourseBloc>().add(LoadCourses());
                },
                child: CustomScrollView(
                  slivers: [
                    // Summary Card
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                        child: _CompactSummaryCard(
                          totalStudents: students.length,
                          totalCourses: courses.length,
                        ).animate().fadeIn(duration: 300.ms),
                      ),
                    ),

                    // Search Bar
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: TextField(
                          controller: _searchController,
                          decoration: InputDecoration(
                            hintText: 'Search courses...',
                            hintStyle: AppTextStyles.bodySmall.copyWith(color: AppColors.textHint),
                            prefixIcon: const Icon(Icons.search, size: 20),
                            suffixIcon: _searchQuery.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear, size: 20),
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() => _searchQuery = '');
                                    },
                                  )
                                : null,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: BorderSide(color: AppColors.divider),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: BorderSide(color: AppColors.divider),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                            ),
                            filled: true,
                            fillColor: Colors.white,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            isDense: true,
                          ),
                          style: AppTextStyles.bodyMedium,
                          onChanged: (value) => setState(() => _searchQuery = value),
                        ),
                      ),
                    ),

                    // Course Grid - 2 columns
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      sliver: SliverGrid(
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 1.4,
                          crossAxisSpacing: 8,
                          mainAxisSpacing: 8,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final course = displayCourses[index];
                            final count = courseStudentCounts[course.name] ?? 0;
                            return _CompactCourseCard(
                              courseName: course.name,
                              studentCount: count,
                              icon: _getCourseIcon(course.name),
                              color: _getCourseColor(index),
                              onTap: () => context.push(
                                '/admin/drilldown/students/course/${Uri.encodeComponent(course.name)}',
                              ),
                            ).animate(delay: Duration(milliseconds: 50 * index)).fadeIn(duration: 200.ms);
                          },
                          childCount: displayCourses.length,
                        ),
                      ),
                    ),

                    // Unassigned students card
                    if (unassignedCount > 0 && _searchQuery.isEmpty)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
                          child: _UnassignedCard(
                            count: unassignedCount,
                            onTap: () => context.push('/admin/drilldown/students/course/unassigned'),
                          ).animate().fadeIn(delay: 200.ms),
                        ),
                      ),

                    const SliverToBoxAdapter(child: SizedBox(height: 16)),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }

  IconData _getCourseIcon(String courseName) {
    switch (courseName.toLowerCase()) {
      case 'bharatanatyam':
        return Icons.self_improvement;
      case 'vocal':
      case 'carnatic vocal':
        return Icons.mic;
      case 'drawing':
        return Icons.brush;
      case 'abacus':
        return Icons.calculate;
      case 'veena':
        return Icons.music_note;
      case 'keyboard':
        return Icons.piano;
      case 'violin':
        return Icons.queue_music;
      default:
        return Icons.school;
    }
  }

  Color _getCourseColor(int index) {
    final colors = [
      AppColors.studentAccent,
      AppColors.teacherAccent,
      AppColors.primary,
      AppColors.secondary,
      AppColors.info,
      AppColors.success,
    ];
    return colors[index % colors.length];
  }
}

class _CompactSummaryCard extends StatelessWidget {
  final int totalStudents;
  final int totalCourses;

  const _CompactSummaryCard({
    required this.totalStudents,
    required this.totalCourses,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.school, color: Colors.white, size: 24),
          const SizedBox(width: 12),
          Text(
            '$totalStudents',
            style: AppTextStyles.h2.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          const SizedBox(width: 6),
          Text('Students', style: AppTextStyles.bodySmall.copyWith(color: Colors.white70)),
          const Spacer(),
          Container(width: 1, height: 30, color: Colors.white24),
          const Spacer(),
          const Icon(Icons.menu_book, color: Colors.white, size: 24),
          const SizedBox(width: 12),
          Text(
            '$totalCourses',
            style: AppTextStyles.h2.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          const SizedBox(width: 6),
          Text('Courses', style: AppTextStyles.bodySmall.copyWith(color: Colors.white70)),
        ],
      ),
    );
  }
}

class _CompactCourseCard extends StatefulWidget {
  final String courseName;
  final int studentCount;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _CompactCourseCard({
    required this.courseName,
    required this.studentCount,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  State<_CompactCourseCard> createState() => _CompactCourseCardState();
}

class _CompactCourseCardState extends State<_CompactCourseCard> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final gradient = AppColors.getCourseGradient(widget.courseName);

    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _isPressed ? 0.96 : 1.0,
        duration: const Duration(milliseconds: 100),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: _isPressed ? AppColors.cardShadowHover : AppColors.cardShadow,
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Stack(
              children: [
                // Gradient accent strip at top
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: gradient,
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                    ),
                  ),
                ),
                // Content
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 16, 12, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          // Icon with gradient background
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  widget.color.withValues(alpha: 0.15),
                                  widget.color.withValues(alpha: 0.05),
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(widget.icon, color: widget.color, size: 22),
                          ),
                          const Spacer(),
                          // Student count badge
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: gradient,
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: widget.color.withValues(alpha: 0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Text(
                              '${widget.studentCount}',
                              style: AppTextStyles.labelLarge.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      Text(
                        widget.courseName,
                        style: AppTextStyles.labelLarge.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.people_outline, size: 14, color: AppColors.textSecondary),
                          const SizedBox(width: 4),
                          Text(
                            '${widget.studentCount} ${widget.studentCount == 1 ? 'student' : 'students'}',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: widget.color.withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(Icons.arrow_forward, size: 14, color: widget.color),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _UnassignedCard extends StatefulWidget {
  final int count;
  final VoidCallback onTap;

  const _UnassignedCard({required this.count, required this.onTap});

  @override
  State<_UnassignedCard> createState() => _UnassignedCardState();
}

class _UnassignedCardState extends State<_UnassignedCard> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _isPressed ? 0.98 : 1.0,
        duration: const Duration(milliseconds: 100),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.warning.withValues(alpha: 0.08),
                AppColors.warning.withValues(alpha: 0.03),
              ],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.warning.withValues(alpha: 0.25)),
            boxShadow: _isPressed
                ? [
                    BoxShadow(
                      color: AppColors.warning.withValues(alpha: 0.15),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : [],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.person_off_outlined, color: AppColors.warning, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Unassigned Students',
                        style: AppTextStyles.labelLarge.copyWith(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        'Students not enrolled in courses',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.warning,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.warning.withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Text(
                    '${widget.count}',
                    style: AppTextStyles.labelLarge.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Icon(Icons.chevron_right, size: 20, color: AppColors.warning),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
