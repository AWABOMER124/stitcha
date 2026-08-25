import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:wassalk_app/core/localization/app_localizations.dart';
import 'package:wassalk_app/core/theme/app_colors.dart';
import 'package:wassalk_app/core/theme/ui_constants.dart';
import 'package:wassalk_app/features/home/domain/store_model.dart';
import '../providers/home_providers.dart';

// Maps category index → keywords matched against store.name + store.category
const _categoryKeywords = <int, List<String>>{
  0: [
    'مطعم',
    'وجبة',
    'مشوي',
    'برجر',
    'كوشري',
    'شاورما',
    'مأكولات',
    'فتة',
    'كباب'
  ],
  1: ['بقالة', 'سوبرماركت', 'خضار', 'منتجات'],
  2: ['صيدلية', 'دواء', 'طبي', 'أدوية'],
  3: ['تسوق', 'ملابس', 'أزياء', 'إلكترونيات'],
  4: ['قهوة', 'كافيه', 'مشروب', 'عصير', 'قهاوي'],
};

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();
  int? _selectedCategoryIndex;
  String _searchQuery = '';

  final List<Map<String, dynamic>> _categories = [
    {
      'title': 'مطاعم',
      'icon': Icons.restaurant_rounded,
      'color': AppColors.primary
    },
    {
      'title': 'بقالة',
      'icon': Icons.storefront_rounded,
      'color': AppColors.success
    },
    {
      'title': 'صيدليات',
      'icon': Icons.local_pharmacy_rounded,
      'color': AppColors.info
    },
    {
      'title': 'تسوق',
      'icon': Icons.shopping_bag_rounded,
      'color': AppColors.accent
    },
    {
      'title': 'قهاوي',
      'icon': Icons.local_cafe_rounded,
      'color': const Color(0xFF8B4513)
    },
  ];

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() => _searchQuery = _searchController.text.trim());
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<StoreModel> _filterStores(List<StoreModel> stores) {
    var result = stores;
    if (_selectedCategoryIndex != null) {
      final keywords = _categoryKeywords[_selectedCategoryIndex!] ?? [];
      result = result.where((s) {
        final text = '${s.name} ${s.category}';
        return keywords.any((k) => text.contains(k));
      }).toList();
    }
    if (_searchQuery.isNotEmpty) {
      result = result
          .where((s) =>
              s.name.contains(_searchQuery) ||
              s.category.contains(_searchQuery))
          .toList();
    }
    return result;
  }

  @override
  Widget build(BuildContext context) {
    final storesAsync = ref.watch(featuredStoresProvider);
    final loc = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: storesAsync.when(
        data: (stores) => _buildBody(stores, loc),
        loading: () => _buildSkeletonLoader(),
        error: (err, _) => _buildErrorState(),
      ),
    );
  }

  Widget _buildBody(List<StoreModel> stores, AppLocalizations loc) {
    final filtered = _filterStores(stores);
    return CustomScrollView(
      slivers: [
        _buildSliverAppBar(loc),
        SliverToBoxAdapter(child: _buildSearchBar(loc)),
        SliverToBoxAdapter(child: _buildCategories(loc)),
        if (filtered.isEmpty)
          SliverFillRemaining(child: _buildEmptyFilterState())
        else ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildSectionHeader(loc.featuredRestaurants),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, i) => _buildPremiumStoreCard(context, filtered[i]),
                childCount: filtered.length,
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ],
    );
  }

  SliverAppBar _buildSliverAppBar(AppLocalizations loc) {
    return SliverAppBar(
      pinned: true,
      backgroundColor: AppColors.surface,
      elevation: 0,
      centerTitle: false,
      leadingWidth: 70,
      leading: Padding(
        padding: const EdgeInsets.only(right: 16, top: 8, bottom: 8),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.greyLight,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.divider.withValues(alpha: 0.5)),
          ),
          child: const Icon(Icons.person_rounded,
              color: AppColors.primary, size: 24),
        ),
      ),
      title: Text(
        loc.appName,
        style: AppTextStyles.titleLarge.copyWith(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  Widget _buildSearchBar(AppLocalizations loc) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.xl),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 20,
              offset: const Offset(0, 10),
            )
          ],
        ),
        child: Row(
          children: [
            const Icon(Icons.search_rounded,
                color: AppColors.primary, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: loc.searchHint,
                  border: InputBorder.none,
                  hintStyle:
                      AppTextStyles.bodySm.copyWith(color: AppColors.textHint),
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                ),
                style:
                    AppTextStyles.bodySm.copyWith(color: AppColors.textPrimary),
                textInputAction: TextInputAction.search,
              ),
            ),
            if (_searchQuery.isNotEmpty)
              IconButton(
                tooltip: 'مسح البحث',
                onPressed: () => _searchController.clear(),
                icon: const Icon(Icons.close_rounded,
                    color: AppColors.textHint, size: 20),
              )
            else
              const SizedBox.shrink(),
          ],
        ),
      ),
    );
  }

  Widget _buildCategories(AppLocalizations loc) {
    final Map<int, String> categoryLabels = {
      0: loc.catRestaurants,
      1: loc.catGrocery,
      2: loc.catPharmacy,
      3: loc.catShopping,
      4: loc.catCafe,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: _buildSectionHeader(loc.categoriesTitle),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 110,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _categories.length,
            itemBuilder: (context, i) {
              final cat = _categories[i];
              final color = cat['color'] as Color;
              final isSelected = _selectedCategoryIndex == i;
              return Semantics(
                button: true,
                selected: isSelected,
                label: categoryLabels[i] ?? cat['title'] as String,
                child: InkWell(
                  borderRadius: BorderRadius.circular(AppRadius.xxl),
                  onTap: () => setState(() {
                    _selectedCategoryIndex = isSelected ? null : i;
                  }),
                  child: Container(
                    margin: const EdgeInsets.only(left: 16),
                    child: Column(
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 68,
                          height: 68,
                          decoration: BoxDecoration(
                            color: isSelected
                                ? color.withValues(alpha: 0.12)
                                : AppColors.surface,
                            borderRadius: BorderRadius.circular(AppRadius.xxl),
                            boxShadow: [
                              BoxShadow(
                                color: color.withValues(
                                    alpha: isSelected ? 0.2 : 0.1),
                                blurRadius: 15,
                                offset: const Offset(0, 8),
                              )
                            ],
                            border: Border.all(
                              color: isSelected
                                  ? color
                                  : color.withValues(alpha: 0.1),
                              width: isSelected ? 2 : 1.5,
                            ),
                          ),
                          child: Icon(cat['icon'] as IconData,
                              color: color, size: 30),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          categoryLabels[i] ?? cat['title'] as String,
                          style: AppTextStyles.caption.copyWith(
                            fontWeight:
                                isSelected ? FontWeight.w900 : FontWeight.bold,
                            color: isSelected ? color : AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(title,
        style: AppTextStyles.titleLarge.copyWith(letterSpacing: -0.5));
  }

  Widget _buildPremiumStoreCard(BuildContext context, StoreModel store) {
    return Semantics(
      button: true,
      label: 'فتح متجر ${store.name}',
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        onTap: () => context.push('/store/${store.id}'),
        child: Container(
          margin: const EdgeInsets.only(bottom: 24),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.xxl),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 30,
                offset: const Offset(0, 12),
              )
            ],
          ),
          child: Column(
            children: [
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(AppRadius.xxl)),
                    child: store.imageUrl == null || store.imageUrl!.isEmpty
                        ? Container(
                            height: 180,
                            width: double.infinity,
                            color: AppColors.greyLight,
                            child: const Icon(Icons.storefront_rounded,
                                color: AppColors.greyMedium, size: 48),
                          )
                        : CachedNetworkImage(
                            imageUrl: store.imageUrl!,
                            height: 180,
                            width: double.infinity,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                                color: AppColors.greyLight,
                                child: const Center(
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2))),
                            errorWidget: (context, url, error) => Container(
                                height: 180,
                                color: AppColors.greyLight,
                                child: const Icon(Icons.storefront_rounded,
                                    color: AppColors.greyMedium)),
                          ),
                  ),
                  if (store.rating != null)
                    Positioned(
                      bottom: 12,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          boxShadow: AppShadows.subtle,
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.star_rounded,
                                color: AppColors.accent, size: 16),
                            const SizedBox(width: 4),
                            Text(store.rating!.toStringAsFixed(1),
                                style: const TextStyle(
                                    fontWeight: FontWeight.w900, fontSize: 13)),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(store.name,
                            style: AppTextStyles.titleMedium
                                .copyWith(fontSize: 18)),
                        const Icon(Icons.verified_rounded,
                            color: AppColors.info, size: 18),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(store.category,
                        style: AppTextStyles.bodySm
                            .copyWith(color: AppColors.textSecondary)),
                    const SizedBox(height: 16),
                    if (store.deliveryFee != null || store.deliveryTime != null)
                      Row(
                        children: [
                          if (store.deliveryFee != null)
                            _buildPremiumInfoChip(
                                Icons.delivery_dining_rounded,
                                '${store.deliveryFee!.toStringAsFixed(0)} ج.س',
                                AppColors.success),
                          if (store.deliveryFee != null &&
                              store.deliveryTime != null)
                            const SizedBox(width: 12),
                          if (store.deliveryTime != null)
                            _buildPremiumInfoChip(
                                Icons.access_time_filled_rounded,
                                store.deliveryTime!,
                                AppColors.info),
                        ],
                      )
                    else
                      Text(
                        'رسوم ووقت التوصيل يُحددان عند تأكيد الطلب',
                        style: AppTextStyles.bodySm.copyWith(
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPremiumInfoChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(label,
              style: TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w900, color: color)),
        ],
      ),
    );
  }

  Widget _buildEmptyFilterState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.search_off_rounded,
                size: 80, color: AppColors.greyMedium),
            const SizedBox(height: 24),
            const Text('لا توجد نتائج', style: AppTextStyles.titleLarge),
            const SizedBox(height: 12),
            Text(
              _searchQuery.isNotEmpty
                  ? 'لم نجد متاجر تطابق "$_searchQuery"'
                  : 'لا توجد متاجر في هذا التصنيف حالياً',
              textAlign: TextAlign.center,
              style:
                  AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 32),
            TextButton(
              onPressed: () {
                _searchController.clear();
                setState(() => _selectedCategoryIndex = null);
              },
              child: const Text('مسح الفلاتر',
                  style: TextStyle(
                      color: AppColors.primary, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSkeletonLoader() {
    return CustomScrollView(
      slivers: [
        const SliverAppBar(backgroundColor: AppColors.surface, elevation: 0),
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (_, __) => Container(
                margin: const EdgeInsets.only(bottom: 24),
                height: 280,
                decoration: BoxDecoration(
                  color: AppColors.greyLight,
                  borderRadius: BorderRadius.circular(AppRadius.xxl),
                ),
              ),
              childCount: 3,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.cloud_off_rounded,
              size: 80, color: AppColors.greyMedium),
          const SizedBox(height: 24),
          const Text('تعذر تحميل البيانات', style: AppTextStyles.titleLarge),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => ref.invalidate(featuredStoresProvider),
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white),
            child: const Text('إعادة المحاولة'),
          ),
        ],
      ),
    );
  }
}
