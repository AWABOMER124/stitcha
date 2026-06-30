import 'package:freezed_annotation/freezed_annotation.dart';

part 'store_model.freezed.dart';
part 'store_model.g.dart';

@freezed
class StoreModel with _$StoreModel {
  const factory StoreModel({
    required String id,
    required String name,
    required String category,
    required String imageUrl,
    required double rating,
    required String deliveryTime,
    required double deliveryFee,
  }) = _StoreModel;

  factory StoreModel.fromJson(Map<String, dynamic> json) => _$StoreModelFromJson(json);
}
