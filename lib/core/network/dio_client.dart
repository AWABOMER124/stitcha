import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import 'package:wassalk_app/core/network/api_endpoints.dart';
import 'package:wassalk_app/core/storage/storage_service.dart';

class DioClient {
  late final Dio _dio;
  final StorageService _storage;
  Future<String?>? _refreshFuture;

  final Logger _logger = Logger(
    printer: PrettyPrinter(
      methodCount: 0,
      errorMethodCount: 5,
      lineLength: 80,
      colors: true,
      printEmojis: true,
      dateTimeFormat: DateTimeFormat.none,
    ),
  );

  DioClient(this._storage) {
    const configuredBaseUrl = String.fromEnvironment('API_BASE_URL');
    if (kReleaseMode && configuredBaseUrl.isEmpty) {
      throw StateError(
        'API_BASE_URL is required for release builds. '
        'Pass --dart-define=API_BASE_URL=https://example.com/api',
      );
    }
    final baseUrl = configuredBaseUrl.isNotEmpty
        ? configuredBaseUrl
        : 'http://10.0.2.2:3000/api';

    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        responseType: ResponseType.json,
        headers: const {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.getToken();
          if (token != null && options.path != ApiEndpoints.refresh) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          if (kDebugMode) {
            _logger.i(
              'API REQUEST: [${options.method}] ${options.baseUrl}${options.path}',
            );
          }
          handler.next(options);
        },
        onResponse: (response, handler) {
          if (kDebugMode) {
            _logger.t(
              'API RESPONSE: [${response.statusCode}] ${response.requestOptions.path}',
            );
          }
          handler.next(response);
        },
        onError: (error, handler) async {
          var currentError = error;
          var errorMessage = 'حدث خطأ غير متوقع في الاتصال';

          if (currentError.type == DioExceptionType.connectionTimeout) {
            errorMessage = 'فشل الاتصال: انتهى وقت المحاولة';
          } else if (currentError.response?.statusCode == 401) {
            final request = currentError.requestOptions;
            final wasRetried = request.extra['authRetried'] == true;
            final isAuthEndpoint = {
              ApiEndpoints.login,
              ApiEndpoints.register,
              ApiEndpoints.refresh,
            }.contains(request.path);

            if (!wasRetried && !isAuthEndpoint) {
              final accessToken = await _refreshAccessToken();
              if (accessToken != null) {
                request.headers['Authorization'] = 'Bearer $accessToken';
                request.extra['authRetried'] = true;
                try {
                  return handler.resolve(await _dio.fetch<dynamic>(request));
                } on DioException catch (retryError) {
                  currentError = retryError;
                }
              }
            }

            errorMessage = 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجددًا';
            await _storage.clearAuthData();
          } else {
            final data = currentError.response?.data;
            if (data is Map<String, dynamic> && data['message'] is String) {
              errorMessage = data['message'] as String;
            }
          }

          if (kDebugMode) {
            _logger.e(
              'API ERROR: [${currentError.response?.statusCode}] '
              '${currentError.requestOptions.path} => $errorMessage',
            );
          }
          handler.next(currentError);
        },
      ),
    );
  }

  Future<String?> _refreshAccessToken() async {
    final inFlight = _refreshFuture;
    if (inFlight != null) return inFlight;

    final refresh = _performRefresh();
    _refreshFuture = refresh;
    try {
      return await refresh;
    } finally {
      _refreshFuture = null;
    }
  }

  Future<String?> _performRefresh() async {
    final storedRefreshToken = await _storage.getRefreshToken();
    if (storedRefreshToken == null) return null;

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.refresh,
        data: {'refreshToken': storedRefreshToken},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      final accessToken = data?['token'] as String?;
      final nextRefreshToken = data?['refreshToken'] as String?;
      if (accessToken == null || nextRefreshToken == null) return null;

      await _storage.saveToken(accessToken);
      await _storage.saveRefreshToken(nextRefreshToken);
      return accessToken;
    } on DioException {
      return null;
    }
  }

  Dio get dio => _dio;
}

final dioClientProvider = Provider<DioClient>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return DioClient(storage);
});
