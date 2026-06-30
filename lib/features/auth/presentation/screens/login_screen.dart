import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'dart:ui';
import 'package:wassalk_app/core/localization/app_localizations.dart';
import 'package:wassalk_app/core/theme/app_colors.dart';
import 'package:wassalk_app/core/theme/ui_constants.dart';
import '../providers/auth_providers.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _phoneController = TextEditingController(text: '0912345678');
  final _passwordController = TextEditingController(text: '123456');
  bool _showPassword = false;
  late AnimationController _animController;
  late Animation<double> _fadeIn;
  late Animation<Offset> _slideUp;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..forward();
    
    _fadeIn = CurvedAnimation(
      parent: _animController, 
      curve: const Interval(0.0, 0.7, curve: Curves.easeOut),
    );
    
    _slideUp = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: const Interval(0.2, 1.0, curve: Curves.easeOutCubic),
    ));
  }

  @override
  void dispose() {
    _animController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authProvider, (previous, next) {
      next.whenData((user) {
        if (user != null) context.go('/');
      });
      next.whenOrNull(
        error: (err, st) => ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(err.toString()),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
          ),
        ),
      );
    });

    final authState = ref.watch(authProvider);
    final loc = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Premium Gradient Top Decor
          Positioned(
            top: -100,
            right: -50,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withValues(alpha: 0.08),
              ),
            ),
          ),
          
          SafeArea(
            child: FadeTransition(
              opacity: _fadeIn,
              child: SlideTransition(
                position: _slideUp,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    children: [
                      const SizedBox(height: 60),
                      
                      // Logo Section
                      Hero(
                        tag: 'app_logo',
                        child: Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                blurRadius: 30,
                                offset: const Offset(0, 15),
                              )
                            ],
                          ),
                          child: const Icon(
                            Icons.delivery_dining_rounded,
                            size: 56,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 32),
                      
                      Text(
                        'وصـلـك',
                        style: AppTextStyles.displayMedium.copyWith(
                          color: AppColors.primary,
                          letterSpacing: 1.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'سجّل دخولك لتبدأ تجربة تسوق فخمة',
                        style: AppTextStyles.bodySm.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      
                      const SizedBox(height: 48),

                      // Auth Card
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.xl),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(AppRadius.xxl),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 40,
                              offset: const Offset(0, 20),
                            )
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              loc.loginTitle,
                              style: AppTextStyles.titleLarge,
                            ),
                            const SizedBox(height: 24),

                            // Phone Field
                            _buildPremiumField(
                              controller: _phoneController,
                              label: loc.phoneNumber,
                              icon: Icons.phone_android_rounded,
                              keyboardType: TextInputType.phone,
                              isLtr: true,
                            ),
                            const SizedBox(height: 20),

                            // Password Field
                            _buildPremiumField(
                              controller: _passwordController,
                              label: loc.password,
                              icon: Icons.lock_outline_rounded,
                              isPassword: true,
                              showPassword: _showPassword,
                              onToggle: () => setState(() => _showPassword = !_showPassword),
                            ),
                            
                            // Forgot password
                            Align(
                              alignment: Alignment.centerLeft,
                              child: TextButton(
                                onPressed: () {},
                                style: TextButton.styleFrom(
                                  foregroundColor: AppColors.textSecondary,
                                ),
                                child: Text(
                                  loc.forgotPassword,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w500,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ),
                            
                            const SizedBox(height: 16),

                            // Login Button
                            _buildAuthButton(
                              label: loc.loginButton,
                              isLoading: authState.isLoading,
                              onPressed: authState.isLoading ? null : () {
                                ref.read(authProvider.notifier).login(
                                      _phoneController.text,
                                      _passwordController.text,
                                    );
                              },
                            ),
                            
                            const SizedBox(height: 24),

                            // Divider
                            Row(
                              children: [
                                Expanded(child: Divider(color: AppColors.divider.withValues(alpha: 0.5))),
                                const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 16),
                                  child: Text('أو عبر', style: AppTextStyles.caption),
                                ),
                                Expanded(child: Divider(color: AppColors.divider.withValues(alpha: 0.5))),
                              ],
                            ),
                            const SizedBox(height: 24),
                            
                            // Social Login (Premium Touch)
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                _buildSocialBtn(Icons.g_mobiledata_rounded, Colors.red),
                                _buildSocialBtn(Icons.apple_rounded, Colors.black),
                                _buildSocialBtn(Icons.facebook_rounded, Colors.blue.shade800),
                              ],
                            ),

                            const SizedBox(height: 32),

                            // Sign up redirect
                            Center(
                              child: TextButton(
                                onPressed: () => context.go('/signup'),
                                child: RichText(
                                  text: TextSpan(
                                    text: '${loc.noAccount} ',
                                    style: AppTextStyles.bodySm,
                                    children: [
                                      TextSpan(
                                        text: loc.createNewAccount,
                                        style: const TextStyle(
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 48),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPremiumField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    bool isPassword = false,
    bool showPassword = false,
    VoidCallback? onToggle,
    bool isLtr = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            color: AppColors.greyLight.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: Colors.transparent),
          ),
          child: TextField(
            controller: controller,
            keyboardType: keyboardType,
            obscureText: isPassword && !showPassword,
            textAlign: isLtr ? TextAlign.left : TextAlign.start,
            textDirection: isLtr ? TextDirection.ltr : null,
            style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              hintText: label,
              hintStyle: AppTextStyles.bodySm.copyWith(color: AppColors.textHint),
              prefixIcon: Icon(icon, color: AppColors.primary, size: 22),
              suffixIcon: isPassword
                  ? IconButton(
                      icon: Icon(
                        showPassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                        color: AppColors.textHint,
                        size: 20,
                      ),
                      onPressed: onToggle,
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAuthButton({
    required String label,
    required bool isLoading,
    required VoidCallback? onPressed,
  }) {
    return Container(
      width: double.infinity,
      height: 60,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.pill),
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          )
        ],
      ),
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.white,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.pill)),
        ),
        child: isLoading
            ? const SizedBox(
                height: 24,
                width: 24,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3),
              )
            : Text(
                label,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
      ),
    );
  }

  Widget _buildSocialBtn(IconData icon, Color color) {
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.divider.withValues(alpha: 0.5)),
      ),
      child: Icon(icon, color: color, size: 32),
    );
  }
}

