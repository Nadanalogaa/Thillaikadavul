import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../network/api_client.dart';

/// Service to handle FCM push notifications
class FcmService {
  final ApiClient _apiClient;
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  String? _currentToken;
  int? _currentUserId;

  FcmService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Get the current FCM token
  Future<String?> getToken() async {
    try {
      _currentToken = await _messaging.getToken();
      return _currentToken;
    } catch (e) {
      debugPrint('[FCM] Error getting token: $e');
      return null;
    }
  }

  /// Register FCM token for a user after login
  Future<void> registerToken(int userId) async {
    try {
      _currentUserId = userId;
      final token = await getToken();
      if (token == null) {
        debugPrint('[FCM] No token available to register');
        return;
      }

      final deviceType = Platform.isIOS ? 'ios' : 'android';

      final response = await _apiClient.registerFcmToken(
        userId: userId,
        fcmToken: token,
        deviceType: deviceType,
      );

      if (response.statusCode == 201) {
        debugPrint('[FCM] Token registered successfully for user $userId');
      } else {
        debugPrint('[FCM] Failed to register token: ${response.data}');
      }

      // Listen for token refresh
      _messaging.onTokenRefresh.listen((newToken) {
        _onTokenRefresh(newToken);
      });
    } catch (e) {
      debugPrint('[FCM] Error registering token: $e');
    }
  }

  /// Handle token refresh - re-register with the new token
  void _onTokenRefresh(String newToken) async {
    debugPrint('[FCM] Token refreshed');
    _currentToken = newToken;

    if (_currentUserId != null) {
      final deviceType = Platform.isIOS ? 'ios' : 'android';
      try {
        await _apiClient.registerFcmToken(
          userId: _currentUserId!,
          fcmToken: newToken,
          deviceType: deviceType,
        );
        debugPrint('[FCM] Refreshed token registered');
      } catch (e) {
        debugPrint('[FCM] Error registering refreshed token: $e');
      }
    }
  }

  /// Unregister FCM token on logout
  Future<void> unregisterToken() async {
    try {
      if (_currentUserId != null && _currentToken != null) {
        await _apiClient.removeFcmToken(
          userId: _currentUserId!,
          fcmToken: _currentToken!,
        );
        debugPrint('[FCM] Token unregistered for user $_currentUserId');
      }
      _currentUserId = null;
    } catch (e) {
      debugPrint('[FCM] Error unregistering token: $e');
    }
  }

  /// Setup message handlers for foreground and background notifications
  void setupMessageHandlers({
    required void Function(RemoteMessage) onForegroundMessage,
    required void Function(RemoteMessage) onMessageOpenedApp,
  }) {
    // Foreground messages
    FirebaseMessaging.onMessage.listen(onForegroundMessage);

    // When app is opened from a notification
    FirebaseMessaging.onMessageOpenedApp.listen(onMessageOpenedApp);

    // Check if app was opened from a notification (cold start)
    _checkInitialMessage(onMessageOpenedApp);
  }

  Future<void> _checkInitialMessage(
    void Function(RemoteMessage) onMessageOpenedApp,
  ) async {
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      onMessageOpenedApp(initialMessage);
    }
  }
}
