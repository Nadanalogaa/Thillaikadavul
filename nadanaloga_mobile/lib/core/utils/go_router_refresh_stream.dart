import 'dart:async';
import 'package:flutter/foundation.dart';

/// Converts a [Stream] into a [Listenable] for GoRouter's refreshListenable.
/// This allows GoRouter to re-evaluate its redirect logic whenever the
/// stream emits a new value (e.g., when AuthBloc state changes).
class GoRouterRefreshStream extends ChangeNotifier {
  late final StreamSubscription<dynamic> _subscription;

  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) {
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
