import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Handles all secure on-device storage.
/// Uses platform-native encryption on both Android and iOS.
/// This service is the ONLY place in the app that reads/writes sensitive data.
class StorageService {
  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  // ─── Auth Keys ───────────────────────────────────────────────
  static const String _authTokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';

  Future<void> saveToken(String token) async {
    await _storage.write(key: _authTokenKey, value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: _authTokenKey);
  }

  Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: _refreshTokenKey, value: token);
  }

  Future<String?> getRefreshToken() async {
    return await _storage.read(key: _refreshTokenKey);
  }

  /// Clears all authentication-related data (called on logout).
  Future<void> clearAuthData() async {
    await _storage.delete(key: _authTokenKey);
    await _storage.delete(key: _refreshTokenKey);
    // Also clear user profile data stored during login
    await _storage.delete(key: 'user_id');
    await _storage.delete(key: 'user_name');
    await _storage.delete(key: 'user_phone');
  }

  // ─── Generic Key-Value (non-sensitive user data) ─────────────
  Future<void> saveValue(String key, String value) async {
    await _storage.write(key: key, value: value);
  }

  Future<String?> getValue(String key) async {
    return await _storage.read(key: key);
  }

  Future<void> deleteValue(String key) async {
    await _storage.delete(key: key);
  }
}

// Global provider — single instance across the app
final storageServiceProvider =
    Provider<StorageService>((ref) => StorageService());
