import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/store_model.dart';
import '../../data/store_repository.dart';

// Riverpod FutureProvider automatically fetches the stores and exposes loading/error states
final featuredStoresProvider = FutureProvider<List<StoreModel>>((ref) async {
  final repository = ref.watch(storeRepositoryProvider);
  return repository.getFeaturedStores();
});
