import 'package:flutter/material.dart';

/// Single source of truth for all brand colors in Wassalk
class AppColors {
  // --- Brand (Ruby & Platinum) ---
  static const primary = Color(0xFFD61C4E); // Vibrant Modern Ruby
  static const primaryDark = Color(0xFFAD143C);
  static const primaryLight = Color(0xFFFF4D81);
  static const accent = Color(0xFFFAC213); // Premium Gold for Loyalty/Subscriptions
  static const secondary = Color(0xFF2B2B3D); // Deep Midnight Blue for Contrast
  
  // --- Surfaces ---
  static const background = Color(0xFFFBFBFD); // Off-white Platinum
  static const surface = Color(0xFFFFFFFF);
  static const surfaceElevated = Color(0xFFF2F2F7);
  static const surfaceDark = Color(0xFF1C1C1E);
  
  // --- Neutral ---
  static const greyLight = Color(0xFFF1F1F6);
  static const greyMedium = Color(0xFFC7C7CC);
  static const divider = Color(0xFFE5E5EA);
  
  // --- Text (Tiered) ---
  static const textPrimary = Color(0xFF1C1C1E); // Nearly Black
  static const textSecondary = Color(0xFF6C6C70); // Grey
  static const textHint = Color(0xFF8E8E93);
  static const textWhite = Colors.white;
  
  // --- Status & Feedback ---
  static const success = Color(0xFF34C759); // iOS-style Success Green
  static const warning = Color(0xFFFF9500); // iOS-style Warning Orange
  static const error = Color(0xFFFF3B30); // iOS-style Error Red
  static const info = Color(0xFF007AFF); // iOS-style Blue

}
