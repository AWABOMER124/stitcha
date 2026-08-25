import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import 'package:wassalk_app/core/storage/storage_service.dart';

class DioClient {
  late final Dio _dio;
  final StorageService _storage;
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
        // Debug defaults to the Android emulator's host alias. Release builds
        // fail fast above unless an explicit HTTPS API URL is supplied.
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        responseType: ResponseType.json,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // SECURITY: Fetch token from SecureStorage and inject into headers
          final token = await _storage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          if (kDebugMode) {
            _logger.i(
                '🌐 API REQUEST: [${options.method}] ${options.baseUrl}${options.path}');
          }
          return handler.next(options);
        },
        onResponse: (response, handler) {
          if (kDebugMode) {
            _logger.t(
                '✅ API RESPONSE: [${response.statusCode}] ${response.requestOptions.path}');
          }
          return handler.next(response);
        },
        onError: (DioException e, handler) async {
          String errorMessage = 'حدث خطأ غير متوقع في الاتصال';

          if (e.type == DioExceptionType.connectionTimeout) {
            errorMessage = 'فشل الاتصال: انتهى وقت المحاولة';
          } else if (e.response?.statusCode == 401) {
            // SECURITY: Handle unauthorized access (token expired)
            errorMessage = 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً';
            await _storage.clearAuthData();
          } else if (e.response?.data != null &&
              e.response?.data['message'] != null) {
            errorMessage = e.response?.data['message'];
          }

          if (kDebugMode) {
            _logger.e(
                '❌ API ERROR: [${e.response?.statusCode}] ${e.requestOptions.path} => $errorMessage');
          }
          return handler.next(e);
        },
      ),
    );
  }

  Dio get dio => _dio;
}

// Global provider for DioClient (Injecting StorageService)
final dioClientProvider = Provider<DioClient>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return DioClient(storage);
});
