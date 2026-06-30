import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:wassalk_app/core/theme/app_colors.dart';
import 'package:wassalk_app/core/theme/ui_constants.dart';
import 'package:wassalk_app/core/localization/app_localizations.dart';

class MainScaffold extends StatelessWidget {
  final Widget child;
  const MainScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final String location = GoRouterState.of(context).uri.path;
    final loc = AppLocalizations.of(context)!;
    
    int currentIndex = 0;
    if (location.startsWith('/orders')) {
      currentIndex = 1;
    } else if (location.startsWith('/wallet')) currentIndex = 2;
    else if (location.startsWith('/profile')) currentIndex = 3;

    final navItems = [
      {'icon': Icons.home_filled, 'label': loc.appName, 'path': '/'},
      {'icon': Icons.receipt_long_rounded, 'label': 'طلباتي', 'path': '/orders'},
      {'icon': Icons.account_balance_wallet_rounded, 'label': 'محفظتي', 'path': '/wallet'},
      {'icon': Icons.person_rounded, 'label': 'حسابي', 'path': '/profile'},
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: child,
      bottomNavigationBar: Container(
        height: 95,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 30,
              offset: const Offset(0, -10),
            )
          ],
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: List.generate(navItems.length, (i) {
            final isSelected = currentIndex == i;
            final item = navItems[i];
            return GestureDetector(
              onTap: () => context.go(item['path'] as String),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeOutCubic,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary.withValues(alpha: 0.1) : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(item['icon'] as IconData,
                        color: isSelected ? AppColors.primary : AppColors.textHint,
                        size: isSelected ? 26 : 24),
                    if (isSelected) ...[
                      const SizedBox(height: 4),
                      Text(item['label'] as String,
                          style: const TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.w900)),
                    ]
                  ],
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
