import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wassalk_app/core/network/dio_client.dart';
import 'package:wassalk_app/core/storage/storage_service.dart';
import 'package:wassalk_app/features/auth/data/auth_repository.dart';
import 'package:wassalk_app/features/auth/presentation/providers/auth_providers.dart';

class _SessionStorage extends StorageService {
  final events = StreamController<void>.broadcast();

  @override
  Stream<void> get authCleared => events.stream;

  @override
  Future<String?> getToken() async => 'access-token';

  @override
  Future<String?> getRefreshToken() async => 'refresh-token';

  @override
  Future<String?> getValue(String key) async => switch (key) {
        'user_id' => 'account-1',
        'user_name' => 'Customer',
        'user_phone' => '0912345678',
        _ => null,
      };

  @override
  void dispose() {
    events.close();
    super.dispose();
  }
}

class _SessionRepository extends AuthRepository {
  _SessionRepository(StorageService storage) : super(DioClient(storage));
}

void main() {
  test('leaves authenticated state when secure credentials are cleared',
      () async {
    final storage = _SessionStorage();
    final notifier = AuthNotifier(_SessionRepository(storage), storage);
    await Future<void>.delayed(Duration.zero);

    expect(
      notifier.state.when(
        data: (user) => user?.id,
        loading: () => null,
        error: (error, stackTrace) => null,
      ),
      'account-1',
    );

    storage.events.add(null);
    await Future<void>.delayed(Duration.zero);

    expect(
      notifier.state.when(
        data: (user) => user,
        loading: () => 'loading',
        error: (error, stackTrace) => 'error',
      ),
      isNull,
    );
    notifier.dispose();
    storage.dispose();
  });
}
