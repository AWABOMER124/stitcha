import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:wassalk_app/core/theme/app_colors.dart';
import 'package:wassalk_app/core/theme/ui_constants.dart';
import '../providers/order_providers.dart';

// Khartoum reference points (replace with real coordinates from the backend)
const _kMerchantLocation = LatLng(15.5518, 32.5324); // merchant/restaurant
const _kCustomerLocation = LatLng(15.4934, 32.5605); // customer destination
const _kKhartoumCenter   = LatLng(15.5007, 32.5599); // fallback center

// Google Maps API key setup:
//   Android → android/app/src/main/AndroidManifest.xml
//     <meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_KEY"/>
//   iOS → ios/Runner/AppDelegate.swift
//     GMSServices.provideAPIKey("YOUR_KEY")

class OrderTrackingScreen extends ConsumerStatefulWidget {
  final String orderId;
  const OrderTrackingScreen({super.key, required this.orderId});

  @override
  ConsumerState<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> {
  GoogleMapController? _mapController;

  // Driver position interpolated from order status
  LatLng _driverPosition = _kMerchantLocation;

  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;
  }

  void _updateDriverPosition(String status) {
    LatLng next;
    switch (status) {
      case 'pending':
      case 'preparing':
        next = _kMerchantLocation;
      case 'delivering':
        next = const LatLng(
          (_kMerchantLocation.latitude + _kCustomerLocation.latitude) / 2,
          (_kMerchantLocation.longitude + _kCustomerLocation.longitude) / 2,
        );
      case 'completed':
        next = _kCustomerLocation;
      default:
        next = _kMerchantLocation;
    }
    if (next != _driverPosition) {
      setState(() => _driverPosition = next);
      _mapController?.animateCamera(CameraUpdate.newLatLng(next));
    }
  }

