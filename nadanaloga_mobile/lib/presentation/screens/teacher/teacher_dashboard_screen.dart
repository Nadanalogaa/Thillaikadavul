import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../config/theme/app_colors.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_state.dart';
import '../auth/set_password_sheet.dart';
import '../home/home_dashboard.dart';

/// Teacher home: the same dashboard as a household, led by teaching — the
/// week's classes, batches and students — plus her family's fees and
/// children when she is also a parent.
class TeacherDashboardScreen extends StatefulWidget {
  const TeacherDashboardScreen({super.key});

  @override
  State<TeacherDashboardScreen> createState() => _TeacherDashboardScreenState();
}

class _TeacherDashboardScreenState extends State<TeacherDashboardScreen> {
  @override
  void initState() {
    super.initState();
    // Same as the student shell: prompt for a real password HERE, after landing.
    // Opening it on the login screen let go_router's redirect destroy the sheet,
    // which logged the user back out.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final state = context.read<AuthBloc>().state;
      if (state is! AuthAuthenticated) return;
      if (!state.user.mustChangePassword) return;
      await showSetPasswordSheet(context);
    });
  }

  @override
  Widget build(BuildContext context) {
    return const HomeDashboard(
      accent: AppColors.teacherAccent,
      notificationsRoute: '/teacher/notifications',
      showLogout: true,
    );
  }
}
