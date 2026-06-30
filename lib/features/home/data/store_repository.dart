import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wassalk_app/core/network/api_endpoints.dart';
import 'package:wassalk_app/core/network/dio_client.dart';
import 'package:wassalk_app/features/home/domain/store_model.dart';

final storeRepositoryProvider = Provider((ref) => StoreRepository(ref.watch(dioClientProvider)));

class StoreRepository {
  final DioClient _client;
  StoreRepository(this._client);

  Future<List<StoreModel>> getFeaturedStores() async {
    final response = await _client.dio.get(ApiEndpoints.featuredStores);
    final List<dynamic> data = response.data['data'] as List<dynamic>;
    return data.map((json) => StoreModel.fromJson(json as Map<String, dynamic>)).toList();
  }
}
