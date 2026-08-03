class ApiEndpoints {
  // Namespaced under /customer to avoid colliding with merchant-os's
  // existing staff-facing /auth/login and /auth/register routes.
  static const String login = '/customer/auth/login';
  static const String register = '/customer/auth/register';
  static const String featuredStores = '/stores/featured';
  static const String storeDetails = '/stores/';
  static const String placeOrder = '/orders';
  static const String userOrders = '/orders/history';
  // Server-Sent-Events stream, not a WebSocket (see order_repository.dart).
  static const String trackOrder = '/tracking/';

  /// Returns the products endpoint for a given store.
  static String productsByStore(String storeId) => '/stores/$storeId/products';
}
