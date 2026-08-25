class OrderTrackingUpdate {
  final String status;
  final double? driverLat;
  final double? driverLng;
  final String? driverName;

  const OrderTrackingUpdate({
    required this.status,
    this.driverLat,
    this.driverLng,
    this.driverName,
  });

  bool get hasDriverLocation => driverLat != null && driverLng != null;

  OrderTrackingUpdate copyWith({
    String? status,
    double? driverLat,
    double? driverLng,
    String? driverName,
  }) {
    return OrderTrackingUpdate(
      status: status ?? this.status,
      driverLat: driverLat ?? this.driverLat,
      driverLng: driverLng ?? this.driverLng,
      driverName: driverName ?? this.driverName,
    );
  }
}
