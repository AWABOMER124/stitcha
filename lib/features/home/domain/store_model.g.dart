// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'store_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$StoreModelImpl _$$StoreModelImplFromJson(Map<String, dynamic> json) =>
    _$StoreModelImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      category: json['category'] as String,
      imageUrl: json['imageUrl'] as String,
      rating: (json['rating'] as num).toDouble(),
      deliveryTime: json['deliveryTime'] as String,
      deliveryFee: (json['deliveryFee'] as num).toDouble(),
    );

Map<String, dynamic> _$$StoreModelImplToJson(_$StoreModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'category': instance.category,
      'imageUrl': instance.imageUrl,
      'rating': instance.rating,
      'deliveryTime': instance.deliveryTime,
      'deliveryFee': instance.deliveryFee,
    };
