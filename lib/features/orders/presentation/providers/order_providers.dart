import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wassalk_app/features/orders/domain/order_model.dart';
import 'package:wassalk_app/features/orders/data/order_repository.dart';
import 'package:wassalk_app/features/cart/presentation/providers/cart_providers.dart';

class CheckoutNotifier extends StateNotifier<AsyncValue<OrderModel?>> {
  final OrderRepository _repo;
  final Ref _ref;

  CheckoutNotifier(this._repo, this._ref) : super(const AsyncData(null));

  Future<void> submitOrder(String address, String paymentMethod) async {
    state = const AsyncLoading();
    try {
      final cartItems = _ref.read(cartProvider);
      final total = _ref.read(cartProvider.notifier).totalAmount;

      final order = await _repo.submitOrder(cartItems, total, address, paymentMethod);
      
      // Clear cart on successful order
      _ref.read(cartProvider.notifier).clear();
      
      state = AsyncData(order);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }
}

final checkoutProvider = StateNotifierProvider<CheckoutNotifier, AsyncValue<OrderModel?>>((ref) {
  return CheckoutNotifier(ref.watch(orderRepositoryProvider), ref);
});

// StreamProvider allows UI to auto-update dynamically based on the yielded stream
final orderTrackingProvider = StreamProvider.family<String, String>((ref, orderId) {
  return ref.watch(orderRepositoryProvider).getOrderStatusStream(orderId);
});
