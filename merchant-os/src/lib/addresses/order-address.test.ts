import { describe, expect, it } from 'vitest';
import { getOrderDeliveryAddress, hasCompleteDeliveryAddress } from './order-address';
import { placeOrderSchema } from '@/modules/storefront/schemas/storefront.schemas';
import { createOrderSchema, editOrderSchema } from '@/modules/orders/schemas/orders.schemas';

const base = { customerName: 'عميل اختبار', customerPhone: '+249900000001', items: [{ productId: 'cm000000000000000000000001', quantity: 1 }], deliveryMethod: 'MERCHANT_DELIVERY', paymentMethod: 'CASH' };
const address = { deliveryAddressVersion: '2', customerCity: 'بورتسودان', customerDistrict: 'ديم عرب', customerAddress: 'شارع الاختبار، مبنى 7', customerAddressDescription: 'قرب الميدان' };
describe('Customer delivery address contract', () => {
  it('preserves all structured address fields in public and merchant inputs', () => {
    for (const schema of [placeOrderSchema, createOrderSchema]) expect(schema.parse({ ...base, ...address })).toMatchObject(address);
  });
  it.each(['customerCity', 'customerDistrict', 'customerAddress'])('rejects a new delivery request missing %s', field => {
    expect(placeOrderSchema.safeParse({ ...base, ...address, [field]: '' }).success).toBe(false);
  });
  it('preserves legacy clients and pickup compatibility without inventing address fields', () => {
    expect(placeOrderSchema.parse({ ...base, customerAddress: 'عنوان قديم' }).customerCity).toBeUndefined();
    expect(placeOrderSchema.safeParse({ ...base, deliveryMethod: 'PICKUP', deliveryAddressVersion: '2' }).success).toBe(true);
  });
  it('keeps the delivery snapshot ahead of customer profile fallback and maps area to district', () => {
    const value = getOrderDeliveryAddress({ customerAddress: 'قديم', customer: { address: 'عنوان حساب مختلف' }, delivery: { city: 'بورتسودان', area: 'ديم عرب', address: 'عنوان الطلب المحفوظ', notes: 'معلم قريب' } });
    expect(value).toEqual({ state: 'البحر الأحمر', city: 'بورتسودان', district: 'ديم عرب', address: 'عنوان الطلب المحفوظ', addressDescription: 'معلم قريب' });
    expect(hasCompleteDeliveryAddress(value)).toBe(true);
  });
  it('does not guess a city or district from legacy free text', () => {
    const value = getOrderDeliveryAddress({ customerAddress: 'الخرطوم، الرياض' });
    expect(value.city).toBeNull(); expect(value.district).toBeNull(); expect(hasCompleteDeliveryAddress(value)).toBe(false);
  });
  it('validates coordinate pairs when a merchant edits an address', () => {
    const edit = { customerName: 'عميل', customerPhone: '0912345678', deliveryFee: 0 };
    expect(editOrderSchema.safeParse({ ...edit, deliveryLat: '0', deliveryLng: '0' }).success).toBe(true);
    expect(editOrderSchema.safeParse({ ...edit, deliveryLat: '19.6', deliveryLng: '' }).success).toBe(false);
  });
});
