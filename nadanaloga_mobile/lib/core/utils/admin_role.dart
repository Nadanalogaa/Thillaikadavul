import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../presentation/bloc/auth/auth_bloc.dart';
import '../../presentation/bloc/auth/auth_state.dart';

/// Staff admins can view, add and edit. Only the super admin can delete,
/// reverse a receipt or close an extra bill (the server enforces this and
/// answers 403 otherwise), so those actions are hidden for staff admins.
bool isSuperAdminOf(BuildContext context) {
  try {
    final s = context.read<AuthBloc>().state;
    return s is AuthAuthenticated && s.user.isSuperAdmin;
  } catch (_) {
    return false;
  }
}

/// The server's own message from an error response, or [fallback].
String serverMessage(Response r, String fallback) {
  final d = r.data;
  if (d is Map && d['message'] is String && (d['message'] as String).isNotEmpty) {
    return d['message'] as String;
  }
  if (r.statusCode == 403) {
    return 'Only the super admin can do this. Please ask the super admin.';
  }
  return fallback;
}

void showErrorSnack(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(message), backgroundColor: Colors.red.shade700),
  );
}
