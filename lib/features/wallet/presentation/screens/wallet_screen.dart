import 'package:flutter/material.dart';
import 'package:wassalk_app/core/localization/app_localizations.dart';
import 'package:wassalk_app/core/theme/app_colors.dart';
import 'package:wassalk_app/core/theme/ui_constants.dart';

class WalletScreen extends StatelessWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(loc.yourWallet, style: AppTextStyles.titleMedium.copyWith(fontWeight: FontWeight.w900)),
        centerTitle: true,
        backgroundColor: AppColors.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded, color: AppColors.textPrimary),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          children: [
            // 1. Premium Card
            _buildFintechBalanceCard(loc),
            
            const SizedBox(height: 32),
            
            // 2. Quick Actions Row
            _buildModernActionsRow(loc),
            
            const SizedBox(height: 40),
            
            // 3. Transactions List
            _buildPremiumTransactionHistory(loc),
          ],
        ),
      ),
    );
  }

  Widget _buildFintechBalanceCard(AppLocalizations loc) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark, AppColors.secondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.3),
            blurRadius: 30,
            offset: const Offset(0, 15),
          )
        ],
      ),
      child: Stack(
        children: [
          // Decorative Circle
          Positioned(
            right: -30, top: -30,
            child: Container(
              width: 120, height: 120,
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.05), shape: BoxShape.circle),
            ),
          ),
          
          Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('الرصيد المتاح', style: AppTextStyles.bodySm.copyWith(color: Colors.white70, fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(AppRadius.pill)),
                      child: const Text('PREMIUM', style: TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.w900)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    const Text('45,250', style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                    const SizedBox(width: 8),
                    Text('ج.س', style: AppTextStyles.titleMedium.copyWith(color: Colors.white60)),
                  ],
                ),
                const SizedBox(height: 32),
                Row(
                  children: [
                    _buildBalanceActionButton(Icons.add_rounded, 'شحن'),
                    const SizedBox(width: 12),
                    _buildBalanceActionButton(Icons.history_rounded, 'السجل'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBalanceActionButton(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 18),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildModernActionsRow(AppLocalizations loc) {
    return Row(
      children: [
        _buildCircularActionBtn(Icons.swap_horiz_rounded, 'تحويل رصيد', AppColors.info),
        _buildCircularActionBtn(Icons.account_balance_rounded, 'سحب بنكي', AppColors.success),
        _buildCircularActionBtn(Icons.qr_code_scanner_rounded, 'مسح QR', AppColors.primary),
      ],
    );
  }

  Widget _buildCircularActionBtn(IconData icon, String label, Color color) {
    return Expanded(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.surface,
              shape: BoxShape.circle,
              boxShadow: AppShadows.subtle,
              border: Border.all(color: AppColors.divider.withValues(alpha: 0.3)),
            ),
            child: Icon(icon, color: color, size: 26),
          ),
          const SizedBox(height: 12),
          Text(label, style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        ],
      ),
    );
  }

  Widget _buildPremiumTransactionHistory(AppLocalizations loc) {
    return Column(
      children: [
        _buildHistoryHeader(loc),
        const SizedBox(height: 16),
        _buildPremiumTransaction('دفع طلب مأكولات #99281', '- 14,500', '10:45 ص', Icons.restaurant_rounded, AppColors.error),
        _buildPremiumTransaction('شحن عبر تطبيق بنكك', '+ 50,000', 'أمس', Icons.account_balance_wallet_rounded, AppColors.success),
        _buildPremiumTransaction('استرجاع رصيد ملغى', '+ 4,500', '24 مارس', Icons.refresh_rounded, AppColors.info),
        _buildPremiumTransaction('دفع طلب صيدلية #99275', '- 8,200', '22 مارس', Icons.local_pharmacy_rounded, AppColors.error),
      ],
    );
  }

  Widget _buildHistoryHeader(AppLocalizations loc) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(loc.transactionHistory, style: AppTextStyles.titleMedium.copyWith(fontWeight: FontWeight.w900, fontSize: 18)),
        TextButton(
          onPressed: () {},
          child: Text(loc.viewAll, style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildPremiumTransaction(String title, String amount, String date, IconData icon, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(AppRadius.lg)),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTextStyles.bodySm.copyWith(fontWeight: FontWeight.w800, color: AppColors.textPrimary), maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Text(date, style: AppTextStyles.caption.copyWith(color: AppColors.textHint)),
              ],
            ),
          ),
          Text(amount, style: AppTextStyles.bodyLarge.copyWith(color: color, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
        ],
      ),
    );
  }
}

