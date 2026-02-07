import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary Brand Colors
  static const Color primary = Color(0xFF1A237E); // Deep Indigo
  static const Color primaryLight = Color(0xFF534BAE);
  static const Color primaryDark = Color(0xFF000051);
  static const Color secondary = Color(0xFFFFC107); // Amber
  static const Color secondaryLight = Color(0xFFFFF350);
  static const Color secondaryDark = Color(0xFFC79100);

  // Role-specific accent colors
  static const Color adminAccent = Color(0xFF1A237E); // Indigo
  static const Color teacherAccent = Color(0xFF00897B); // Teal
  static const Color studentAccent = Color(0xFF7B1FA2); // Purple

  // Neutral Colors
  static const Color background = Color(0xFFF8F9FA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color cardBackground = Color(0xFFFFFFFF);
  static const Color divider = Color(0xFFE8ECF0);

  // Text Colors
  static const Color textPrimary = Color(0xFF1A1D26);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color textHint = Color(0xFF9CA3AF);
  static const Color textOnPrimary = Color(0xFFFFFFFF);
  static const Color textOnSecondary = Color(0xFF212121);

  // Status Colors
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color info = Color(0xFF3B82F6);

  // Course-specific Colors (Modern & Vibrant)
  static const Color courseDance = Color(0xFFEC4899);      // Pink
  static const Color courseVocal = Color(0xFFF97316);      // Orange
  static const Color courseVeena = Color(0xFF14B8A6);      // Teal
  static const Color courseViolin = Color(0xFF8B5CF6);     // Purple
  static const Color courseMridangam = Color(0xFFEF4444);  // Red
  static const Color courseFlute = Color(0xFF06B6D4);      // Cyan
  static const Color courseDefault = Color(0xFF6366F1);    // Indigo

  // Course Gradients
  static const List<Color> gradientDance = [Color(0xFFEC4899), Color(0xFFF472B6)];
  static const List<Color> gradientVocal = [Color(0xFFF97316), Color(0xFFFB923C)];
  static const List<Color> gradientVeena = [Color(0xFF14B8A6), Color(0xFF2DD4BF)];
  static const List<Color> gradientViolin = [Color(0xFF8B5CF6), Color(0xFFA78BFA)];
  static const List<Color> gradientMridangam = [Color(0xFFEF4444), Color(0xFFF87171)];
  static const List<Color> gradientFlute = [Color(0xFF06B6D4), Color(0xFF22D3EE)];
  static const List<Color> gradientDefault = [Color(0xFF6366F1), Color(0xFF818CF8)];

  // Card shadows
  static List<BoxShadow> get cardShadow => [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.04),
      blurRadius: 10,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> get cardShadowHover => [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.08),
      blurRadius: 20,
      offset: const Offset(0, 8),
    ),
  ];

  // Generate a vibrant color from course name hash (for unknown courses)
  static Color _generateColorFromName(String name) {
    // Use hash to generate consistent HSL color
    int hash = 0;
    for (int i = 0; i < name.length; i++) {
      hash = name.codeUnitAt(i) + ((hash << 5) - hash);
    }
    // Generate hue in the 0-360 range
    final hue = (hash.abs() % 360).toDouble();
    // Use fixed saturation (70%) and lightness (45%) for vibrant colors
    return HSLColor.fromAHSL(1.0, hue, 0.70, 0.45).toColor();
  }

  // Generate a gradient from base color
  static List<Color> _generateGradientFromColor(Color baseColor) {
    final hsl = HSLColor.fromColor(baseColor);
    final lighterColor = hsl.withLightness((hsl.lightness + 0.15).clamp(0.0, 1.0)).toColor();
    return [baseColor, lighterColor];
  }

  // Get course color by name
  static Color getCourseColor(String courseName) {
    final name = courseName.toLowerCase();
    if (name.contains('bharatanatyam') || name.contains('dance')) return courseDance;
    if (name.contains('vocal') || name.contains('singing')) return courseVocal;
    if (name.contains('veena')) return courseVeena;
    if (name.contains('violin')) return courseViolin;
    if (name.contains('mridangam') || name.contains('drum')) return courseMridangam;
    if (name.contains('flute')) return courseFlute;
    // Generate color for unknown courses based on name hash
    return _generateColorFromName(courseName);
  }

  // Get course gradient by name
  static List<Color> getCourseGradient(String courseName) {
    final name = courseName.toLowerCase();
    if (name.contains('bharatanatyam') || name.contains('dance')) return gradientDance;
    if (name.contains('vocal') || name.contains('singing')) return gradientVocal;
    if (name.contains('veena')) return gradientVeena;
    if (name.contains('violin')) return gradientViolin;
    if (name.contains('mridangam') || name.contains('drum')) return gradientMridangam;
    if (name.contains('flute')) return gradientFlute;
    // Generate gradient for unknown courses
    return _generateGradientFromColor(_generateColorFromName(courseName));
  }

  // Dark Theme Colors
  static const Color darkBackground = Color(0xFF121212);
  static const Color darkSurface = Color(0xFF1E1E1E);
  static const Color darkCard = Color(0xFF2C2C2C);
  static const Color darkTextPrimary = Color(0xFFE0E0E0);
  static const Color darkTextSecondary = Color(0xFF9E9E9E);
}
