// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'order_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$OrderModelImpl _$$OrderModelImplFromJson(Map<String, dynamic> json) =>
    _$OrderModelImpl(
      id: json['id'] as String,
      status: json['status'] as String,
      totalAmount: (json['totalAmount'] as num).toDouble(),
      date: json['date'] as String,
      address: json['address'] as String,
      storeName: json['storeName'] as String,
    );

Map<String, dynamic> _$$OrderModelImplToJson(_$OrderModelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'status': instance.status,
      'totalAmount': instance.totalAmount,
      'date': instance.date,
      'address': instance.address,
      'storeName': instance.storeName,
    };
