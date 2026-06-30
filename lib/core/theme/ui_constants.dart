import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Spacing, radius, shadows, durations, and text styles — no AppColors redefinition
class AppSpacing {
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
  static const double xxxl = 64.0;
}

class AppRadius {
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double pill = 999.0;
}

class AppShadows {
  static List<BoxShadow> get card => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.06),
          blurRadius: 20,
          spreadRadius: 0,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> get elevated => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.10),
          blurRadius: 30,
          spreadRadius: 0,
          offset: const Offset(0, 12),
        ),
      ];

  static List<BoxShadow> get subtle => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.04),
          blurRadius: 10,
          spreadRadius: 0,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get primaryGlow => [
        BoxShadow(
          color: AppColors.primary.withValues(alpha: 0.35),
          blurRadius: 20,
          spreadRadius: 0,
          offset: const Offset(0, 8),
        ),
      ];
}

class AppDurations {
  static const fast = Duration(milliseconds: 200);
  static const normal = Duration(milliseconds: 350);
  static const slow = Duration(milliseconds: 500);
}

class AppTextStyles {
  static const TextStyle displayLarge = TextStyle(
    fontSize: 36,
    fontWeight: FontWeight.w800,
    color: AppColors.textPrimary,
    height: 1.2,
  );

  static const TextStyle displayMedium = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: AppColors.textPrimary,
    height: 1.3,
  );

  static const TextStyle titleLarge = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.bold,
    color: AppColors.textPrimary,
  );

  static const TextStyle titleMedium = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
  );

  static const TextStyle bodyLarge = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.normal,
    color: AppColors.textPrimary,
  );

  static const TextStyle bodySm = TextStyle(
    fontSize: 13,
    color: AppColors.textSecondary,
  );

  static const TextStyle caption = TextStyle(
    fontSize: 11,
    color: AppColors.textHint,
    letterSpacing: 0.5,
  );
}
