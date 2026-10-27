import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/theme/app_colors.dart';
import '../../config/theme/app_text_styles.dart';
import '../../core/network/api_client.dart';
import '../../di/injection_container.dart';

/// Tells families when a newer app is on the Play Store.
///
/// The server holds two build numbers. Below the minimum the app is blocked —
/// for a release that fixes something families cannot be left without, such as
/// a payment fault. Below the latest it only shows a dismissible banner.
///
/// Skipped on the web build: nadanaloga.com/app always serves the current code,
/// so there is nothing for an iPhone user to update.
class UpdateGate extends StatefulWidget {
  final Widget child;
  const UpdateGate({super.key, required this.child});

  @override
  State<UpdateGate> createState() => _UpdateGateState();
}

class _UpdateGateState extends State<UpdateGate> {
  bool _blocked = false;
  bool _optional = false;
  bool _dismissed = false;
  String _storeUrl = '';
  String _message = '';
  String _versionName = '';

  @override
  void initState() {
    super.initState();
    if (!kIsWeb) _check();
  }

  Future<void> _check() async {
    try {
      final info = await PackageInfo.fromPlatform();
      final mine = int.tryParse(info.buildNumber) ?? 0;
      if (mine == 0) return;

      final r = await sl<ApiClient>().getAppVersion();
      final code = r.statusCode ?? 0;
      if (code < 200 || code >= 300 || r.data is! Map) return;
      final d = Map<String, dynamic>.from(r.data as Map);

      final minimum = int.tryParse('${d['minimum_build'] ?? 0}') ?? 0;
      final latest = int.tryParse('${d['latest_build'] ?? 0}') ?? 0;
      if (!mounted) return;
      setState(() {
        _blocked = minimum > 0 && mine < minimum;
        _optional = !_blocked && latest > 0 && mine < latest;
        _storeUrl = '${d['store_url'] ?? ''}';
        _message = '${d['message'] ?? ''}';
        _versionName = '${d['version_name'] ?? ''}';
      });
    } catch (_) {
      // A version check must never stop someone using the app.
    }
  }

  Future<void> _openStore() async {
    if (_storeUrl.isEmpty) return;
    final uri = Uri.tryParse(_storeUrl);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  String get _headline => _versionName.isEmpty
      ? 'A new version of the app is available'
      : 'Version $_versionName is available';

  @override
  Widget build(BuildContext context) {
    if (_blocked) return _blockingScreen();
    if (!_optional || _dismissed) return widget.child;
    // This sits above the Navigator, where nothing paints a background, so the
    // tint is blended onto the scaffold colour rather than left translucent —
    // a semi-transparent colour here shows as black.
    final surface = Theme.of(context).scaffoldBackgroundColor;
    return Column(
      children: [
        Material(
          color: Color.alphaBlend(AppColors.primary.withValues(alpha: 0.10), surface),
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
              child: Row(
                children: [
                  const Icon(Icons.system_update, size: 20, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _message.isEmpty ? _headline : _message,
                      style: AppTextStyles.caption,
                    ),
                  ),
                  TextButton(onPressed: _openStore, child: const Text('Update')),
                  IconButton(
                    tooltip: 'Later',
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () => setState(() => _dismissed = true),
                  ),
                ],
              ),
            ),
          ),
        ),
        Expanded(child: widget.child),
      ],
    );
  }

  Widget _blockingScreen() => Scaffold(
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.system_update, size: 56, color: AppColors.primary),
                  const SizedBox(height: 16),
                  Text('Please update the app',
                      textAlign: TextAlign.center,
                      style: AppTextStyles.labelLarge.copyWith(fontSize: 20)),
                  const SizedBox(height: 10),
                  Text(
                    _message.isEmpty
                        ? 'This version is out of date. Update from the Play Store to carry on.'
                        : _message,
                    textAlign: TextAlign.center,
                    style: AppTextStyles.bodyMedium,
                  ),
                  const SizedBox(height: 22),
                  FilledButton.icon(
                    onPressed: _openStore,
                    icon: const Icon(Icons.open_in_new),
                    label: const Text('Open Play Store'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                      backgroundColor: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
}
