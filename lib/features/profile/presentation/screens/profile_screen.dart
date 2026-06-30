import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:wassalk_app/core/localization/app_localizations.dart';
import 'package:wassalk_app/core/localization/locale_provider.dart';
import 'package:wassalk_app/core/theme/app_colors.dart';
import 'package:wassalk_app/core/theme/ui_constants.dart';
import 'package:wassalk_app/features/auth/presentation/providers/auth_providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userState = ref.watch(authProvider);
    final loc = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: userState.when(
        data: (user) => user == null ? _buildPremiumGuestView(context, loc) : _buildPremiumAuthProfile(context, ref, user, loc),
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (err, st) => Center(child: Text('خطأ في جلب البيانات: $err')),
      ),
    );
  }

  Widget _buildPremiumGuestView(BuildContext context, AppLocalizations loc) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.xl),
              decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.05), shape: BoxShape.circle),
              child: const Icon(Icons.account_circle_outlined, size: 100, color: AppColors.primary),
            ),
            const SizedBox(height: 32),
            Text(loc.welcomeMessage, style: AppTextStyles.displayMedium.copyWith(fontSize: 24)),
            const SizedBox(height: 12),
            Text('سجل دخولك لتتمكن من الوصول لجميع الميزات الرائعة وإدارة طلباتك بكل سهولة.', textAlign: TextAlign.center, style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary)),
            const SizedBox(height: 48),
            SizedBox(
              width: 240,
              height: 55,
              child: ElevatedButton(
                onPressed: () => context.push('/login'),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.pill))),
                child: Text('${loc.loginTitle} / ${loc.createNewAccount}', style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPremiumAuthProfile(BuildContext context, WidgetRef ref, dynamic user, AppLocalizations loc) {
    return CustomScrollView(
      slivers: [
        _buildSliverHeader(user, loc),
        SliverPadding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              _buildSectionTitle('إدارة الحساب'),
              const SizedBox(height: 12),
              _buildModernMenu([
                _buildMenuItem(Icons.location_on_rounded, 'عناوين التوصيل', Colors.blue, () {}),
                _buildMenuItem(Icons.history_rounded, loc.myOrders, Colors.orange, () => context.push('/orders')),
                _buildMenuItem(Icons.favorite_rounded, 'المتاجر المفضلة', Colors.redAccent, () {}),
                _buildMenuItem(Icons.payment_rounded, 'طرق الدفع', Colors.green, () {}),
              ]),
              const SizedBox(height: 32),
              _buildSectionTitle('الإعدادات والدعم'),
              const SizedBox(height: 12),
              _buildModernMenu([
                _buildMenuItem(Icons.notifications_active_rounded, 'الإشعارات', Colors.purple, () {}),
                _buildMenuItem(
                  Icons.language_rounded, 
                  'اللغة: ${ref.watch(localeProvider).languageCode == 'ar' ? 'العربية' : 'English'}', 
                  Colors.blue, 
                  () => ref.read(localeProvider.notifier).toggleLocale()
                ),
                _buildMenuItem(Icons.help_center_rounded, 'مركز المساعدة', Colors.indigo, () {}),
                _buildMenuItem(Icons.info_rounded, 'حول التطبيق', Colors.blueGrey, () {}),
              ]),
              const SizedBox(height: 32),
              _buildModernMenu([
                _buildMenuItem(Icons.logout_rounded, loc.logout, AppColors.error, () => _showLogoutDialog(context, ref, loc), isLast: true),
              ]),
              const SizedBox(height: 100),
            ]),
          ),
        ),
      ],
    );
  }

  SliverAppBar _buildSliverHeader(dynamic user, AppLocalizations loc) {
    return SliverAppBar(
      expandedHeight: 280,
      pinned: true,
      backgroundColor: AppColors.primary,
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            Container(decoration: const BoxDecoration(gradient: LinearGradient(colors: [AppColors.primary, AppColors.primaryDark], begin: Alignment.topCenter, end: Alignment.bottomCenter))),
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: 40),
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: AppShadows.elevated),
                    child: const CircleAvatar(radius: 50, backgroundImage: CachedNetworkImageProvider('https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop')),
                  ),
                  const SizedBox(height: 16),
                  Text(user.name ?? 'مستخدم وصلك', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 22)),
                  Text(user.phone ?? '', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(title, style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w900, letterSpacing: -0.5));
  }

  Widget _buildModernMenu(List<Widget> items) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 20, offset: const Offset(0, 10))],
      ),
      child: Column(children: items),
    );
  }

  Widget _buildMenuItem(IconData icon, String label, Color color, VoidCallback onTap, {bool isLast = false}) {
    return Column(
      children: [
        ListTile(
          onTap: onTap,
          leading: Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)), child: Icon(icon, color: color, size: 22)),
          title: Text(label, style: AppTextStyles.bodySm.copyWith(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.textHint),
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        ),
        if (!isLast) const Divider(height: 1, color: AppColors.divider, indent: 20, endIndent: 20),
      ],
    );
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref, AppLocalizations loc) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.xxl)),
        title: Text(loc.logout, style: const TextStyle(fontWeight: FontWeight.bold)),
        content: const Text('هل أنت متأكد أنك تريد مغادرة حسابك حالياً؟'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(authProvider.notifier).logout();
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: Text(loc.logout),
          ),
        ],
      ),
    );
  }
}

