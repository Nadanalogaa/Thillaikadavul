import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/admin_role.dart';
import '../../../../core/utils/fee_format.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/auth/auth_bloc.dart';
import '../../../bloc/auth/auth_state.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/user_avatar.dart';
import '../expenses/expense_data.dart';
import '../insights/dashboard_widgets.dart';

class _Staff {
  final int id;
  final String name;
  final String email;
  final String? phone;
  final String? userId;
  final bool active;
  final bool isSuperAdmin;
  final bool mustChangePassword;
  final String? createdAt;

  const _Staff({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.userId,
    required this.active,
    required this.isSuperAdmin,
    required this.mustChangePassword,
    this.createdAt,
  });

  factory _Staff.fromJson(Map<String, dynamic> j) {
    String? s(dynamic v) {
      final t = v?.toString().trim() ?? '';
      return t.isEmpty ? null : t;
    }

    return _Staff(
      id: j['id'] is int ? j['id'] : int.tryParse('${j['id']}') ?? 0,
      name: s(j['name']) ?? 'Admin',
      email: s(j['email']) ?? '',
      phone: s(j['phone']),
      userId: s(j['user_id']),
      active: '${j['status'] ?? 'active'}'.toLowerCase() == 'active',
      isSuperAdmin: j['is_super_admin'] == true,
      mustChangePassword: j['must_change_password'] == true,
      createdAt: s(j['created_at']),
    );
  }
}

/// Office staff who can sign in to the admin side. Super admin only.
class StaffAdminsScreen extends StatefulWidget {
  const StaffAdminsScreen({super.key});

  @override
  State<StaffAdminsScreen> createState() => _StaffAdminsScreenState();
}

class _StaffAdminsScreenState extends State<StaffAdminsScreen> {
  final _api = sl<ApiClient>();
  bool _loading = true;
  String? _error;
  List<_Staff> _staff = const [];
  final Set<int> _busy = {};

