import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wassalk_app/core/network/api_endpoints.dart';
import 'package:wassalk_app/core/network/dio_client.dart';
import '../domain/product_model.dart';

final productRepositoryProvider = Provider((ref) => ProductRepository(ref.watch(dioClientProvider)));

class ProductRepository {
  final DioClient _client;
  ProductRepository(this._client);

  Future<List<ProductModel>> getProductsForStore(String storeId) async {
    final response = await _client.dio.get(ApiEndpoints.productsByStore(storeId));
    final List<dynamic> data = response.data['data'] as List<dynamic>;
    return data.map((json) => ProductModel.fromJson(json as Map<String, dynamic>)).toList();
  }
}
