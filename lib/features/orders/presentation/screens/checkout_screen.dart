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
  String _selectedPayment = 'cash';
  final _addressController = TextEditingController(text: 'الخرطوم، شارع الستين، بالقرب من كنار');

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
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
          ),
        ),
      );
    });

    final checkoutState = ref.watch(checkoutProvider);
    final total = ref.read(cartProvider.notifier).totalAmount;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(loc.checkout, style: AppTextStyles.titleMedium.copyWith(fontWeight: FontWeight.w900)),
        centerTitle: true,
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary),
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
            
            _buildSectionHeader('ملخص الطلب النهائي', Icons.receipt_long_rounded),
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
        Text(title, style: AppTextStyles.titleMedium.copyWith(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
      ],
    );
  }

  Widget _buildAddressInput(AppLocalizations loc) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 20, offset: const Offset(0, 8))
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          TextField(
            controller: _addressController,
            maxLines: 2,
            style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              hintText: 'أدخل تفاصيل العنوان الدقيقة...',
              hintStyle: const TextStyle(color: AppColors.textHint, fontSize: 13),
              filled: true,
              fillColor: AppColors.greyLight.withValues(alpha: 0.5),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.lg), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.all(16),
            ),
          ),
          const SizedBox(height: 16),
          InkWell(
            onTap: () {},
            borderRadius: BorderRadius.circular(AppRadius.lg),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                borderRadius: BorderRadius.circular(AppRadius.lg),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.map_rounded, color: AppColors.primary, size: 18),
                  const SizedBox(width: 8),
                  Text('استخدام الخريطة لتحديد أدق', style: AppTextStyles.bodySm.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentSelection(AppLocalizations loc) {
    return Column(
      children: [
        _buildPaymentCard('cash', 'الدفع عند الاستلام', 'كاش', Icons.money_rounded),
        const SizedBox(height: 12),
        _buildPaymentCard('bankak', 'تطبيق بنكك (Bankak)', 'تحويل', Icons.account_balance_rounded),
      ],
    );
  }

  Widget _buildPaymentCard(String id, String title, String sub, IconData icon) {
    bool isSelected = _selectedPayment == id;
    return GestureDetector(
      onTap: () => setState(() => _selectedPayment = id),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withValues(alpha: 0.05) : AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.xl),
          border: Border.all(color: isSelected ? AppColors.primary : AppColors.divider.withValues(alpha: 0.5), width: 1.5),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: isSelected ? AppColors.primary : AppColors.greyLight, shape: BoxShape.circle),
              child: Icon(icon, color: isSelected ? Colors.white : AppColors.textSecondary, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: AppTextStyles.bodyLarge.copyWith(fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600)),
                  Text(sub, style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                ],
              ),
            ),
            if (isSelected) const Icon(Icons.check_circle_rounded, color: AppColors.primary),
          ],
        ),
      ),
    );
  }

  Widget _buildPremiumBillSummary(double total, AppLocalizations loc) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.secondary, AppColors.secondary.withValues(alpha: 0.9)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        boxShadow: [
          BoxShadow(color: AppColors.secondary.withValues(alpha: 0.2), blurRadius: 20, offset: const Offset(0, 10))
        ],
      ),
      child: Column(
        children: [
          _buildSummaryRow(loc.totalProducts, '${total.toStringAsFixed(0)} ج.س', Colors.white70),
          const SizedBox(height: 12),
          _buildSummaryRow('رسوم التوصيل المتميزة', '1,500 ج.س', Colors.white70),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Divider(color: Colors.white24, height: 1),
          ),
          _buildSummaryRow(loc.totalAmount, '${(total + 1500).toStringAsFixed(0)} ج.س', Colors.white, isGrand: true),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, Color textColor, {bool isGrand = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: textColor, fontSize: isGrand ? 16 : 14, fontWeight: isGrand ? FontWeight.w900 : FontWeight.w500)),
        Text(value, style: TextStyle(color: textColor, fontSize: isGrand ? 22 : 14, fontWeight: FontWeight.w900)),
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
          BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 10))
        ],
      ),
      child: ElevatedButton(
        onPressed: isLoading ? null : () {
          ref.read(checkoutProvider.notifier).submitOrder(_addressController.text, _selectedPayment);
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.pill)),
        ),
        child: isLoading
            ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3))
            : const Text('تأكيد الطلب الآن', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
      ),
    );
  }
}

