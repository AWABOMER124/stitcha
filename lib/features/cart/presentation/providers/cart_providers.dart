import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wassalk_app/features/cart/domain/entities/cart_item.dart';
import 'package:wassalk_app/features/cart/domain/product_model.dart';

// Re-export CartItem so existing imports from this file keep working
// during the transition period. Remove after Phase 2 cleanup.
export 'package:wassalk_app/features/cart/domain/entities/cart_item.dart';

/// Manages the user's shopping cart state.
/// CartItem is now correctly imported from the domain layer.
class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super([]);

  void addProduct(ProductModel product, {int quantity = 1, String? notes}) {
    final existingIndex =
        state.indexWhere((item) => item.product.id == product.id);
    if (existingIndex >= 0) {
      final updated = List<CartItem>.from(state);
      updated[existingIndex] = updated[existingIndex].copyWith(
        quantity: updated[existingIndex].quantity + quantity,
      );
      state = updated;
    } else {
      state = [
        ...state,
        CartItem(product: product, quantity: quantity, notes: notes),
      ];
    }
  }

  void removeProduct(String productId) {
    state = state.where((item) => item.product.id != productId).toList();
  }

  void updateQuantity(String productId, int newQuantity) {
    if (newQuantity <= 0) {
      removeProduct(productId);
      return;
    }
    state = [
      for (final item in state)
        if (item.product.id == productId)
          item.copyWith(quantity: newQuantity)
        else
          item,
    ];
  }

  double get totalAmount {
    return state.fold(0.0, (total, item) => total + item.subtotal);
  }

  int get totalItems {
    return state.fold(0, (total, item) => total + item.quantity);
  }

  void clear() => state = [];
}

final cartProvider =
    StateNotifierProvider<CartNotifier, List<CartItem>>((ref) {
  return CartNotifier();
});
