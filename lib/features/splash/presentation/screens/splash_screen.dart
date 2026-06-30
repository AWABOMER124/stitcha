import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
// ✅ FIXED: Import auth state to decide where to navigate after splash
import 'package:wassalk_app/features/auth/presentation/providers/auth_providers.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/ui_constants.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _logoController;
  late AnimationController _textController;
  late AnimationController _dotsController;

  late Animation<double> _logoScale;
  late Animation<double> _logoOpacity;
  late Animation<Offset> _textSlide;
  late Animation<double> _textOpacity;

  @override
  void initState() {
    super.initState();

    _logoController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _textController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _dotsController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();

    _logoScale = Tween<double>(begin: 0.7, end: 1.0).animate(
      CurvedAnimation(parent: _logoController, curve: Curves.elasticOut),
    );
    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _logoController, curve: const Interval(0, 0.6)),
    );
    _textSlide = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _textController, curve: Curves.easeOutCubic));
    _textOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _textController, curve: Curves.easeOut),
    );

    _logoController.forward().then((_) {
      _textController.forward();
    });

    Timer(const Duration(milliseconds: 3500), () {
      if (!mounted) return;
      // ✅ FIXED: Check auth state before navigating.
      // If user has a valid session → go Home.
      // If not authenticated → go Login.
      // The Auth Guard in app_router also protects routes,
      // but being explicit here avoids unnecessary flicker.
      final authState = ref.read(authProvider);
      final isAuthenticated = authState.value != null;
      context.go(isAuthenticated ? '/' : '/login');
    });
  }

  @override
  void dispose() {
    _logoController.dispose();
    _textController.dispose();
    _dotsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          color: AppColors.primary,
          gradient: LinearGradient(
            colors: [
              AppColors.primaryDark,
              AppColors.primary,
              AppColors.primaryLight,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Stack(
          children: [
            // Subtle background pattern or texture could go here
            SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Luxury Logo Container
                          ScaleTransition(
                            scale: _logoScale,
                            child: FadeTransition(
                              opacity: _logoOpacity,
                              child: Container(
                                width: 140,
                                height: 140,
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.2),
                                      blurRadius: 50,
                                      spreadRadius: 5,
                                      offset: const Offset(0, 20),
                                    ),
                                  ],
                                ),
                                child: const Center(
                                  child: Icon(
                                    Icons.delivery_dining_rounded,
                                    size: 75,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xl),
                          // Animated text with better typography
                          SlideTransition(
                            position: _textSlide,
                            child: FadeTransition(
                              opacity: _textOpacity,
                              child: Column(
                                children: [
                                  const Text(
                                    'وصـلـك',
                                    style: TextStyle(
                                      fontSize: 48,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.white,
                                      letterSpacing: 2.0,
                                      shadows: [
                                        Shadow(
                                          color: Colors.black26,
                                          blurRadius: 15,
                                          offset: Offset(0, 8),
                                        )
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: AppSpacing.sm),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: AppSpacing.lg,
                                      vertical: AppSpacing.xs,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(AppRadius.pill),
                                      border: Border.all(
                                        color: Colors.white.withValues(alpha: 0.2),
                                        width: 1,
                                      ),
                                    ),
                                    child: const Text(
                                      'مطاعم · بقالة · توصيل',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 14,
                                        letterSpacing: 1.2,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Loading Indicator
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.xxl),
                    child: AnimatedBuilder(
                      animation: _dotsController,
                      builder: (context, _) {
                        return Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(3, (i) {
                            final delay = i * 0.2;
                            final value = (_dotsController.value - delay).clamp(0.0, 1.0);
                            final opacity = (value < 0.5
                                ? value * 2
                                : (1 - value) * 2).clamp(0.2, 1.0);
                            return Container(
                              margin: const EdgeInsets.symmetric(horizontal: 5),
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: opacity),
                                shape: BoxShape.circle,
                              ),
                            );
                          }),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

