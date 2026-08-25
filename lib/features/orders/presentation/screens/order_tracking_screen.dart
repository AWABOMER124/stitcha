import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:wassalk_app/core/theme/app_colors.dart';
import 'package:wassalk_app/core/theme/ui_constants.dart';
import 'package:wassalk_app/features/orders/domain/order_tracking_update.dart';
import 'package:wassalk_app/features/common/presentation/widgets/async_error_state.dart';
import '../providers/order_providers.dart';

class OrderTrackingScreen extends ConsumerWidget {
  final String orderId;

  const OrderTrackingScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tracking = ref.watch(orderTrackingProvider(orderId));
    return Scaffold(
      backgroundColor: AppColors.background,
      body: tracking.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.primary)),
        error: (error, _) => AsyncErrorState(
          error: error,
          onRetry: () => ref.invalidate(orderTrackingProvider(orderId)),
          titleAr: 'تعذر الاتصال بتتبع الطلب',
          titleEn: 'Unable to connect to order tracking',
        ),
        data: (update) => _TrackingContent(orderId: orderId, update: update),
      ),
    );
  }
}

class _TrackingContent extends StatelessWidget {
  final String orderId;
  final OrderTrackingUpdate update;

  const _TrackingContent({required this.orderId, required this.update});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(child: _LiveLocation(update: update)),
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Material(
                    color: AppColors.surface,
                    shape: const CircleBorder(),
                    elevation: 2,
                    child: IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                      boxShadow: AppShadows.subtle,
                    ),
                    child: Text('طلب #${_shortId(orderId)}',
                        style: const TextStyle(fontWeight: FontWeight.w900)),
                  ),
                ],
              ),
            ),
          ),
        ),
        DraggableScrollableSheet(
          initialChildSize: 0.44,
          minChildSize: 0.38,
          maxChildSize: 0.82,
          builder: (context, controller) => Container(
            decoration: const BoxDecoration(
              color: AppColors.surface,
              borderRadius:
                  BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
            ),
            child: ListView(
              controller: controller,
              padding: const EdgeInsets.all(AppSpacing.xl),
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                        color: AppColors.divider,
                        borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 24),
                _StatusHeader(status: update.status),
                if (update.driverName?.isNotEmpty == true) ...[
                  const SizedBox(height: 20),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const CircleAvatar(
                      backgroundColor: AppColors.primary,
                      child: Icon(Icons.person_rounded, color: Colors.white),
                    ),
                    title: const Text('المندوب'),
                    subtitle: Text(update.driverName!),
                  ),
                ],
                const SizedBox(height: 24),
                _StatusTimeline(status: update.status),
                if (update.status == 'completed') ...[
                  const SizedBox(height: 28),
                  ElevatedButton(
                    onPressed: () => context.go('/'),
                    child: const Text('العودة للرئيسية'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _LiveLocation extends StatelessWidget {
  final OrderTrackingUpdate update;

  const _LiveLocation({required this.update});

  @override
  Widget build(BuildContext context) {
    if (!update.hasDriverLocation) {
      return Container(
        color: AppColors.greyLight,
        child: const Center(
          child: Padding(
            padding: EdgeInsets.fromLTRB(32, 32, 32, 220),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.location_searching_rounded,
                    size: 64, color: AppColors.greyMedium),
                SizedBox(height: 16),
                Text('سيظهر موقع المندوب هنا عند بدء التوصيل',
                    textAlign: TextAlign.center),
              ],
            ),
          ),
        ),
      );
    }

    final driver = LatLng(update.driverLat!, update.driverLng!);
    return GoogleMap(
      key: ValueKey('${update.driverLat},${update.driverLng}'),
      initialCameraPosition: CameraPosition(target: driver, zoom: 15),
      markers: {
        Marker(
          markerId: const MarkerId('driver'),
          position: driver,
          infoWindow: InfoWindow(title: update.driverName ?? 'المندوب'),
        ),
      },
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
    );
  }
}

class _StatusHeader extends StatelessWidget {
  final String status;

  const _StatusHeader({required this.status});

  @override
  Widget build(BuildContext context) {
    final info = _statusInfo(status);
    return Row(
      children: [
        Container(
          width: 58,
          height: 58,
          decoration: BoxDecoration(
            color: info.color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
          child: Icon(info.icon, color: info.color, size: 30),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(info.title, style: AppTextStyles.titleLarge),
              const SizedBox(height: 4),
              Text(info.subtitle,
                  style: AppTextStyles.bodySm
                      .copyWith(color: AppColors.textSecondary)),
            ],
          ),
        ),
      ],
    );
  }
}

class _StatusTimeline extends StatelessWidget {
  final String status;

  const _StatusTimeline({required this.status});

  @override
  Widget build(BuildContext context) {
    final current = switch (status) {
      'preparing' => 1,
      'delivering' => 2,
      'completed' => 3,
      _ => 0,
    };
    const labels = [
      'تم استلام الطلب',
      'قيد التحضير',
      'خرج للتوصيل',
      'تم التوصيل'
    ];

    return Column(
      children: List.generate(labels.length, (index) {
        final reached = index <= current && status != 'cancelled';
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Icon(
                  reached
                      ? Icons.check_circle_rounded
                      : Icons.radio_button_unchecked_rounded,
                  color: reached ? AppColors.success : AppColors.greyMedium,
                ),
                if (index < labels.length - 1)
                  Container(
                      width: 2,
                      height: 34,
                      color: reached ? AppColors.success : AppColors.divider),
              ],
            ),
            const SizedBox(width: 12),
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(labels[index],
                  style: TextStyle(
                      fontWeight:
                          reached ? FontWeight.bold : FontWeight.normal)),
            ),
          ],
        );
      }),
    );
  }
}

({String title, String subtitle, IconData icon, Color color}) _statusInfo(
    String status) {
  switch (status) {
    case 'preparing':
      return (
        title: 'جاري التحضير',
        subtitle: 'المتجر يجهز طلبك',
        icon: Icons.soup_kitchen_rounded,
        color: AppColors.info
      );
    case 'delivering':
      return (
        title: 'في الطريق إليك',
        subtitle: 'يتم تحديث الموقع من جهاز المندوب',
        icon: Icons.delivery_dining_rounded,
        color: AppColors.primary
      );
    case 'completed':
      return (
        title: 'تم التوصيل',
        subtitle: 'اكتمل طلبك بنجاح',
        icon: Icons.check_circle_rounded,
        color: AppColors.success
      );
    case 'cancelled':
      return (
        title: 'تم إلغاء الطلب',
        subtitle: 'راجع المتجر أو الدعم للمزيد',
        icon: Icons.cancel_rounded,
        color: AppColors.error
      );
    default:
      return (
        title: 'تم استلام الطلب',
        subtitle: 'بانتظار قبول المتجر',
        icon: Icons.hourglass_empty_rounded,
        color: AppColors.accent
      );
  }
}

String _shortId(String id) => id.length <= 8 ? id : id.substring(id.length - 8);
