import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/date_display.dart';
import '../../../data/models/user_model.dart';
import '../../../di/injection_container.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_state.dart';
import '../../widgets/user_avatar.dart';

/// More → Profile: the signed-in account (a parent, or a student who signs
/// in for themself) and, underneath, every student in the family with their
/// ID, courses, grades and batches. Courses belong to the students, never to
/// a parent's login, so they are read from the household, not the account.
class StudentProfileScreen extends StatefulWidget {
  const StudentProfileScreen({super.key});

  @override
  State<StudentProfileScreen> createState() => _StudentProfileScreenState();
}

class _FamilyStudent {
  final int id;
  final String name;
  final String? userId;
  final String? photoUrl;
  final List<String> courses; // "Bharatham · Grade 2"
  final List<String> batches;

  const _FamilyStudent({
    required this.id,
    required this.name,
    this.userId,
    this.photoUrl,
    this.courses = const [],
    this.batches = const [],
  });
}

class _StudentProfileScreenState extends State<StudentProfileScreen> {
  bool _loading = true;
  String? _error;
  List<_FamilyStudent> _students = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await sl<ApiClient>().getHousehold();
      if (!mounted) return;
      if (r.statusCode != 200 || r.data is! Map) {
        setState(() {
          _error = 'Could not load your family details.';
          _loading = false;
        });
        return;
      }
      final members = ((r.data as Map)['members'] as List? ?? const [])
          .whereType<Map>()
          .map((m) => Map<String, dynamic>.from(m))
          .where((m) => '${m['role']}'.toLowerCase() == 'student');
      final list = <_FamilyStudent>[];
      for (final m in members) {
        final grades = (m['course_grades'] as List? ?? const [])
            .whereType<Map>()
            .map((g) {
          final c = '${g['course_name'] ?? ''}'.trim();
          final gr = '${g['grade_name'] ?? ''}'.trim();
          return gr.isEmpty ? c : '$c · $gr';
        }).where((s) => s.isNotEmpty).toList();
        // A course with no grade yet still shows.
        final graded = grades.map((s) => s.split(' · ').first.toLowerCase()).toSet();
        final plain = (m['courses'] as List? ?? const [])
            .map((c) => '$c'.trim())
            .where((c) => c.isNotEmpty && !graded.contains(c.toLowerCase()));
        list.add(_FamilyStudent(
          id: m['id'] is int ? m['id'] as int : int.tryParse('${m['id']}') ?? 0,
          name: '${m['name'] ?? 'Student'}',
          userId: m['user_id'] as String?,
          photoUrl: m['photo_url'] as String?,
          courses: [...grades, ...plain],
          batches: (m['batch_names'] as List? ?? const []).map((b) => '$b').toList(),
        ));
      }
      setState(() {
        _students = list;
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Could not load your family details. Please check your connection.';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        final user = state is AuthAuthenticated ? state.user : null;
        return Scaffold(
          appBar: AppBar(
            title: const Text('Profile'),
            backgroundColor: AppColors.studentAccent,
          ),
          body: user == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: [
                      _header(user),
                      const SizedBox(height: 20),
                      Text('Account', style: AppTextStyles.h4),
                      const SizedBox(height: 10),
                      _card([
                        _row(Icons.person, 'Name', user.name),
                        if ((user.contactNumber ?? '').isNotEmpty)
                          _row(Icons.phone, 'Phone (your login)', user.contactNumber!),
                        _row(Icons.email, 'Email',
                            user.shownEmail.isEmpty ? 'Not given' : user.shownEmail),
                        if ((user.userId ?? '').isNotEmpty)
                          _row(Icons.badge, 'Account ID', user.userId!),
                        if ((user.address ?? '').trim().isNotEmpty)
                          _row(Icons.home_outlined, 'Address', user.address!.trim()),
                        if ((user.dateOfJoining ?? user.createdAt) != null)
                          _row(Icons.calendar_today, 'Joined',
                              formatDisplayDate(user.dateOfJoining ?? user.createdAt)),
                      ]),
                      const SizedBox(height: 20),
                      Text(_students.length > 1 ? 'Your family' : 'Student',
                          style: AppTextStyles.h4),
                      const SizedBox(height: 10),
                      if (_loading)
                        const Padding(
                          padding: EdgeInsets.all(24),
                          child: Center(child: CircularProgressIndicator()),
                        )
                      else if (_error != null)
                        _card([
                          Text(_error!, style: AppTextStyles.bodyMedium),
                          TextButton(onPressed: _load, child: const Text('Try again')),
                        ])
                      else if (_students.isEmpty)
                        _card([
                          Text('No students are linked to this login yet.',
                              style: AppTextStyles.bodyMedium
                                  .copyWith(color: AppColors.textSecondary)),
                        ])
                      else
                        for (final s in _students) _studentCard(s),
                    ],
                  ),
                ),
        );
      },
    );
  }

  Widget _header(UserModel user) => Column(
        children: [
          UserAvatar(
            photoUrl: user.photoUrl,
            name: user.name,
            radius: 44,
            color: AppColors.studentAccent,
            fontSize: 34,
          ),
          const SizedBox(height: 12),
          Text(user.name,
              style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.w600),
              textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.studentAccent.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(user.role,
                style: AppTextStyles.labelSmall.copyWith(
                    color: AppColors.studentAccent, fontWeight: FontWeight.w600)),
          ),
        ],
      );

  Widget _studentCard(_FamilyStudent s) => Card(
        margin: const EdgeInsets.only(bottom: 12),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.divider),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  UserAvatar(
                    photoUrl: s.photoUrl,
                    name: s.name,
                    radius: 24,
                    color: AppColors.studentAccent.withValues(alpha: 0.15),
                    foreground: AppColors.studentAccent,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(s.name, style: AppTextStyles.labelLarge),
                        if ((s.userId ?? '').isNotEmpty)
                          Text(s.userId!,
                              style: AppTextStyles.caption
                                  .copyWith(color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              if (s.courses.isEmpty)
                _line(Icons.menu_book_outlined, 'No course yet')
              else
                for (final c in s.courses) _line(Icons.menu_book_outlined, c),
              for (final b in s.batches) _line(Icons.group_work_outlined, b),
            ],
          ),
        ),
      );

  Widget _card(List<Widget> children) => Card(
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.divider),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
        ),
      );

  Widget _row(IconData icon, String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: AppColors.studentAccent),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                  Text(value,
                      style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w500)),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _line(IconData icon, String text) => Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Row(
          children: [
            Icon(icon, size: 16, color: AppColors.textSecondary),
            const SizedBox(width: 8),
            Expanded(child: Text(text, style: AppTextStyles.bodyMedium)),
          ],
        ),
      );
}