  int? get _myId {
    final s = context.read<AuthBloc>().state;
    return s is AuthAuthenticated ? s.user.id : null;
  }

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
      final r = await _api.dio.get(ApiEndpoints.staffAdmins);
      if (!mounted) return;
      if (r.statusCode == 200 && r.data is List) {
        setState(() {
          _staff = (r.data as List)
              .whereType<Map>()
              .map((e) => _Staff.fromJson(Map<String, dynamic>.from(e)))
              .toList();
          _loading = false;
        });
      } else {
        setState(() {
          _error = serverMessage(r, 'Could not load the admins.');
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Connection error. Please try again.';
          _loading = false;
        });
      }
    }
  }

  void _ok(String msg) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(msg), backgroundColor: AppColors.success));

  Future<bool> _update(_Staff s, Map<String, dynamic> body, String done) async {
    setState(() => _busy.add(s.id));
    try {
      final r = await _api.dio.put(ApiEndpoints.staffAdminById(s.id), data: body);
      if (!mounted) return false;
      if (r.statusCode == 200) {
        _ok(done);
        await _load();
        return true;
      }
      showErrorSnack(context, serverMessage(r, 'Could not update the admin.'));
    } catch (_) {
      if (mounted) showErrorSnack(context, 'Connection error. Please try again.');
    } finally {
      if (mounted) setState(() => _busy.remove(s.id));
    }
    return false;
  }

  Future<void> _add() async {
    final res = await showDialog<Map<String, String>>(
      context: context,
      builder: (_) => const _StaffForm(),
    );
    if (res == null || !mounted) return;
    try {
      final r = await _api.dio.post(ApiEndpoints.staffAdmins, data: res);
      if (!mounted) return;
      if (r.statusCode == 201 || r.statusCode == 200) {
        _ok('${res['name']} can now sign in with ${res['email']}.');
        _load();
      } else {
        showErrorSnack(context, serverMessage(r, 'Could not add the admin.'));
      }
    } catch (_) {
      if (mounted) showErrorSnack(context, 'Connection error. Please try again.');
    }
  }

  Future<void> _edit(_Staff s) async {
    final res = await showDialog<Map<String, String>>(
      context: context,
      builder: (_) => _StaffForm(existing: s),
    );
    if (res == null || !mounted) return;
    await _update(s, res, 'Saved.');
  }

  Future<void> _resetPassword(_Staff s) async {
    final pw = await showDialog<String>(
      context: context,
      builder: (_) => _PasswordDialog(name: s.name),
    );
    if (pw == null || !mounted) return;
    await _update(s, {'password': pw},
        'Password reset. ${s.name} will be asked to change it after signing in.');
  }

  Future<void> _toggle(_Staff s) async {
    final turnOff = s.active;
    final ok = await ConfirmDialog.show(
      context,
      title: turnOff ? 'Turn off access?' : 'Turn access back on?',
      message: turnOff
          ? '${s.name} will be signed out and cannot sign in until you turn access back on.'
          : '${s.name} will be able to sign in again.',
      confirmLabel: turnOff ? 'Turn off' : 'Turn on',
      confirmColor: turnOff ? AppColors.error : AppColors.success,
    );
    if (ok != true || !mounted) return;
    await _update(s, {'status': turnOff ? 'inactive' : 'active'},
        turnOff ? 'Access turned off for ${s.name}.' : 'Access turned on for ${s.name}.');
  }

  Future<void> _remove(_Staff s) async {
    final ok = await ConfirmDialog.show(
      context,
      title: 'Remove ${s.name}?',
      message: 'They will no longer be able to sign in as an admin. Records they entered stay.',
      confirmLabel: 'Remove',
      confirmColor: AppColors.error,
    );
    if (ok != true || !mounted) return;
    setState(() => _busy.add(s.id));
    try {
      final r = await _api.dio.delete(ApiEndpoints.staffAdminById(s.id));
      if (!mounted) return;
      if (r.statusCode == 200) {
        _ok('${s.name} removed.');
        await _load();
      } else {
        showErrorSnack(context, serverMessage(r, 'Could not remove the admin.'));
      }
    } catch (_) {
      if (mounted) showErrorSnack(context, 'Connection error. Please try again.');
    } finally {
      if (mounted) setState(() => _busy.remove(s.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Staff admins')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _add,
        icon: const Icon(Icons.person_add_alt_1),
        label: const Text('Add admin'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _body(),
      ),
    );
  }

  Widget _body() {
    if (_loading && _staff.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return ListView(children: [
        SizedBox(height: 400, child: RetryPanel(message: _error!, onRetry: _load)),
      ]);
    }
    final me = _myId;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      children: [
        const Text(
          'Staff admins can view, add and edit. Only you (the super admin) can delete, reverse receipts or close bills.',
          style: AppTextStyles.caption,
        ),
        const SizedBox(height: 12),
        if (_staff.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 40),
            child: Center(
              child: Text('No admins yet. Tap "Add admin".',
                  style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
            ),
          ),
        for (final s in _staff) ...[
          _tile(s, isMe: s.id == me),
          const SizedBox(height: 10),
        ],
      ],
    );
  }

  Widget _tile(_Staff s, {required bool isMe}) {
    final busy = _busy.contains(s.id);
    final canChangeStatus = !isMe && !s.isSuperAdmin;
    return Opacity(
      opacity: s.active ? 1 : 0.7,
      child: DashPanel(
        padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
        child: Row(
          children: [
            UserAvatar(photoUrl: null, name: s.name, radius: 21),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(s.name,
                      style: AppTextStyles.labelLarge, maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(s.email,
                      style: AppTextStyles.caption, maxLines: 1, overflow: TextOverflow.ellipsis),
                  if (s.phone != null)
                    Text(s.phone!, style: AppTextStyles.caption),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      if (s.isSuperAdmin)
                        _chip('Super admin', AppColors.error)
                      else
                        _chip(s.active ? 'Active' : 'Access off',
                            s.active ? AppColors.success : AppColors.textSecondary),
                      if (isMe) _chip('You', AppColors.primary),
                      if (s.mustChangePassword && !s.isSuperAdmin)
                        _chip('Must change password', AppColors.warning),
                    ],
                  ),
                  if (s.createdAt != null && !s.isSuperAdmin)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text('Added ${FeeFormat.date(s.createdAt)}',
                          style: AppTextStyles.caption.copyWith(color: AppColors.textHint)),
                    ),
                ],
              ),
            ),
            if (busy)
              const Padding(
                padding: EdgeInsets.all(12),
                child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
              )
            else
              PopupMenuButton<String>(
                onSelected: (v) {
                  switch (v) {
                    case 'edit':
                      _edit(s);
                    case 'password':
                      _resetPassword(s);
                    case 'toggle':
                      _toggle(s);
                    case 'remove':
                      _remove(s);
                  }
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(
                    value: 'edit',
                    child: ListTile(
                      leading: Icon(Icons.edit_outlined),
                      title: Text('Edit details'),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'password',
                    child: ListTile(
                      leading: Icon(Icons.lock_reset),
                      title: Text('Reset password'),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                  if (canChangeStatus)
                    PopupMenuItem(
                      value: 'toggle',
                      child: ListTile(
                        leading: Icon(s.active ? Icons.block : Icons.check_circle_outline,
                            color: s.active ? AppColors.error : AppColors.success),
                        title: Text(s.active ? 'Turn access off' : 'Turn access on'),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  if (canChangeStatus)
                    const PopupMenuItem(
                      value: 'remove',
                      child: ListTile(
                        leading: Icon(Icons.person_remove_outlined, color: AppColors.error),
                        title: Text('Remove', style: TextStyle(color: AppColors.error)),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label,
            style: AppTextStyles.caption.copyWith(color: color, fontWeight: FontWeight.w600, fontSize: 11)),
      );
}

/// Name / email / phone (+ first password when adding). Pops the fields.
class _StaffForm extends StatefulWidget {
  final _Staff? existing;
  const _StaffForm({this.existing});

  @override
  State<_StaffForm> createState() => _StaffFormState();
}

class _StaffFormState extends State<_StaffForm> {
  final _key = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.existing?.name ?? '');
  late final _email = TextEditingController(text: widget.existing?.email ?? '');
  late final _phone = TextEditingController(text: widget.existing?.phone ?? '');
  final _password = TextEditingController();
  bool _show = false;

  bool get _isEdit => widget.existing != null;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit() {
    if (!(_key.currentState?.validate() ?? false)) return;
    Navigator.of(context).pop(<String, String>{
      'name': _name.text.trim(),
      'email': _email.text.trim(),
      'phone': _phone.text.trim(),
      if (!_isEdit) 'password': _password.text,
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(_isEdit ? 'Edit admin' : 'Add staff admin'),
      content: Form(
        key: _key,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Name'),
                validator: (v) => (v ?? '').trim().isEmpty ? 'Enter the name' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email (used to sign in)'),
                validator: (v) => RegExp(r'^\S+@\S+\.\S+$').hasMatch((v ?? '').trim())
                    ? null
                    : 'Enter a valid email',
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone (optional)'),
              ),
              if (!_isEdit) ...[
                const SizedBox(height: 10),
                TextFormField(
                  controller: _password,
                  obscureText: !_show,
                  decoration: InputDecoration(
                    labelText: 'First password',
                    helperText: 'They will be asked to change it',
                    suffixIcon: IconButton(
                      icon: Icon(_show ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _show = !_show),
                    ),
                  ),
                  validator: (v) => (v ?? '').length < 6 ? 'At least 6 characters' : null,
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        FilledButton(onPressed: _submit, child: Text(_isEdit ? 'Save' : 'Add admin')),
      ],
    );
  }
}

class _PasswordDialog extends StatefulWidget {
  final String name;
  const _PasswordDialog({required this.name});

  @override
  State<_PasswordDialog> createState() => _PasswordDialogState();
}

class _PasswordDialogState extends State<_PasswordDialog> {
  final _key = GlobalKey<FormState>();
  final _pw = TextEditingController();
  bool _show = false;

  @override
  void dispose() {
    _pw.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Reset password for ${widget.name}'),
      content: Form(
        key: _key,
        child: TextFormField(
          controller: _pw,
          obscureText: !_show,
          autofocus: true,
          decoration: InputDecoration(
            labelText: 'New password',
            suffixIcon: IconButton(
              icon: Icon(_show ? Icons.visibility_off : Icons.visibility),
              onPressed: () => setState(() => _show = !_show),
            ),
          ),
          validator: (v) => (v ?? '').length < 6 ? 'At least 6 characters' : null,
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        FilledButton(
          onPressed: () {
            if (_key.currentState?.validate() ?? false) Navigator.pop(context, _pw.text);
          },
          child: const Text('Reset'),
        ),
      ],
    );
  }
}
