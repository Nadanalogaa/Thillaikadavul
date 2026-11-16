import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/user_model.dart';
import '../../../di/injection_container.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../bloc/auth/auth_state.dart';
import '../../widgets/user_avatar.dart';
import 'member_profile_card.dart';

/// More → Profile: the signed-in account (a parent, or a student who signs
/// in for themself) and, underneath, every student in the family — the same
/// cards as Students Profile, each with the edit pencil. The account's own
/// details come fresh from the server, so an edit shows at once.
class StudentProfileScreen extends StatefulWidget {
  const StudentProfileScreen({super.key});

  @override
  State<StudentProfileScreen> createState() => _StudentProfileScreenState();
}

class _StudentProfileScreenState extends State<StudentProfileScreen> {
  bool _loading = true;
  String? _error;
  UserModel? _account;
  List<UserModel> _students = const [];

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
      final api = sl<ApiClient>();
      final auth = context.read<AuthBloc>().state;
      final me = auth is AuthAuthenticated ? auth.user : null;
      final results = await Future.wait([
        api.getFamily(),
        if (me != null) api.getHouseholdMember(me.id),
      ]);
      if (!mounted) return;
      final fam = results[0];
      final students = fam.statusCode == 200 && fam.data is List
          ? (fam.data as List)
              .whereType<Map>()
              .map((u) => UserModel.fromJson(Map<String, dynamic>.from(u)))
              .toList()
          : <UserModel>[];
      UserModel? account = me;
      if (results.length > 1 && results[1].statusCode == 200 && results[1].data is Map) {
        account = UserModel.fromJson(Map<String, dynamic>.from(results[1].data as Map));
      }
      setState(() {
        _account = account;
        // A student who signs in for themself is the account, not a second card.
        _students = students.where((s) => s.id != account?.id).toList();
        _loading = false;
        if (fam.statusCode != 200) _error = 'Could not load your family details.';
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Could not load your details. Please check your connection.';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final account = _account;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        backgroundColor: AppColors.studentAccent,
      ),
      body: account == null && _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  if (account != null) ...[
                    _header(account),
                    const SizedBox(height: 20),
                    Text('Your account', style: AppTextStyles.h4),
                    const SizedBox(height: 10),
                    MemberProfileCard(member: account, isAccount: true, onChanged: _load),
                    const SizedBox(height: 6),
                    Text(
                      'The phone number is your sign-in; ask the academy to change it.',
                      style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 20),
                  ],
                  if (_students.isNotEmpty || _loading || _error != null) ...[
                    Text(_students.length > 1 ? 'Your children' : 'Student', style: AppTextStyles.h4),
                    const SizedBox(height: 10),
                  ],
                  if (_loading)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (_error != null)
                    Column(
                      children: [
                        Text(_error!, style: AppTextStyles.bodyMedium),
                        TextButton(onPressed: _load, child: const Text('Try again')),
                      ],
                    )
                  else
                    for (final s in _students)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: MemberProfileCard(
                          member: s,
                          onChanged: _load,
                          onOpen: () => context.go('/student', extra: {'studentId': s.id, 'student': s}),
                        ),
                      ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () => context.read<AuthBloc>().add(AuthLogoutRequested()),
                    icon: const Icon(Icons.logout, size: 18),
                    label: const Text('Log out'),
                  ),
                ],
              ),
            ),
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
}
