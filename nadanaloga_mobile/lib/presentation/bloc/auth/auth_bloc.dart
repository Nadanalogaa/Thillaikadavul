import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../core/services/fcm_service.dart';
import '../../../data/models/user_model.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final ApiClient _apiClient;
  final FcmService _fcmService;

  AuthBloc({
    required ApiClient apiClient,
    required FcmService fcmService,
  })  : _apiClient = apiClient,
        _fcmService = fcmService,
        super(AuthInitial()) {
    on<AuthCheckSession>(_onCheckSession);
    on<AuthLoginRequested>(_onLogin);
    on<AuthRegisterRequested>(_onRegister);
    on<AuthLogoutRequested>(_onLogout);
  }

  Future<void> _onCheckSession(
    AuthCheckSession event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final response = await _apiClient.checkSession();
      if (response.statusCode == 200 && response.data != null) {
        final user = UserModel.fromJson(response.data);
        emit(AuthAuthenticated(user));

        // Register FCM token for push notifications (fire-and-forget)
        _fcmService.registerToken(user.id);
      } else {
        emit(AuthUnauthenticated());
      }
    } catch (e) {
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onLogin(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final response = await _apiClient.login(
        identifier: event.identifier,
        password: event.password,
      );

      if (response.statusCode == 200 && response.data != null) {
        final user = UserModel.fromJson(response.data);
        emit(AuthAuthenticated(user));

        // Register FCM token for push notifications (fire-and-forget)
        _fcmService.registerToken(user.id);
      } else {
        final message = response.data?['message'] ?? 'Login failed. Please check your credentials.';
        emit(AuthError(message));
      }
    } catch (e) {
      emit(const AuthError('Connection error. Please check your internet and try again.'));
    }
  }

  Future<void> _onRegister(
    AuthRegisterRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final payload = UserModel.registrationPayload(
        name: event.name,
        email: event.email,
        password: event.password,
        contactNumber: event.contactNumber,
        fatherName: event.fatherName,
        address: event.address,
        courses: event.courses,
        classPreference: event.classPreference,
        preferredLocationId: event.preferredLocationId,
      );

      final response = await _apiClient.register(payload);

      if (response.statusCode == 201 && response.data != null) {
        final user = UserModel.fromJson(response.data);
        emit(AuthRegistered(user));

        // Send credentials email (fire-and-forget)
        _sendCredentialsEmail(
          recipientName: user.name,
          recipientEmail: user.email,
          userId: user.userId,
        );
      } else {
        final message = response.data?['message'] ?? 'Registration failed.';
        emit(AuthError(message));
      }
    } catch (e) {
      emit(const AuthError('Connection error. Please try again.'));
    }
  }

  /// Sends a welcome email with login credentials after registration.
  /// This is fire-and-forget — we don't block the UI if it fails.
  Future<void> _sendCredentialsEmail({
    required String recipientName,
    required String recipientEmail,
    String? userId,
  }) async {
    try {
      final userIdLine = userId != null ? 'User ID: $userId\n' : '';
      await _apiClient.sendEmail({
        'to': recipientEmail,
        'recipientName': recipientName,
        'subject': 'Welcome to Nadanaloga Fine Arts Academy - Your Login Credentials',
        'body': '''
Dear $recipientName,

Welcome to Nadanaloga Fine Arts Academy!

Your account has been created successfully. Here are your login credentials:

${userIdLine}Email: $recipientEmail

You can use either your User ID or Email to log in to the Nadanaloga mobile app.

Please keep these credentials safe.

Warm regards,
Nadanaloga Fine Arts Academy
''',
      });
    } catch (_) {
      // Silently ignore email failures — user already has credentials on screen
    }
  }

  Future<void> _onLogout(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      // Unregister FCM token before logout
      await _fcmService.unregisterToken();
      await _apiClient.logout();
      await _apiClient.clearCookies();
    } catch (_) {
      // Even if server logout fails, clear local state
    }
    emit(AuthUnauthenticated());
  }
}
