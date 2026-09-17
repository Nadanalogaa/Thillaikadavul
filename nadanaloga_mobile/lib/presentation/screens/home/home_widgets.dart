import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';

/// White rounded card used by every home section.
class HomeCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? color;
  final Color? borderColor;

  const HomeCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.color,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color ?? AppColors.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          width: double.infinity,
          padding: padding,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderColor ?? AppColors.divider),
          ),
          child: child,
        ),
      ),
    );
  }
}

/// Section heading with an optional trailing action ("See all").
class HomeSectionTitle extends StatelessWidget {
  final String title;
  final String? action;
  final VoidCallback? onAction;

  const HomeSectionTitle(this.title, {super.key, this.action, this.onAction});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 24, 0, 10),
      child: Row(
        children: [
          Expanded(
            child: Text(title,
                style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600)),
          ),
          if (action != null)
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(
                visualDensity: VisualDensity.compact,
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
              child: Text(action!),
            ),
        ],
      ),
    );
  }
}

/// Small coloured status label ("Paid", "₹1,350 due", "Teacher").
class StatusPill extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;

  const StatusPill(this.label, {super.key, required this.color, this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: color),
            const SizedBox(width: 3),
          ],
          Text(label,
              style: AppTextStyles.caption
                  .copyWith(color: color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

/// Initials in a soft coloured circle; the colour is stable per name.
class InitialsAvatar extends StatelessWidget {
  final String name;
  final double size;
  final Color? color;

  const InitialsAvatar(this.name, {super.key, this.size = 44, this.color});

  static const _palette = [
    Color(0xFF7B1FA2),
    Color(0xFF00897B),
    Color(0xFF1A237E),
    Color(0xFFD81B60),
    Color(0xFFF57C00),
    Color(0xFF0277BD),
  ];

  static String initials(String name) {
    final parts =
        name.trim().split(RegExp(r'[\s.]+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final c = color ??
        _palette[name.codeUnits.fold<int>(0, (a, b) => a + b) % _palette.length];
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.14),
        shape: BoxShape.circle,
      ),
      child: Text(
        initials(name),
        style: TextStyle(
          color: c,
          fontWeight: FontWeight.w700,
          fontSize: size * 0.36,
        ),
      ),
    );
  }
}

/// Muted one-line empty state inside a card.
class HomeEmptyLine extends StatelessWidget {
  final IconData icon;
  final String text;

  const HomeEmptyLine({super.key, required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return HomeCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.textHint),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text,
                style: AppTextStyles.bodyMedium
                    .copyWith(color: AppColors.textSecondary)),
          ),
        ],
      ),
    );
  }
}
