import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../di/injection_container.dart';

/// Prompt a user who is still on the academy's default password to set their own.
///
/// IMPORTANT: call this from a screen the user has ALREADY landed on (the
/// dashboard), never from the login screen. go_router redirects away from
/// /login the moment auth state becomes authenticated, which destroys any sheet
/// opened there — that looked like "cancelled" and logged the user straight
/// back out, so nobody with the flag could ever get in.
///
/// Returns true when the password was set.
Future<bool> showSetPasswordSheet(BuildContext context) async {
  final done = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    isDismissible: false,
    enableDrag: false,
    backgroundColor: Colors.transparent,
    builder: (_) => const SetPasswordSheet(),
  );
  return done == true;
}

class SetPasswordSheet extends StatefulWidget {
  const SetPasswordSheet({super.key});

  @override
  State<SetPasswordSheet> createState() => _SetPasswordSheetState();
}

class _SetPasswordSheetState extends State<SetPasswordSheet> {
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (_passwordController.text.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters.');
      return;
    }
    if (_passwordController.text != _confirmController.text) {
      setState(() => _error = 'Passwords do not match.');
      return;
    }
    setState(() => _loading = true);
    try {
      final r = await sl<ApiClient>().setPassword(_passwordController.text);
      if (r.statusCode == 200) {
        if (mounted) Navigator.pop(context, true);
      } else {
        setState(() => _error = r.data?['message'] ?? 'Could not set password.');
      }
    } catch (e) {
      setState(() => _error = 'Could not set password. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Set your password', style: AppTextStyles.h3),
              const SizedBox(height: 8),
              Text(
                'You\'re signed in with the default password. For your security, please set your own password.',
                style:
                    AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: _obscure,
                decoration: InputDecoration(
                  labelText: 'New password',
                  hintText: 'At least 6 characters',
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(_obscure
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _confirmController,
                obscureText: _obscure,
                decoration: const InputDecoration(
                  labelText: 'Confirm new password',
                  prefixIcon: Icon(Icons.lock_outline),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!,
                    style:
                        AppTextStyles.caption.copyWith(color: AppColors.error)),
              ],
              const SizedBox(height: 16),
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.white)),
                        )
                      : const Text('Save & continue'),
                ),
              ),
              // "Later" instead of logging out: the user is already inside the
              // app, and never locking anyone out matters more than forcing it
              // on this exact screen. They are prompted again next launch.
              TextButton(
                onPressed:
                    _loading ? null : () => Navigator.pop(context, false),
                child: const Text('Later'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
