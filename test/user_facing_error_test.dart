import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wassalk_app/core/network/user_facing_error.dart';

void main() {
  final request = RequestOptions(path: '/test');

  test('classifies connection failures as offline', () {
    final error = DioException(
      requestOptions: request,
      type: DioExceptionType.connectionError,
    );

    expect(
      classifyUserFacingError(error).kind,
      UserFacingErrorKind.offline,
    );
  });

  test('classifies transport timeouts separately', () {
    final error = DioException(
      requestOptions: request,
      type: DioExceptionType.receiveTimeout,
    );

    expect(
      classifyUserFacingError(error).kind,
      UserFacingErrorKind.timeout,
    );
  });

  test('keeps short client validation messages', () {
    final error = DioException.badResponse(
      statusCode: 422,
      requestOptions: request,
      response: Response<dynamic>(
        requestOptions: request,
        statusCode: 422,
        data: {'message': 'رقم الهاتف غير صالح'},
      ),
    );

    final failure = classifyUserFacingError(error);
    expect(failure.kind, UserFacingErrorKind.rejected);
    expect(failure.messageAr, 'رقم الهاتف غير صالح');
  });

  test('does not expose server error details', () {
    final error = DioException.badResponse(
      statusCode: 500,
      requestOptions: request,
      response: Response<dynamic>(
        requestOptions: request,
        statusCode: 500,
        data: {'message': 'database connection string leaked'},
      ),
    );

    final failure = classifyUserFacingError(error);
    expect(failure.kind, UserFacingErrorKind.unknown);
    expect(failure.messageAr, isNot(contains('database')));
  });
}
