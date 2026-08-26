import 'package:flutter/material.dart';
import 'package:wassalk_app/core/network/user_facing_error.dart';
import 'package:wassalk_app/core/theme/app_colors.dart';
import 'package:wassalk_app/core/theme/ui_constants.dart';

class AsyncErrorState extends StatelessWidget {
  final Object error;
  final VoidCallback onRetry;
  final String? titleAr;
  final String? titleEn;

  const AsyncErrorState({
    super.key,
    required this.error,
    required this.onRetry,
    this.titleAr,
    this.titleEn,
  });

  @override
  Widget build(BuildContext context) {
    final failure = classifyUserFacingError(error);
    final isEnglish = Localizations.localeOf(context).languageCode == 'en';
    final isOffline = failure.kind == UserFacingErrorKind.offline;
    final title = isEnglish
        ? titleEn ?? (isOffline ? 'You are offline' : 'Unable to load')
        : titleAr ?? (isOffline ? 'أنت غير متصل' : 'تعذر التحميل');

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isOffline ? Icons.wifi_off_rounded : Icons.cloud_off_rounded,
              size: 64,
              color: AppColors.greyMedium,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: AppTextStyles.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              failure.messageFor(isEnglish ? 'en' : 'ar'),
              textAlign: TextAlign.center,
              style: AppTextStyles.bodySm.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: Text(isEnglish ? 'Try again' : 'إعادة المحاولة'),
            ),
          ],
        ),
      ),
    );
  }
}