  Set<Marker> _buildMarkers(String status) {
    return {
      Marker(
        markerId: const MarkerId('driver'),
        position: _driverPosition,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
        infoWindow: const InfoWindow(title: 'المندوب'),
      ),
      Marker(
        markerId: const MarkerId('merchant'),
        position: _kMerchantLocation,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: const InfoWindow(title: 'المطعم'),
      ),
      Marker(
        markerId: const MarkerId('customer'),
        position: _kCustomerLocation,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: const InfoWindow(title: 'موقعك'),
      ),
    };
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final trackStream = ref.watch(orderTrackingProvider(widget.orderId));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: trackStream.when(
        data: (status) {
          _updateDriverPosition(status);
          return _buildTrackingLayout(context, status);
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.wifi_off_rounded, size: 60, color: AppColors.greyMedium),
                const SizedBox(height: 16),
                Text('تعذر الاتصال بتتبع الطلب', style: AppTextStyles.titleLarge),
                const SizedBox(height: 8),
                Text('$err', style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary), textAlign: TextAlign.center),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTrackingLayout(BuildContext context, String status) {
    return Stack(
      children: [
        // ── Real Google Map ──────────────────────────────────────────
        Positioned.fill(
          child: GoogleMap(
            initialCameraPosition: const CameraPosition(
              target: _kKhartoumCenter,
              zoom: 13.5,
            ),
            onMapCreated: _onMapCreated,
            markers: _buildMarkers(status),
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
            compassEnabled: false,
          ),
        ),

        // ── AppBar Overlay ───────────────────────────────────────────
        Positioned(
          top: 0, left: 0, right: 0,
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildCircularAction(Icons.close_rounded, () => context.go('/')),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                      boxShadow: AppShadows.subtle,
                    ),
                    child: Text(
                      'طلب #${widget.orderId}',
                      style: AppTextStyles.bodySm.copyWith(fontWeight: FontWeight.w900, color: AppColors.primary),
                    ),
                  ),
                  _buildCircularAction(Icons.help_outline_rounded, () {}),
                ],
              ),
            ),
          ),
        ),

        // ── Draggable Bottom Panel ───────────────────────────────────
        DraggableScrollableSheet(
          initialChildSize: 0.45,
          minChildSize: 0.4,
          maxChildSize: 0.85,
          builder: (context, scrollController) {
            return Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 40,
                    offset: const Offset(0, -10),
                  )
                ],
              ),
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.all(AppSpacing.xl),
                children: [
                  Center(
                    child: Container(
                      width: 40, height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.divider,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  _buildStatusHeader(status),
                  const SizedBox(height: 32),
                  if (status == 'delivering') ...[
                    _buildDriverCard(),
                    const SizedBox(height: 32),
                  ],
                  _buildTrackingTimeline(status),
                  const SizedBox(height: 32),
                  if (status == 'completed')
                    _buildActionButton('العودة للرئيسية والطلب مرة أخرى', () => context.go('/')),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildCircularAction(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          shape: BoxShape.circle,
          boxShadow: AppShadows.subtle,
        ),
        child: Icon(icon, color: AppColors.textPrimary, size: 24),
      ),
    );
  }

  Widget _buildStatusHeader(String status) {
    final statusMap = {
      'pending':   {'text': 'تم استلام الطلب',     'sub': 'بانتظار قبول المتجر',              'icon': Icons.hourglass_empty_rounded},
      'preparing': {'text': 'جاري التحضير',          'sub': 'المطعم يجهز وجبتك',               'icon': Icons.soup_kitchen_rounded},
      'delivering':{'text': 'في الطريق إليك',       'sub': 'موعد الوصول: 15-20 دقيقة',        'icon': Icons.delivery_dining_rounded},
      'completed': {'text': 'تم التوصيل!',          'sub': 'نتمنى لك وجبة هنيئة',             'icon': Icons.check_circle_rounded},
    };
    final info = statusMap[status] ?? statusMap['pending']!;

    return Row(
      children: [
        Container(
          width: 60, height: 60,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
          child: Icon(info['icon'] as IconData, color: AppColors.primary, size: 30),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(info['text'] as String, style: AppTextStyles.displayMedium.copyWith(fontSize: 22)),
              Text(info['sub']  as String, style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDriverCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.greyLight.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(color: AppColors.divider.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const CircleAvatar(
            radius: 24,
            backgroundColor: AppColors.primary,
            child: Icon(Icons.person_rounded, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 16),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('المندوب', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Row(
                  children: [
                    Icon(Icons.star_rounded, color: AppColors.accent, size: 16),
                    Text(' 4.9 · تويوتا كورولا', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  ],
                ),
              ],
            ),
          ),
          _buildSmallAction(Icons.phone_rounded, AppColors.success),
          const SizedBox(width: 8),
          _buildSmallAction(Icons.chat_bubble_rounded, AppColors.info),
        ],
      ),
    );
  }

  Widget _buildSmallAction(IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.divider),
      ),
      child: Icon(icon, color: color, size: 18),
    );
  }

  Widget _buildTrackingTimeline(String status) {
    final steps = [
      ('تم استلام وفحص الطلب', status != 'pending'),
      ('جاري التجهيز في المطبخ', status == 'preparing' || status == 'delivering' || status == 'completed'),
      ('المندوب تسلم الطلب وفي الطريق', status == 'delivering' || status == 'completed'),
      ('الطلب عند بابك — استمتع!', status == 'completed'),
    ];

    return Column(
      children: steps.asMap().entries.map((entry) {
        final i = entry.key;
        final (label, isReached) = entry.value;
        final isDone = i < steps.length - 1 && steps[i + 1].$2;
        return _buildStep(label, isReached, isDone: isDone, isLast: i == steps.length - 1);
      }).toList(),
    );
  }

  Widget _buildStep(String label, bool isReached, {bool isDone = false, bool isLast = false}) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 22, height: 22,
                decoration: BoxDecoration(
                  color: isReached ? AppColors.primary : AppColors.greyMedium,
                  shape: BoxShape.circle,
                  boxShadow: isReached
                      ? [BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 10)]
                      : null,
                ),
                child: isDone ? const Icon(Icons.check_rounded, size: 12, color: Colors.white) : null,
              ),
              if (!isLast)
                Expanded(child: Container(width: 2, color: isDone ? AppColors.primary : AppColors.divider)),
            ],
          ),
          const SizedBox(width: 16),
          Padding(
            padding: const EdgeInsets.only(bottom: 24),
            child: Text(
              label,
              style: AppTextStyles.bodyLarge.copyWith(
                fontWeight: isReached ? FontWeight.bold : FontWeight.w500,
                color: isReached ? AppColors.textPrimary : AppColors.textHint,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(String label, VoidCallback onTap) {
    return SizedBox(
      width: double.infinity,
      height: 60,
      child: ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.pill)),
        ),
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
      ),
    );
  }
}
