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
              _buildSliverAppBar(context, loc),
              _buildStoreHeaderInfo(loc),
              _buildStoreMenu(productsAsync, ref, loc),
              const SliverToBoxAdapter(child: SizedBox(height: 120)),
            ],
          ),
          if (cartItems.isNotEmpty) _buildBottomCartBar(context, cartItems.length, totalAmount, loc),
        ],
      ),
    );
  }

  SliverAppBar _buildSliverAppBar(BuildContext context, AppLocalizations loc) {
    return SliverAppBar(
      expandedHeight: 240,
      pinned: true,
      backgroundColor: AppColors.primary,
      elevation: 0,
      leading: Padding(
        padding: const EdgeInsets.only(right: 12),
        child: _buildHeaderAction(Icons.arrow_back_ios_new_rounded, () => context.pop()),
      ),
      actions: [
        Padding(
          padding: const EdgeInsets.only(left: 12),
          child: _buildHeaderAction(Icons.favorite_border_rounded, () {}),
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        centerTitle: true,
        title: Text('القـائـمـة الـمـمـيـزة', style: AppTextStyles.titleMedium.copyWith(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
        background: Stack(
          fit: StackFit.expand,
          children: [
            CachedNetworkImage(
              imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800',
              fit: BoxFit.cover,
              placeholder: (context, url) => Container(color: AppColors.primary),
            ),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.primaryDark.withValues(alpha: 0.8), Colors.transparent, Colors.black.withValues(alpha: 0.4)],
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderAction(IconData icon, VoidCallback onTap) {
    return Center(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: AppShadows.subtle),
          child: Icon(icon, color: AppColors.primary, size: 20),
        ),
      ),
    );
  }

  Widget _buildStoreHeaderInfo(AppLocalizations loc) {
    return SliverToBoxAdapter(
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.xl),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(AppRadius.xxl)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('بايت أند مور (Byte & More)', style: AppTextStyles.displayMedium.copyWith(fontSize: 22)),
                _buildStatusBadge(),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildInfoTag(Icons.star_rounded, '4.9 (500+)', AppColors.accent),
                const SizedBox(width: 12),
                _buildInfoTag(Icons.access_time_filled_rounded, '25-35 دقيقة', AppColors.info),
                const SizedBox(width: 12),
                _buildInfoTag(Icons.delivery_dining_rounded, '1,500 ج.س', AppColors.success),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppRadius.pill)),
      child: const Text('مفتوح', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.w900, fontSize: 11)),
    );
  }

  Widget _buildInfoTag(IconData icon, String label, Color color) {
    return Row(
      children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 4),
        Text(label, style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
      ],
    );
  }

  Widget _buildStoreMenu(AsyncValue<List<dynamic>> productsAsync, WidgetRef ref, AppLocalizations loc) {
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
            (context, i) => _buildPremiumProductCard(context, ref, products[i], loc),
            childCount: products.length,
          ),
        ),
      ),
      loading: () => const SliverFillRemaining(child: Center(child: CircularProgressIndicator(color: AppColors.primary))),
      error: (err, _) => SliverFillRemaining(child: Center(child: Text('خطأ: $err'))),
    );
  }

  Widget _buildPremiumProductCard(BuildContext context, WidgetRef ref, dynamic product, AppLocalizations loc) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 15, offset: const Offset(0, 8))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
            child: CachedNetworkImage(
              imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=300&h=200',
              height: 120, width: double.infinity, fit: BoxFit.cover,
              placeholder: (_, __) => Container(color: AppColors.greyLight),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.name, style: AppTextStyles.bodySm.copyWith(fontWeight: FontWeight.w900), maxLines: 1),
                Text(product.description, style: AppTextStyles.caption.copyWith(color: AppColors.textHint), maxLines: 1),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('${product.price} ج.س', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.primary)),
                    GestureDetector(
                      onTap: () {
                        ref.read(cartProvider.notifier).addProduct(product);
                        _showAddFeedback(context, product.name);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                        child: const Icon(Icons.add_rounded, color: Colors.white, size: 20),
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
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  Widget _buildBottomCartBar(BuildContext context, int count, double total, AppLocalizations loc) {
    return Positioned(
      bottom: 24, left: 16, right: 16,
      child: Container(
        height: 70,
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(AppRadius.pill),
          boxShadow: [
            BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 10))
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
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
                  child: Text('$count', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
                ),
                const Text('مشاهدة سلة المشتريات', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
                Text('${total.toStringAsFixed(0)} ج.س', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

