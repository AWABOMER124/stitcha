class ApiEndpoints {
  static const String wsBase = 'wss://api.wassalk.com/v1';
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String featuredStores = '/stores/featured';
  static const String storeDetails = '/stores/';
  static const String placeOrder = '/orders';
  static const String userOrders = '/orders/history';
  static const String trackOrder = '/orders/tracking/';

  /// Returns the products endpoint for a given store.
  static String productsByStore(String storeId) => '/stores/$storeId/products';
}
