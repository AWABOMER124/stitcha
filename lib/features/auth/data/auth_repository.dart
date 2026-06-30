import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wassalk_app/core/network/api_endpoints.dart';
import 'package:wassalk_app/core/network/dio_client.dart';
import 'package:wassalk_app/features/auth/domain/user_model.dart';

final authRepositoryProvider = Provider((ref) => AuthRepository(ref.watch(dioClientProvider)));

class AuthRepository {
  final DioClient _client;
  AuthRepository(this._client);

  Future<UserModel> login(String phone, String password) async {
    final response = await _client.dio.post(
      ApiEndpoints.login,
      data: {'phone': phone, 'password': password},
    );
    return UserModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<UserModel> signup(String name, String phone, String password) async {
    final response = await _client.dio.post(
      ApiEndpoints.register,
      data: {'name': name, 'phone': phone, 'password': password},
    );
    return UserModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }
}
