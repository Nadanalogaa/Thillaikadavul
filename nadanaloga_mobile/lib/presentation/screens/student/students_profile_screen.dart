import 'package:flutter/material.dart';


import 'package:go_router/go_router.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/user_model.dart';
import '../../../di/injection_container.dart';
import 'member_profile_card.dart';

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

  Widget _card(UserModel s) => MemberProfileCard(
        member: s,
        onChanged: _load,
        onOpen: () => context.go('/student', extra: {'studentId': s.id, 'student': s}),
      );
}
