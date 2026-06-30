import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:wassalk_app/core/localization/app_localizations.dart';
import 'package:wassalk_app/core/theme/app_colors.dart';
import 'package:wassalk_app/core/theme/ui_constants.dart';
import '../providers/auth_providers.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen>
    with SingleTickerProviderStateMixin {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _showPassword = false;
  bool _agreedToTerms = false;
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
    _nameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context)!;
    
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

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Background Decor
          Positioned(
            top: -50,
            left: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withValues(alpha: 0.05),
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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 20),
                      IconButton(
                        onPressed: () => context.pop(),
                        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary),
                        style: IconButton.styleFrom(
                          backgroundColor: AppColors.surface,
                          padding: const EdgeInsets.all(12),
                          shadowColor: Colors.black12,
                          elevation: 2,
                        ),
                      ),
                      const SizedBox(height: 32),
                      
                      const Hero(
                        tag: 'auth_header',
                        child: Text(
                          'إنشــاء حســاب 👋',
                          style: TextStyle(
                            fontSize: 32, 
                            fontWeight: FontWeight.w900, 
                            color: AppColors.textPrimary,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'انضم إلى مجتمع وصلك واحصل على مزايا حصرية',
                        style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
                      ),
                      
                      const SizedBox(height: 48),

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
                          children: [
                            _buildPremiumField(
                              controller: _nameController,
                              label: 'الاسم الكامل',
                              icon: Icons.person_outline_rounded,
                            ),
                            const SizedBox(height: 20),
                            _buildPremiumField(
                              controller: _phoneController,
                              label: loc.phoneNumber,
                              icon: Icons.phone_android_rounded,
                              keyboardType: TextInputType.phone,
                              isLtr: true,
                            ),
                            const SizedBox(height: 20),
                            _buildPremiumField(
                              controller: _passwordController,
                              label: loc.password,
                              icon: Icons.lock_outline_rounded,
                              isPassword: true,
                              showPassword: _showPassword,
                              onToggle: () => setState(() => _showPassword = !_showPassword),
                            ),
                            
                            const SizedBox(height: 20),
                            
                            // Terms checkbox
                            Row(
                              children: [
                                SizedBox(
                                  height: 24,
                                  width: 24,
                                  child: Checkbox(
                                    value: _agreedToTerms,
                                    onChanged: (v) => setState(() => _agreedToTerms = v ?? false),
                                    activeColor: AppColors.primary,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                    side: const BorderSide(color: AppColors.divider, width: 1.5),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                const Expanded(
                                  child: Text(
                                    'أوافق على شروط الاستخدام وسياسة الخصوصية',
                                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                                  ),
                                ),
                              ],
                            ),
                            
                            const SizedBox(height: 32),
                            
                            _buildAuthButton(
                              label: 'إنشاء حساب جديد',
                              isLoading: authState.isLoading,
                              onPressed: (authState.isLoading || !_agreedToTerms) ? null : () {
                                ref.read(authProvider.notifier).signup(
                                  _nameController.text,
                                  _phoneController.text,
                                  _passwordController.text,
                                );
                              },
                            ),
                            
                            const SizedBox(height: 24),
                            
                            // Redirection
                            Center(
                              child: TextButton(
                                onPressed: () => context.go('/login'),
                                child: RichText(
                                  text: const TextSpan(
                                    text: 'لديك حساب بالفعل؟ ',
                                    style: AppTextStyles.bodySm,
                                    children: [
                                      TextSpan(
                                        text: 'سجّل دخولك',
                                        style: TextStyle(
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
    return Container(
      decoration: BoxDecoration(
        color: AppColors.greyLight.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(AppRadius.lg),
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
    );
  }

  Widget _buildAuthButton({
    required String label,
    required bool isLoading,
    required VoidCallback? onPressed,
  }) {
    final bool isDisabled = !isLoading && !_agreedToTerms;
    
    return Container(
      width: double.infinity,
      height: 60,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.pill),
        gradient: LinearGradient(
          colors: isDisabled 
              ? [AppColors.greyMedium, AppColors.greyMedium]
              : [AppColors.primary, AppColors.primaryDark],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        boxShadow: isDisabled ? null : [
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
}

