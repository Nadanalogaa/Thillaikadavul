import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'config/theme/app_theme.dart';
import 'config/routes/app_router.dart';
import 'core/services/fcm_service.dart';
import 'di/injection_container.dart';
import 'presentation/bloc/auth/auth_bloc.dart';
import 'presentation/bloc/auth/auth_event.dart';

class NadanalogaApp extends StatefulWidget {
  const NadanalogaApp({super.key});

  @override
  State<NadanalogaApp> createState() => _NadanalogaAppState();
}

class _NadanalogaAppState extends State<NadanalogaApp> {
  late final AuthBloc _authBloc;
  late final FcmService _fcmService;
  final GlobalKey<ScaffoldMessengerState> _scaffoldMessengerKey =
      GlobalKey<ScaffoldMessengerState>();

  @override
  void initState() {
    super.initState();
    _authBloc = sl<AuthBloc>()..add(AuthCheckSession());
    _fcmService = sl<FcmService>();
    _setupPushNotificationHandlers();
  }

  void _setupPushNotificationHandlers() {
    _fcmService.setupMessageHandlers(
      onForegroundMessage: _handleForegroundMessage,
      onMessageOpenedApp: _handleMessageOpenedApp,
    );
  }

  void _handleForegroundMessage(RemoteMessage message) {
    debugPrint('[FCM] Foreground message received: ${message.messageId}');
    final notification = message.notification;
    if (notification != null) {
      // Show in-app notification banner
      _scaffoldMessengerKey.currentState?.showSnackBar(
        SnackBar(
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                notification.title ?? 'Notification',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              if (notification.body != null)
                Text(
                  notification.body!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
            ],
          ),
          duration: const Duration(seconds: 4),
          behavior: SnackBarBehavior.floating,
          action: SnackBarAction(
            label: 'View',
            onPressed: () {
              // Navigate to notifications screen
            },
          ),
        ),
      );
    }
  }

  void _handleMessageOpenedApp(RemoteMessage message) {
    debugPrint('[FCM] App opened from notification: ${message.messageId}');
    // The app was opened from a notification
    // You can navigate to a specific screen based on the message data
  }

  @override
  void dispose() {
    _authBloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>.value(value: _authBloc),
      ],
      child: MaterialApp.router(
        title: 'Nadanaloga',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.light,
        routerConfig: AppRouter.createRouter(_authBloc),
        scaffoldMessengerKey: _scaffoldMessengerKey,
      ),
    );
  }
}
