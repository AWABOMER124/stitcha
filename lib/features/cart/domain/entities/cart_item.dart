import 'package:wassalk_app/features/cart/domain/product_model.dart';

/// Domain entity representing a single item inside the user's shopping cart.
/// Lives in domain layer — no UI or framework dependencies.
class CartItem {
  final ProductModel product;
  final int quantity;
  final String? notes;

  const CartItem({
    required this.product,
    this.quantity = 1,
    this.notes,
  });

  /// Computed price for this line item
  double get subtotal => product.price * quantity;

  CartItem copyWith({int? quantity, String? notes}) {
    return CartItem(
      product: product,
      quantity: quantity ?? this.quantity,
      notes: notes ?? this.notes,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CartItem &&
          runtimeType == other.runtimeType &&
          product.id == other.product.id;

  @override
  int get hashCode => product.id.hashCode;
}
