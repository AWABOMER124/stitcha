import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:wassalk_app/core/localization/app_localizations.dart';
import 'package:wassalk_app/core/theme/app_colors.dart';
import 'package:wassalk_app/core/theme/ui_constants.dart';
import 'package:wassalk_app/features/orders/presentation/providers/order_providers.dart';
import 'package:wassalk_app/features/cart/presentation/providers/cart_providers.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  static const _selectedPayment = 'cash';
  final _addressController = TextEditingController();

  @override
  void dispose() {
    _addressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context)!;

    ref.listen(checkoutProvider, (previous, next) {
      next.whenData((order) {
        if (order != null) context.go('/tracking/${order.id}');
      });
      next.whenOrNull(
        error: (err, st) => ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('حدث خطأ: $err'),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.md)),
          ),
        ),
      );
    });

    final checkoutState = ref.watch(checkoutProvider);
    final total = ref.read(cartProvider.notifier).totalAmount;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(loc.checkout,
            style: AppTextStyles.titleMedium
                .copyWith(fontWeight: FontWeight.w900)),
        centerTitle: true,
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader(loc.deliveryAddress, Icons.location_on_rounded),
            const SizedBox(height: 16),
            _buildAddressInput(loc),
            const SizedBox(height: 32),
            _buildSectionHeader(loc.paymentMethod, Icons.payment_rounded),
            const SizedBox(height: 16),
            _buildPaymentSelection(loc),
            const SizedBox(height: 32),
            _buildSectionHeader(
                'ملخص الطلب النهائي', Icons.receipt_long_rounded),
            const SizedBox(height: 16),
            _buildPremiumBillSummary(total, loc),
            const SizedBox(height: 48),
            _buildPlaceOrderButton(checkoutState.isLoading, loc),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppColors.primary, size: 20),
        const SizedBox(width: 8),
        Text(title,
            style: AppTextStyles.titleMedium.copyWith(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.5)),
      ],
    );
  }

  Widget _buildAddressInput(AppLocalizations loc) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 20,
              offset: const Offset(0, 8))
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          TextField(
            controller: _addressController,
            maxLines: 2,
            style:
                AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              hintText: 'أدخل تفاصيل العنوان الدقيقة...',
              hintStyle:
                  const TextStyle(color: AppColors.textHint, fontSize: 13),
              filled: true,
              fillColor: AppColors.greyLight.withValues(alpha: 0.5),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.all(16),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentSelection(AppLocalizations loc) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(color: AppColors.primary, width: 1.5),
      ),
      child: const Row(
        children: [
          CircleAvatar(
            backgroundColor: AppColors.primary,
            child: Icon(Icons.money_rounded, color: Colors.white),
          ),
          SizedBox(width: 16),
          Expanded(
              child: Text('الدفع نقدًا عند الاستلام',
                  style: TextStyle(fontWeight: FontWeight.w900))),
          Icon(Icons.check_circle_rounded, color: AppColors.primary),
        ],
      ),
    );
  }

  Widget _buildPremiumBillSummary(double total, AppLocalizations loc) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.secondary,
            AppColors.secondary.withValues(alpha: 0.9)
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        boxShadow: [
          BoxShadow(
              color: AppColors.secondary.withValues(alpha: 0.2),
              blurRadius: 20,
              offset: const Offset(0, 10))
        ],
      ),
      child: Column(
        children: [
          _buildSummaryRow(loc.totalProducts, '${total.toStringAsFixed(0)} ج.س',
              Colors.white70),
          const SizedBox(height: 12),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Divider(color: Colors.white24, height: 1),
          ),
          _buildSummaryRow(
              loc.totalAmount, '${total.toStringAsFixed(0)} ج.س', Colors.white,
              isGrand: true),
          const SizedBox(height: 10),
          const Text(
            'سيؤكد الخادم أي رسوم توصيل مطبقة قبل إنشاء الطلب.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white70, fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, Color textColor,
      {bool isGrand = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: TextStyle(
                color: textColor,
                fontSize: isGrand ? 16 : 14,
                fontWeight: isGrand ? FontWeight.w900 : FontWeight.w500)),
        Text(value,
            style: TextStyle(
                color: textColor,
                fontSize: isGrand ? 22 : 14,
                fontWeight: FontWeight.w900)),
      ],
    );
  }

  Widget _buildPlaceOrderButton(bool isLoading, AppLocalizations loc) {
    return Container(
      width: double.infinity,
      height: 65,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.pill),
        boxShadow: [
          BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.3),
              blurRadius: 20,
              offset: const Offset(0, 10))
        ],
      ),
      child: ElevatedButton(
        onPressed: isLoading
            ? null
            : () {
                ref
                    .read(checkoutProvider.notifier)
                    .submitOrder(_addressController.text, _selectedPayment);
              },
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.pill)),
        ),
        child: isLoading
            ? const SizedBox(
                height: 24,
                width: 24,
                child: CircularProgressIndicator(
                    color: Colors.white, strokeWidth: 3))
            : const Text('تأكيد الطلب الآن',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
      ),
    );
  }
}
