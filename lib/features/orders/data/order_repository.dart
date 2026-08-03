import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wassalk_app/core/network/api_endpoints.dart';
import 'package:wassalk_app/core/network/dio_client.dart';
import '../domain/order_model.dart';
import 'package:wassalk_app/features/cart/domain/entities/cart_item.dart';

final orderRepositoryProvider = Provider((ref) => OrderRepository(
      ref.watch(dioClientProvider),
    ));

class OrderRepository {
  final DioClient _client;

  OrderRepository(this._client);

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

  /// Connects to the real-time order-tracking Server-Sent-Events stream
  /// (`GET /tracking/{orderId}`, `text/event-stream`). The bearer token is
  /// attached automatically by the Dio auth interceptor, same as every other
  /// request — no manual token handling needed here.
  ///
  /// The server emits its full internal order-lifecycle enum (NEW, ACCEPTED,
  /// PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, REJECTED) plus
  /// DRIVER_LOCATION frames with no `status` key (skipped here — the tracking
  /// screen doesn't consume live coordinates yet). [_mapBackendStatus] narrows
  /// that down to the small vocabulary the UI switches on.
  Stream<String> getOrderStatusStream(String orderId) async* {
    final response = await _client.dio.get<ResponseBody>(
      '${ApiEndpoints.trackOrder}$orderId',
      options: Options(responseType: ResponseType.stream),
    );

    final lines = response.data!.stream
        .cast<List<int>>()
        .transform(utf8.decoder)
        .transform(const LineSplitter());

    await for (final line in lines) {
      if (!line.startsWith('data: ')) continue;
      final frame = jsonDecode(line.substring(6)) as Map<String, dynamic>;
      final status = frame['status'] as String?;
      if (status != null) yield _mapBackendStatus(status);
    }
  }

  String _mapBackendStatus(String raw) {
    switch (raw) {
      case 'NEW':
      case 'ACCEPTED':
        return 'pending';
      case 'PREPARING':
      case 'READY':
        return 'preparing';
      case 'OUT_FOR_DELIVERY':
        return 'delivering';
      case 'DELIVERED':
        return 'completed';
      case 'CANCELLED':
      case 'REJECTED':
        return 'cancelled';
      default:
        return 'pending';
    }
  }
}
