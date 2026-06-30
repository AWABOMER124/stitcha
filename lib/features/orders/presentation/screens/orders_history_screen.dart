import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:wassalk_app/core/localization/app_localizations.dart';
import 'package:wassalk_app/core/theme/app_colors.dart';
import 'package:wassalk_app/core/theme/ui_constants.dart';
import 'package:wassalk_app/features/auth/presentation/providers/auth_providers.dart';

class OrdersHistoryScreen extends ConsumerStatefulWidget {
  const OrdersHistoryScreen({super.key});

  @override
  ConsumerState<OrdersHistoryScreen> createState() => _OrdersHistoryScreenState();
}

class _OrdersHistoryScreenState extends ConsumerState<OrdersHistoryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final userState = ref.watch(authProvider);
    final loc = AppLocalizations.of(context)!;

    return userState.when(
      data: (user) => user == null ? _buildGuestView(loc) : _buildHistoryContent(loc),
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (err, _) => Scaffold(body: Center(child: Text('Error: $err'))),
    );
  }

  Widget _buildGuestView(AppLocalizations loc) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.receipt_long_rounded, size: 80, color: AppColors.greyMedium),
              const SizedBox(height: 24),
              Text(loc.myOrders, style: AppTextStyles.titleLarge),
              const SizedBox(height: 12),
              const Text('سجل دخولك لمشاهدة تاريخ طلباتك وتتبعها بكل سهولة.', textAlign: TextAlign.center, style: AppTextStyles.bodySm),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () => context.push('/login'),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.pill))),
                child: const Text('تسجيل الدخول', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHistoryContent(AppLocalizations loc) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(loc.myOrders, style: AppTextStyles.titleMedium.copyWith(fontWeight: FontWeight.w900)),
        centerTitle: true,
        backgroundColor: AppColors.surface,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textHint,
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          labelStyle: AppTextStyles.bodySm.copyWith(fontWeight: FontWeight.w900),
          tabs: const [Tab(text: 'الطلبات النشطة'), Tab(text: 'الطلبات السابقة')],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildActiveOrdersList(loc),
          _buildPastOrdersList(loc),
        ],
      ),
    );
  }

  Widget _buildActiveOrdersList(AppLocalizations loc) {
    return ListView.builder(
      padding: const EdgeInsets.all(AppSpacing.xl),
      itemCount: 1,
      itemBuilder: (context, index) => _buildOrderCard(context, 1025, 'delivering', '24 مارس، 10:45 ص', '12,400', 3, loc),
    );
  }

  Widget _buildPastOrdersList(AppLocalizations loc) {
    return ListView.builder(
      padding: const EdgeInsets.all(AppSpacing.xl),
      itemCount: 3,
      itemBuilder: (context, index) => _buildOrderCard(context, 1022 - index, 'completed', '22 مارس، 08:30 م', '8,250', 2, loc),
    );
  }

  Widget _buildOrderCard(BuildContext context, int id, String status, String date, String price, int items, AppLocalizations loc) {
    bool isActive = status != 'completed';
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 15, offset: const Offset(0, 8))
        ],
        border: isActive ? Border.all(color: AppColors.primary.withValues(alpha: 0.15)) : null,
      ),
      child: InkWell(
        onTap: () => context.push('/tracking/$id'),
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Row(
                children: [
                   _buildStatusIcon(status),
                   const SizedBox(width: 16),
                   Expanded(
                     child: Column(
                       crossAxisAlignment: CrossAxisAlignment.start,
                       children: [
                         Text('طلب رقم #$id', style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                         _buildStatusText(status),
                       ],
                     ),
                   ),
                   const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.textHint),
                ],
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Divider(color: AppColors.divider, height: 1),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildOrderMetric('تاريخ الطلب', date),
                  _buildOrderMetric('الإجمالي', '$price ج.س', isPrice: true),
                  _buildOrderMetric('عدد العناصر', '$items عناصر'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusIcon(String status) {
    IconData icon = Icons.delivery_dining_rounded;
    Color color = AppColors.primary;
    if (status == 'completed') {
      icon = Icons.check_circle_rounded;
      color = AppColors.success;
    }
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.08), shape: BoxShape.circle),
      child: Icon(icon, color: color, size: 24),
    );
  }

  Widget _buildStatusText(String status) {
    String text = 'في الطريق إليك';
    Color color = AppColors.primary;
    if (status == 'completed') {
      text = 'تم التوصيل بنجاح';
      color = AppColors.textSecondary;
    }
    return Text(text, style: AppTextStyles.caption.copyWith(color: color, fontWeight: FontWeight.bold));
  }

  Widget _buildOrderMetric(String label, String value, {bool isPrice = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.caption.copyWith(color: AppColors.textHint, fontSize: 10)),
        const SizedBox(height: 4),
        Text(value, style: AppTextStyles.bodySm.copyWith(
          fontWeight: FontWeight.w900, 
          color: isPrice ? AppColors.primary : AppColors.textPrimary,
          fontSize: 12,
        )),
      ],
    );
  }
}

