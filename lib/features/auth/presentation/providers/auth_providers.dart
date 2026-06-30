import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wassalk_app/core/storage/storage_service.dart';
import 'package:wassalk_app/features/auth/domain/user_model.dart';
import 'package:wassalk_app/features/auth/data/auth_repository.dart';

/// Manages authentication state for the current user session.
/// null = unauthenticated / not logged in.
class AuthNotifier extends StateNotifier<AsyncValue<UserModel?>> {
  final AuthRepository _repository;
  final StorageService _storage;

  AuthNotifier(this._repository, this._storage)
      : super(const AsyncLoading()) {
    _restoreSession();
  }

  /// On app start: attempt to restore the user session from secure storage.
  /// If a token exists, consider the user authenticated.
  /// TODO: In Phase 2, validate token against /auth/verify endpoint.
  Future<void> _restoreSession() async {
    try {
      final token = await _storage.getToken();
      if (token != null) {
        // Token exists — user was previously logged in.
        final savedName = await _storage.getValue('user_name') ?? 'مستخدم';
        final savedPhone = await _storage.getValue('user_phone') ?? '';
        final savedId = await _storage.getValue('user_id') ?? 'local';
        state = AsyncData(
          UserModel(
            id: savedId,
            name: savedName,
            phone: savedPhone,
            token: token, // token is non-null here — safe
          ),
        );
      } else {
        state = const AsyncData(null);
      }
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> login(String phone, String password) async {
    state = const AsyncLoading();
    try {
      final user = await _repository.login(phone, password);

      // ✅ FIXED: Save token AND user info to secure storage.
      if (user.token != null) {
        await _storage.saveToken(user.token!);
      }
      await _storage.saveValue('user_id', user.id);
      await _storage.saveValue('user_name', user.name);
      await _storage.saveValue('user_phone', user.phone);

      state = AsyncData(user);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> signup(String name, String phone, String password) async {
    state = const AsyncLoading();
    try {
      final user = await _repository.signup(name, phone, password);

      // ✅ Save credentials after signup just like login
      if (user.token != null) {
        await _storage.saveToken(user.token!);
      }
      await _storage.saveValue('user_id', user.id);
      await _storage.saveValue('user_name', user.name);
      await _storage.saveValue('user_phone', user.phone);

      state = AsyncData(user);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> logout() async {
    // ✅ FIXED: Clear all stored auth data on logout.
    // Previously this was a TODO — tokens were never cleared!
    await _storage.clearAuthData();
    state = const AsyncData(null);
  }
}

final authProvider =
    StateNotifierProvider<AuthNotifier, AsyncValue<UserModel?>>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  final storage = ref.watch(storageServiceProvider);
  return AuthNotifier(repository, storage);
});
