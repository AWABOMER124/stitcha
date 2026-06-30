import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:wassalk_app/core/network/api_endpoints.dart';
import 'package:wassalk_app/core/network/dio_client.dart';
import 'package:wassalk_app/core/storage/storage_service.dart';
import '../domain/order_model.dart';
import 'package:wassalk_app/features/cart/domain/entities/cart_item.dart';

final orderRepositoryProvider = Provider((ref) => OrderRepository(
      ref.watch(dioClientProvider),
      ref.watch(storageServiceProvider),
    ));

class OrderRepository {
  final DioClient _client;
  final StorageService _storage;

  OrderRepository(this._client, this._storage);

  Future<OrderModel> submitOrder(
    List<CartItem> items,
    double total,
    String address,
    String paymentMethod,
  ) async {
    final response = await _client.dio.post(
      ApiEndpoints.placeOrder,
      data: {
        'items': items.map((i) => {'product_id': i.product.id, 'qty': i.quantity}).toList(),
        'total': total,
        'address': address,
        'payment_method': paymentMethod,
      },
    );
    return OrderModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  /// Connects to the real-time order tracking WebSocket.
  /// The server sends JSON frames: { "status": "preparing" | "delivering" | ... }
  /// Token is passed as a query param since WebSocket headers aren't universally supported.
  Stream<String> getOrderStatusStream(String orderId) async* {
    final token = await _storage.getToken();
    final uri = Uri.parse(
      '${ApiEndpoints.wsBase}${ApiEndpoints.trackOrder}$orderId'
      '${token != null ? '?token=$token' : ''}',
    );

    final channel = WebSocketChannel.connect(uri);

    try {
      await for (final raw in channel.stream) {
        final data = jsonDecode(raw as String) as Map<String, dynamic>;
        final status = data['status'] as String?;
        if (status != null) yield status;
      }
    } finally {
      channel.sink.close();
    }
  }
}
