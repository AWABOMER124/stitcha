import 'package:dio/dio.dart';

enum UserFacingErrorKind { offline, timeout, unauthorized, rejected, unknown }

class UserFacingError {
  final UserFacingErrorKind kind;
  final String messageAr;
  final String messageEn;

  const UserFacingError({
    required this.kind,
    required this.messageAr,
    required this.messageEn,
  });

  String messageFor(String languageCode) =>
      languageCode == 'en' ? messageEn : messageAr;
}

UserFacingError classifyUserFacingError(Object error) {
  if (error is DioException) {
    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.unknown) {
      return const UserFacingError(
        kind: UserFacingErrorKind.offline,
        messageAr: 'لا يوجد اتصال بالخدمة. تحقق من الإنترنت ثم حاول مرة أخرى.',
        messageEn:
            'The service is unreachable. Check your connection and try again.',
      );
    }

    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      return const UserFacingError(
        kind: UserFacingErrorKind.timeout,
        messageAr: 'استغرقت العملية وقتاً أطول من المتوقع. حاول مرة أخرى.',
        messageEn: 'The request took longer than expected. Please try again.',
      );
    }

    final statusCode = error.response?.statusCode;
    if (statusCode == 401 || statusCode == 403) {
      return const UserFacingError(
        kind: UserFacingErrorKind.unauthorized,
        messageAr:
            'تعذر التحقق من بيانات الدخول. راجع البيانات وحاول مرة أخرى.',
        messageEn:
            'We could not verify your credentials. Check them and try again.',
      );
    }

    if (statusCode != null && statusCode >= 400 && statusCode < 500) {
      final apiMessage = _safeApiMessage(error.response?.data);
      return UserFacingError(
        kind: UserFacingErrorKind.rejected,
        messageAr:
            apiMessage ?? 'تعذر إكمال الطلب. راجع البيانات وحاول مرة أخرى.',
        messageEn: apiMessage ??
            'The request could not be completed. Check your details and try again.',
      );
    }
  }

  return const UserFacingError(
    kind: UserFacingErrorKind.unknown,
    messageAr: 'حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل.',
    messageEn: 'Something unexpected happened. Please try again shortly.',
  );
}

String? _safeApiMessage(dynamic data) {
  if (data is! Map) return null;
  final message = data['message'];
  if (message is! String) return null;
  final normalized = message.trim();
  if (normalized.isEmpty || normalized.length > 180) return null;
  return normalized;
}
