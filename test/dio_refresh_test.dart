import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wassalk_app/core/network/api_endpoints.dart';
import 'package:wassalk_app/core/network/dio_client.dart';
import 'package:wassalk_app/core/storage/storage_service.dart';

class _MemoryStorage extends StorageService {
  String? accessToken = 'old-access';
  String? refreshToken = 'valid-refresh';
  var clearCount = 0;

  @override
  Future<String?> getToken() async => accessToken;

  @override
  Future<String?> getRefreshToken() async => refreshToken;

  @override
  Future<void> saveToken(String token) async => accessToken = token;

  @override
  Future<void> saveRefreshToken(String token) async => refreshToken = token;

  @override
  Future<void> clearAuthData() async {
    clearCount++;
    accessToken = null;
    refreshToken = null;
  }
}

class _RefreshAdapter implements HttpClientAdapter {
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options.copyWith(headers: Map.of(options.headers)));
    const headers = {
      Headers.contentTypeHeader: ['application/json'],
    };

    if (options.path == ApiEndpoints.refresh) {
      return ResponseBody.fromString(
        jsonEncode({
          'data': {
            'token': 'new-access',
            'refreshToken': 'rotated-refresh',
            'expiresIn': 900,
          },
        }),
        200,
        headers: headers,
      );
    }

    if (options.headers['Authorization'] == 'Bearer old-access') {
      return ResponseBody.fromString(
        jsonEncode({'message': 'expired'}),
        401,
        headers: headers,
      );
    }

    return ResponseBody.fromString(
      jsonEncode({'data': 'protected-result'}),
      200,
      headers: headers,
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  test('rotates tokens and retries one unauthorized request', () async {
    final storage = _MemoryStorage();
    final client = DioClient(storage);
    final adapter = _RefreshAdapter();
    client.dio.httpClientAdapter = adapter;

    final response = await client.dio.get<Map<String, dynamic>>('/protected');

    expect(response.data?['data'], 'protected-result');
    expect(storage.accessToken, 'new-access');
    expect(storage.refreshToken, 'rotated-refresh');
    expect(storage.clearCount, 0);
    expect(adapter.requests, hasLength(3));
    expect(adapter.requests[1].path, ApiEndpoints.refresh);
    expect(adapter.requests[1].headers['Authorization'], isNull);
    expect(adapter.requests[2].headers['Authorization'], 'Bearer new-access');
  });
}
