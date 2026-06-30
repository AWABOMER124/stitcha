import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wassalk_app/core/storage/storage_service.dart';

/// Background handler must be a top-level function (Flutter/Firebase requirement).
@pragma('vm:entry-point')
Future<void> _onBackgroundMessage(RemoteMessage message) async {
  // Background notifications are shown automatically by the OS.
  // Handle data-only messages here if needed.
}

class FcmService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final StorageService _storage;

  FcmService(this._storage);

  /// Initializes FCM: requests permission, saves the device token, and sets
  /// up message listeners. Safe to call even if Firebase isn't configured yet.
  Future<void> initialize() async {
    try {
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
        // TODO: register token with backend → POST /notifications/device-token
        //   await _client.dio.post('/notifications/device-token', data: {'token': token});
      }

      // Keep token fresh when it rotates
      _messaging.onTokenRefresh.listen((newToken) async {
        await _storage.saveValue('fcm_token', newToken);
        // TODO: update token on backend
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

  void _onForegroundMessage(RemoteMessage message) {
    // TODO: display with flutter_local_notifications for foreground visibility.
    // The data payload can carry order ID to navigate the user.
  }

  void _onNotificationTap(RemoteMessage message) {
    final orderId = message.data['order_id'] as String?;
    if (orderId != null) {
      // TODO: navigate to /tracking/$orderId using the app router.
      // Requires passing a NavigatorKey or using a global router reference.
    }
  }

  /// Returns the saved FCM token (null if not yet available).
  Future<String?> getToken() => _storage.getValue('fcm_token');
}

final fcmServiceProvider = Provider<FcmService>((ref) {
  return FcmService(ref.watch(storageServiceProvider));
});
