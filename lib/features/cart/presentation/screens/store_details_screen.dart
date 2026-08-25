import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:wassalk_app/core/localization/app_localizations.dart';
import 'package:wassalk_app/core/theme/app_colors.dart';
import 'package:wassalk_app/core/theme/ui_constants.dart';
// ✅ FIXED: Import from presentation layer, never from data directly.
import 'package:wassalk_app/features/cart/presentation/providers/store_providers.dart';
import 'package:wassalk_app/features/cart/presentation/providers/cart_providers.dart';

class StoreDetailsScreen extends ConsumerWidget {
  final String storeId;
  const StoreDetailsScreen({super.key, required this.storeId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(storeProductsProvider(storeId));
    final cartItems = ref.watch(cartProvider);
    final totalAmount = ref.read(cartProvider.notifier).totalAmount;
    final loc = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              _buildSliverAppBar(context),
              _buildStoreMenu(productsAsync, ref, loc),
              const SliverToBoxAdapter(child: SizedBox(height: 120)),
            ],
          ),
          if (cartItems.isNotEmpty)
            _buildBottomCartBar(context, cartItems.length, totalAmount, loc),
        ],
      ),
    );
  }

  SliverAppBar _buildSliverAppBar(BuildContext context) {
    return SliverAppBar(
      pinned: true,
      backgroundColor: AppColors.surface,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      leading: IconButton(
        tooltip: 'رجوع',
        onPressed: () => context.pop(),
        icon: const Icon(Icons.arrow_back_ios_new_rounded),
      ),
      title: const Text(
        'المنتجات',
        style: TextStyle(fontWeight: FontWeight.w900),
      ),
    );
  }

  Widget _buildStoreMenu(AsyncValue<List<dynamic>> productsAsync, WidgetRef ref,
      AppLocalizations loc) {
    return productsAsync.when(
      data: (products) => SliverPadding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        sliver: SliverGrid(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 0.72,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, i) =>
                _buildPremiumProductCard(context, ref, products[i], loc),
            childCount: products.length,
          ),
        ),
      ),
      loading: () => const SliverFillRemaining(
          child: Center(
              child: CircularProgressIndicator(color: AppColors.primary))),
      error: (_, __) => SliverFillRemaining(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off_rounded,
                    size: 56, color: AppColors.textHint),
                const SizedBox(height: 16),
                const Text(
                  'تعذر تحميل المنتجات',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                const Text(
                  'تحقق من اتصالك ثم حاول مرة أخرى.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: () =>
                      ref.invalidate(storeProductsProvider(storeId)),
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('إعادة المحاولة'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPremiumProductCard(BuildContext context, WidgetRef ref,
      dynamic product, AppLocalizations loc) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 15,
              offset: const Offset(0, 8))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(
                top: Radius.circular(AppRadius.xxl)),
            child: product.imageUrl == null || product.imageUrl!.isEmpty
                ? Container(
                    height: 120,
                    width: double.infinity,
                    color: AppColors.greyLight,
                    child: const Icon(Icons.fastfood_rounded,
                        color: AppColors.greyMedium),
                  )
                : CachedNetworkImage(
                    imageUrl: product.imageUrl!,
                    height: 120,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    placeholder: (_, __) =>
                        Container(color: AppColors.greyLight),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.name,
                    style: AppTextStyles.bodySm
                        .copyWith(fontWeight: FontWeight.w900),
                    maxLines: 1),
                if (product.description?.isNotEmpty == true)
                  Text(product.description!,
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.textHint),
                      maxLines: 1),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('${product.price} ج.س',
                        style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            color: AppColors.primary)),
                    GestureDetector(
                      onTap: () {
                        ref.read(cartProvider.notifier).addProduct(product);
                        _showAddFeedback(context, product.name);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: const BoxDecoration(
                            color: AppColors.primary, shape: BoxShape.circle),
                        child: const Icon(Icons.add_rounded,
                            color: Colors.white, size: 20),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showAddFeedback(BuildContext context, String name) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('تمت إضافة $name بنجاح ✓'),
        backgroundColor: AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  Widget _buildBottomCartBar(
      BuildContext context, int count, double total, AppLocalizations loc) {
    return Positioned(
      bottom: 24,
      left: 16,
      right: 16,
      child: Container(
        height: 70,
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(AppRadius.pill),
          boxShadow: [
            BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.3),
                blurRadius: 20,
                offset: const Offset(0, 10))
          ],
        ),
        child: InkWell(
          onTap: () => context.push('/cart'),
          borderRadius: BorderRadius.circular(AppRadius.pill),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle),
                  child: Text('$count',
                      style: const TextStyle(
                          color: Colors.white, fontWeight: FontWeight.w900)),
                ),
                const Text('مشاهدة سلة المشتريات',
                    style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 16)),
                Text('${total.toStringAsFixed(0)} ج.س',
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
