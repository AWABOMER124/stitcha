import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:wassalk_app/core/localization/app_localizations.dart';
import 'package:wassalk_app/core/theme/app_colors.dart';
import 'package:wassalk_app/core/theme/ui_constants.dart';
import '../providers/cart_providers.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartList = ref.watch(cartProvider);
    final total = ref.read(cartProvider.notifier).totalAmount;
    final loc = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(loc.myCart, style: AppTextStyles.titleMedium.copyWith(fontWeight: FontWeight.w900)),
        centerTitle: true,
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
      ),
      body: cartList.isEmpty
          ? _buildEmptyCart(context, loc)
          : Column(
              children: [
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                    itemCount: cartList.length,
                    itemBuilder: (context, index) => _buildPremiumCartItem(context, ref, cartList[index]),
                  ),
                ),
                _buildPremiumStickyFooter(context, ref, total, loc),
              ],
            ),
    );
  }

  Widget _buildEmptyCart(BuildContext context, AppLocalizations loc) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(40),
              decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.05), shape: BoxShape.circle),
              child: const Icon(Icons.shopping_bag_outlined, size: 100, color: AppColors.primary),
            ),
            const SizedBox(height: 32),
            Text('سـلـتـك فـارغة', style: AppTextStyles.displayMedium.copyWith(fontSize: 24)),
            const SizedBox(height: 12),
            Text('اكتشف الوجبات اللذيذة والمتاجر القريبة الآن', style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary), textAlign: TextAlign.center),
            const SizedBox(height: 40),
            SizedBox(
              width: 220,
              height: 55,
              child: ElevatedButton(
                onPressed: () => context.go('/'),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.pill))),
                child: const Text('ابدأ التسوق الآن', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPremiumCartItem(BuildContext context, WidgetRef ref, dynamic item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 15, offset: const Offset(0, 8))
        ],
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            child: CachedNetworkImage(
              imageUrl: item.product.imageUrl,
              width: 80, height: 80, fit: BoxFit.cover,
              placeholder: (context, url) => Container(color: AppColors.greyLight),
              errorWidget: (context, url, error) => Container(
                color: AppColors.greyLight,
                child: const Icon(Icons.fastfood_rounded, color: AppColors.greyMedium),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(item.product.name, style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w900)),
                ),
                Text('${item.product.price} ج.س', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w900, fontSize: 13)),
              ],
            ),
          ),
          _buildQuantityControl(ref, item),
        ],

      ),
    );
  }

  Widget _buildQuantityControl(WidgetRef ref, dynamic item) {
    return Column(
      children: [
        _buildQtyBtn(Icons.add_rounded, AppColors.primary, () => ref.read(cartProvider.notifier).updateQuantity(item.product.id, item.quantity + 1)),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        ),
        _buildQtyBtn(Icons.remove_rounded, AppColors.textHint, () => ref.read(cartProvider.notifier).updateQuantity(item.product.id, item.quantity - 1)),
      ],
    );
  }

  Widget _buildQtyBtn(IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, color: color, size: 20),
      ),
    );
  }

  Widget _buildPremiumStickyFooter(BuildContext context, WidgetRef ref, double total, AppLocalizations loc) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 20, offset: const Offset(0, -10))
        ],
      ),
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                 Text('المجموع الفرعي', style: AppTextStyles.bodyLarge.copyWith(color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                 Text('$total ج.س', style: AppTextStyles.displayMedium.copyWith(fontSize: 22, color: AppColors.primary)),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 60,
              child: ElevatedButton(
                onPressed: () {
                  final user = ref.read(authProvider).value;
                  if (user == null) {
                    _showLoginPrompt(context);
                  } else {
                    context.push('/checkout');
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.pill))),
                child: const Text('المتابعة لإتمام الطلب', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showLoginPrompt(BuildContext context) {
     showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xxl))),
      builder: (_) => Container(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.lock_person_rounded, size: 60, color: AppColors.primary),
            const SizedBox(height: 20),
            const Text('تسجيل الدخول مطلوب', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text('يرجى تسجيل الدخول لتتمكن من إتمام عملية الشراء ومتابعة طلبك بكل سهولة.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton(onPressed: () => context.push('/login'), child: const Text('تسجيل الدخول')),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

