import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wassalk_app/core/network/dio_client.dart';
import 'package:wassalk_app/core/routing/app_router.dart';
import 'package:wassalk_app/core/storage/storage_service.dart';

/// Background handler must be a top-level function (Flutter/Firebase requirement).
@pragma('vm:entry-point')
Future<void> _onBackgroundMessage(RemoteMessage message) async {
  // Background notifications are shown automatically by the OS.
  // Handle data-only messages here if needed.
}

const _androidChannel = AndroidNotificationChannel(
  'wassalk_orders',
  'تحديثات الطلبات',
  description: 'إشعارات حالة الطلب والتوصيل',
  importance: Importance.high,
);

class FcmService {
  final DioClient _client;
  final StorageService _storage;
  final Ref _ref;
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  FcmService(this._client, this._storage, this._ref);

  /// Initializes FCM: requests permission, saves the device token, and sets
  /// up message listeners. Safe to call even if Firebase isn't configured yet.
  Future<void> initialize() async {
    try {
      await _initLocalNotifications();

      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus != AuthorizationStatus.authorized &&
          settings.authorizationStatus != AuthorizationStatus.provisional) {
        return; // User denied notifications
      }

      final token = await _messaging.getToken();
      if (token != null) {
        await _storage.saveValue('fcm_token', token);
        await _registerDeviceToken(token);
      }

      // Keep token fresh when it rotates
      _messaging.onTokenRefresh.listen((newToken) async {
        await _storage.saveValue('fcm_token', newToken);
        await _registerDeviceToken(newToken);
      });

      // Handle notifications received while the app is in the foreground
      FirebaseMessaging.onMessage.listen(_onForegroundMessage);

      // Background handler registration
      FirebaseMessaging.onBackgroundMessage(_onBackgroundMessage);

      // When user taps a notification that was shown in the background
      FirebaseMessaging.onMessageOpenedApp.listen(_onNotificationTap);

      // Handle notification that launched the app from terminated state
      final initial = await _messaging.getInitialMessage();
      if (initial != null) _onNotificationTap(initial);
    } catch (_) {
      // Firebase not yet initialized — run `flutterfire configure` to set up.
    }
  }

  Future<void> _initLocalNotifications() async {
    await _localNotifications.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: (response) {
        final orderId = response.payload;
        if (orderId != null) _navigateToTracking(orderId);
      },
    );
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_androidChannel);
  }

  /// Best-effort — a failed registration shouldn't block notification delivery
  /// (APNs/FCM already has the token; the backend copy is only used for
  /// server-initiated pushes like order-status updates).
  Future<void> _registerDeviceToken(String token) async {
    try {
      await _client.dio.post('/customer/notifications/device-token', data: {'token': token});
    } catch (_) {
      // Not logged in yet, or offline — will retry on next initialize()/refresh.
    }
  }

  void _onForegroundMessage(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _androidChannel.id,
          _androidChannel.name,
          channelDescription: _androidChannel.description,
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: const DarwinNotificationDetails(),
      ),
      payload: message.data['order_id'] as String?,
    );
  }

  void _onNotificationTap(RemoteMessage message) {
    final orderId = message.data['order_id'] as String?;
    if (orderId != null) _navigateToTracking(orderId);
  }

  void _navigateToTracking(String orderId) {
    _ref.read(appRouterProvider).push('/tracking/$orderId');
  }

  /// Returns the saved FCM token (null if not yet available).
  Future<String?> getToken() => _storage.getValue('fcm_token');
}

final fcmServiceProvider = Provider<FcmService>((ref) {
  return FcmService(ref.watch(dioClientProvider), ref.watch(storageServiceProvider), ref);
});
