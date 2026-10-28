import '../constants/api_endpoints.dart';

/// Photos and uploads are stored as paths relative to the server
/// ("/uploads/photos/nda-2026-0901.jpg"). The website resolves those against
/// its own origin; the app has to spell out the server. Absolute URLs pass
/// through untouched; blank values become null so callers can fall back.
String? absoluteMediaUrl(String? url) {
  final u = url?.trim() ?? '';
  if (u.isEmpty) return null;
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) {
    return u;
  }
  final base = ApiEndpoints.baseUrl.replaceFirst(RegExp(r'/+$'), '');
  return u.startsWith('/') ? '$base$u' : '$base/$u';
}
