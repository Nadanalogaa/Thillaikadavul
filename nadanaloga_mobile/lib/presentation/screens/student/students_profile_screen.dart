import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/user_model.dart';
import '../../../di/injection_container.dart';

/// Students Profile — the same view the web "Students Profile" menu shows:
/// every student in the household with their details, tap to open that
/// student's dashboard.
class StudentsProfileScreen extends StatefulWidget {
  const StudentsProfileScreen({super.key});

  @override
  State<StudentsProfileScreen> createState() => _StudentsProfileScreenState();
}

class _StudentsProfileScreenState extends State<StudentsProfileScreen> {
  List<UserModel> _students = [];
  bool _loading = true;
  String? _error;

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
      // /api/family returns the household's STUDENTS (teacher role excluded).
      final r = await sl<ApiClient>().getFamily();
      if (!mounted) return;
      if (r.statusCode == 200 && r.data is List) {
        setState(() {
          _students = (r.data as List)
              .whereType<Map>()
              .map((u) => UserModel.fromJson(Map<String, dynamic>.from(u)))
              .toList();
        });
      } else {
        setState(() => _error = 'Could not load students.');
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load students.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Students Profile'),
        backgroundColor: AppColors.primary,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, style: AppTextStyles.bodyMedium),
                      TextButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _students.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, i) => _card(_students[i]),
                  ),
                ),
    );
  }

  Widget _card(UserModel s) {
    final rows = <List<String>>[
      if (s.userId != null && s.userId!.isNotEmpty) ['ID', s.userId!],
      if (s.dob != null && s.dob!.isNotEmpty) ['Date of birth', s.dob!],
      if (s.sex != null && s.sex!.isNotEmpty) ['Gender', s.sex!],
      if (s.schoolName != null && s.schoolName!.isNotEmpty) ['School', s.schoolName!],
      if (s.standard != null && s.standard!.isNotEmpty) ['Standard', s.standard!],
      if (s.gradeLabel != null) ['Grade', s.gradeLabel!],
      if (s.batchLabel != null) ['Batches', s.batchLabel!],
      if (s.classPreference != null && s.classPreference!.isNotEmpty)
        ['Class preference', s.classPreference!],
      if (s.dateOfJoining != null && s.dateOfJoining!.isNotEmpty)
        ['Joined', s.dateOfJoining!],
    ];
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: AppColors.primary.withValues(alpha: 0.15)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                  backgroundImage:
                      s.photoUrl != null ? NetworkImage(s.photoUrl!) : null,
                  child: s.photoUrl == null
                      ? Text(s.name.isNotEmpty ? s.name[0].toUpperCase() : '?',
                          style: AppTextStyles.labelLarge
                              .copyWith(color: AppColors.primary))
                      : null,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s.name, style: AppTextStyles.labelLarge),
                      if (s.coursesLabel != null)
                        Text(s.coursesLabel!,
                            style: AppTextStyles.caption
                                .copyWith(color: AppColors.textSecondary)),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => context.go('/student', extra: {
                    'studentId': s.id,
                    'student': s,
                  }),
                  child: const Text('Open'),
                ),
              ],
            ),
            if (rows.isNotEmpty) const Divider(height: 18),
            for (final r in rows)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 130,
                      child: Text(r[0],
                          style: AppTextStyles.caption
                              .copyWith(color: AppColors.textSecondary)),
                    ),
                    Expanded(child: Text(r[1], style: AppTextStyles.bodyMedium)),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
