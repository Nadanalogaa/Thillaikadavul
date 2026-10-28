import 'package:flutter/material.dart';

import '../../core/utils/media_url.dart';

/// A person's photo, or their initial when there is none or it fails to
/// load. One widget so every list, card and profile shows photos the same way
/// and resolves the server path correctly.
class UserAvatar extends StatefulWidget {
  final String? photoUrl;
  final String name;
  final double radius;
  /// Background behind the initial; the initial itself is white on a strong
  /// colour and the colour itself on a pale one.
  final Color color;
  final Color? foreground;
  final double? fontSize;

  const UserAvatar({
    super.key,
    required this.photoUrl,
    required this.name,
    this.radius = 20,
    this.color = const Color(0xFF1A237E),
    this.foreground,
    this.fontSize,
  });

  @override
  State<UserAvatar> createState() => _UserAvatarState();
}

class _UserAvatarState extends State<UserAvatar> {
  bool _failed = false;

  @override
  void didUpdateWidget(covariant UserAvatar old) {
    super.didUpdateWidget(old);
    if (old.photoUrl != widget.photoUrl) _failed = false;
  }

  @override
  Widget build(BuildContext context) {
    final url = _failed ? null : absoluteMediaUrl(widget.photoUrl);
    final initial = widget.name.trim().isNotEmpty ? widget.name.trim()[0].toUpperCase() : '?';
    return CircleAvatar(
      radius: widget.radius,
      backgroundColor: widget.color,
      backgroundImage: url == null ? null : NetworkImage(url),
      onBackgroundImageError: url == null
          ? null
          : (_, __) {
              if (mounted) setState(() => _failed = true);
            },
      child: url == null
          ? Text(
              initial,
              style: TextStyle(
                color: widget.foreground ?? Colors.white,
                fontSize: widget.fontSize ?? widget.radius * 0.9,
                fontWeight: FontWeight.w600,
              ),
            )
          : null,
    );
  }
}
