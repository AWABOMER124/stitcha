import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wassalk_app/features/cart/domain/product_model.dart';
import 'package:wassalk_app/features/cart/data/product_repository.dart';

/// Exposes store product list to the presentation layer.
/// The Screen should only import from THIS file — never directly from data/.
///
/// This provider acts as the boundary between presentation and data.
/// When switching from mock to real API, only product_repository.dart changes.
final storeProductsProvider =
    FutureProvider.family<List<ProductModel>, String>((ref, storeId) async {
  final repo = ref.watch(productRepositoryProvider);
  return repo.getProductsForStore(storeId);
});
