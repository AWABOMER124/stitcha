import 'package:flutter_test/flutter_test.dart';
import 'package:wassalk_app/features/cart/domain/product_model.dart';
import 'package:wassalk_app/features/auth/domain/user_model.dart';
import 'package:wassalk_app/features/home/domain/store_model.dart';
import 'package:wassalk_app/features/orders/domain/order_model.dart';
import 'package:wassalk_app/features/orders/domain/order_tracking_update.dart';

void main() {
  group('mobile API model contracts', () {
    test('accepts the rotating customer token pair without printing secrets',
        () {
      final user = UserModel.fromJson({
        'id': 'account-1',
        'name': 'Demo customer',
        'phone': '0912345678',
        'token': 'short-access-token',
        'refreshToken': 'opaque-refresh-token',
        'expiresIn': 900,
      });

      expect(user.refreshToken, 'opaque-refresh-token');
      expect(user.expiresIn, 900);
      expect(user.toString(), isNot(contains('opaque-refresh-token')));
    });

    test('accepts a store without an image or rating', () {
      final store = StoreModel.fromJson({
        'id': 'store-1',
        'name': 'Demo store',
        'category': 'Restaurant',
        'imageUrl': null,
        'rating': null,
        'deliveryTime': '30-45 minutes',
        'deliveryFee': 15.0,
      });

      expect(store.imageUrl, isNull);
      expect(store.rating, isNull);
    });

    test('accepts a product with optional catalogue fields missing', () {
      final product = ProductModel.fromJson({
        'id': 'product-1',
        'storeId': 'store-1',
        'name': 'Demo product',
        'description': null,
        'price': 100.0,
        'imageUrl': null,
        'category': null,
      });

      expect(product.description, isNull);
      expect(product.imageUrl, isNull);
      expect(product.category, isNull);
    });

    test('accepts a pickup order without a delivery address', () {
      final order = OrderModel.fromJson({
        'id': 'order-1',
        'status': 'pending',
        'totalAmount': 100.0,
        'date': '2026-08-25T00:00:00.000Z',
        'address': null,
        'storeName': 'Demo store',
      });

      expect(order.address, isNull);
    });

    test('combines an order status with a real driver location', () {
      const initial = OrderTrackingUpdate(status: 'preparing');
      final update = initial.copyWith(
        status: 'delivering',
        driverLat: 15.5007,
        driverLng: 32.5599,
        driverName: 'Demo driver',
      );

      expect(update.status, 'delivering');
      expect(update.hasDriverLocation, isTrue);
      expect(update.driverName, 'Demo driver');
    });
  });
}
