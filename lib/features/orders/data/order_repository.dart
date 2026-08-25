import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wassalk_app/core/network/api_endpoints.dart';
import 'package:wassalk_app/core/network/dio_client.dart';
import '../domain/order_model.dart';
import '../domain/order_tracking_update.dart';
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
        'items': items
            .map((i) => {'product_id': i.product.id, 'qty': i.quantity})
            .toList(),
        'total': total,
        'address': address,
        'payment_method': paymentMethod,
      },
    );
    return OrderModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<List<OrderModel>> getOrderHistory() async {
    final response = await _client.dio.get(ApiEndpoints.userOrders);
    final data = response.data['data'] as List<dynamic>;
    return data
        .map((json) => OrderModel.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// Connects to the real-time order-tracking Server-Sent-Events stream
  /// (`GET /tracking/{orderId}`, `text/event-stream`). The bearer token is
  /// attached automatically by the Dio auth interceptor, same as every other
  /// request — no manual token handling needed here.
  ///
  /// The server emits its full internal order-lifecycle enum (NEW, ACCEPTED,
  /// PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, REJECTED) plus
  /// DRIVER_LOCATION frames with no `status` key. Status and location frames
  /// are accumulated into one update so either can refresh the tracking UI.
  /// [_mapBackendStatus] narrows the internal enum to the UI vocabulary.
  Stream<OrderTrackingUpdate> getOrderStatusStream(String orderId) async* {
    final response = await _client.dio.get<ResponseBody>(
      '${ApiEndpoints.trackOrder}$orderId',
      options: Options(responseType: ResponseType.stream),
    );

    final lines = response.data!.stream
        .cast<List<int>>()
        .transform(utf8.decoder)
        .transform(const LineSplitter());

    var current = const OrderTrackingUpdate(status: 'pending');

    await for (final line in lines) {
      if (!line.startsWith('data: ')) continue;
      final frame = jsonDecode(line.substring(6)) as Map<String, dynamic>;
      final type = frame['type'] as String?;
      final status = frame['status'] as String?;
      if (status != null) {
        current = current.copyWith(status: _mapBackendStatus(status));
        yield current;
      } else if (type == 'DRIVER_LOCATION') {
        final lat = (frame['lat'] as num?)?.toDouble();
        final lng = (frame['lng'] as num?)?.toDouble();
        if (lat != null && lng != null) {
          current = current.copyWith(
            driverLat: lat,
            driverLng: lng,
            driverName: frame['driverName'] as String?,
          );
          yield current;
        }
      }
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
