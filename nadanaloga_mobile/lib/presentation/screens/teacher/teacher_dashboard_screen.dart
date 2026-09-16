import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../bloc/auth/auth_state.dart';
import '../student/teaching_summary_screen.dart';

class TeacherDashboardScreen extends StatelessWidget {
  const TeacherDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        final user = state is AuthAuthenticated ? state.user : null;
        return Scaffold(
          appBar: AppBar(
            title: const Text('My Dashboard'),
            backgroundColor: AppColors.teacherAccent,
            actions: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                onPressed: () => context.push('/teacher/notifications'),
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
            onRefresh: () async {},
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome, ${user?.name ?? 'Teacher'}',
                    style: AppTextStyles.h2,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Teacher',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Teaching at a glance: batches, timings and student counts —
                  // the same summary the household home shows for a teacher.
                  if (user != null) TeachingSummaryBody(teacherId: user.id),

                  // My Children — shown when this teacher is also a parent.
                  // One login surfaces every family profile; tapping a child
                  // opens their student dashboard.
                  if ((user?.students ?? []).isNotEmpty) ...[
                    const SizedBox(height: 28),
                    Text('My Children', style: AppTextStyles.h3),
                    const SizedBox(height: 4),
                    Text(
                      'Switch to a child\'s dashboard',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...user!.students!.map(
                      (child) => Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor:
                                AppColors.studentAccent.withOpacity(0.15),
                            child: Icon(Icons.school,
                                color: AppColors.studentAccent),
                          ),
                          title: Text(child.name),
                          subtitle: const Text('Tap to view dashboard'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => context.push('/student', extra: {
                            'studentId': child.id,
                            'student': child,
                          }),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
