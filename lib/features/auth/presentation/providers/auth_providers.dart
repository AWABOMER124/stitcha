import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wassalk_app/core/storage/storage_service.dart';
import 'package:wassalk_app/features/auth/domain/user_model.dart';
import 'package:wassalk_app/features/auth/data/auth_repository.dart';

/// Manages authentication state for the current user session.
/// null = unauthenticated / not logged in.
class AuthNotifier extends StateNotifier<AsyncValue<UserModel?>> {
  final AuthRepository _repository;
  final StorageService _storage;
  late final StreamSubscription<void> _authClearedSubscription;

  AuthNotifier(this._repository, this._storage) : super(const AsyncLoading()) {
    _authClearedSubscription = _storage.authCleared.listen((_) {
      state = const AsyncData(null);
    });
    _restoreSession();
  }

  @override
  void dispose() {
    _authClearedSubscription.cancel();
    super.dispose();
  }

  /// On app start: attempt to restore the user session from secure storage.
  /// A stored access/refresh pair is restored. The network interceptor rotates
  /// an expired access token before retrying the first protected request.
  Future<void> _restoreSession() async {
    try {
      final token = await _storage.getToken();
      final refreshToken = await _storage.getRefreshToken();
      if (token != null && refreshToken != null) {
        // Token exists — user was previously logged in.
        final savedName = await _storage.getValue('user_name') ?? 'مستخدم';
        final savedPhone = await _storage.getValue('user_phone') ?? '';
        final savedId = await _storage.getValue('user_id') ?? 'local';
        state = AsyncData(
          UserModel(
            id: savedId,
            name: savedName,
            phone: savedPhone,
            token: token,
            refreshToken: refreshToken,
          ),
        );
      } else {
        if (token != null || refreshToken != null) {
          await _storage.clearAuthData();
        }
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

      await _persistUser(user);

      state = AsyncData(user);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> signup(String name, String phone, String password) async {
    state = const AsyncLoading();
    try {
      final user = await _repository.signup(name, phone, password);

      await _persistUser(user);

      state = AsyncData(user);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> logout() async {
    try {
      await _repository.logout();
    } finally {
      await _storage.clearAuthData();
      state = const AsyncData(null);
    }
  }

  Future<void> _persistUser(UserModel user) async {
    if (user.token == null || user.refreshToken == null) {
      throw StateError('Authentication response did not include both tokens');
    }
    await _storage.saveToken(user.token!);
    await _storage.saveRefreshToken(user.refreshToken!);
    await _storage.saveValue('user_id', user.id);
    await _storage.saveValue('user_name', user.name);
    await _storage.saveValue('user_phone', user.phone);
  }
}

final authProvider =
    StateNotifierProvider<AuthNotifier, AsyncValue<UserModel?>>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  final storage = ref.watch(storageServiceProvider);
  return AuthNotifier(repository, storage);
});
