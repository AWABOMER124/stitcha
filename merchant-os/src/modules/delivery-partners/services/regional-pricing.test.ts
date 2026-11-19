import { describe, expect, it, vi } from 'vitest';
import { resolveRegionalCoverage, stateForCity } from '@/lib/geography/regional-coverage';
import { coversDelivery } from './delivery-coverage';
import { placeOrderSchema } from '@/modules/storefront/schemas/storefront.schemas';
vi.mock('@/lib/db/prisma', () => ({ default: {} }));
const { regionalPriceSchema } = await import('./regional-pricing.service');
const input = { stateId: 'red-sea', cityId: 'all', districtId: 'all' };

describe('fixed regional price scopes', () => {
  it('makes all cities explicitly state scoped and includes every district', () => {
    expect(resolveRegionalCoverage(input)).toMatchObject({ state: 'البحر الأحمر', city: null, district: null, allCities: true, allDistricts: true });
  });
  it('supports a whole city or just a district with canonical directory labels', () => {
    expect(resolveRegionalCoverage({ ...input, cityId: 'port-sudan' })).toMatchObject({ city: 'بورتسودان', district: null, allCities: false, allDistricts: true });
    expect(resolveRegionalCoverage({ ...input, cityId: 'port-sudan', districtId: 'deim-arab', district: 'tampered' })).toMatchObject({ district: 'ديم عرب', allDistricts: false });
  });
  it.each([{ stateId: '' }, { cityId: '' }, { stateId: 'kassala', cityId: 'port-sudan' }, { cityId: 'port-sudan', districtId: 'burri' }, { districtId: 'deim-arab' }, { cityId: 'custom', city: 'كسلا' }])('rejects ambiguous or contradictory scope %j', change => {
    expect(resolveRegionalCoverage({ ...input, ...change })).toBeNull();
  });
  it('allows custom cities and districts within an explicit state', () => {
    expect(resolveRegionalCoverage({ ...input, cityId: 'custom', city: 'مدينة جديدة', districtId: 'custom', district: 'حي جديد' })).toMatchObject({ city: 'مدينة جديدة', district: 'حي جديد', state: 'البحر الأحمر' });
  });
  it('never turns absent city/district metadata into blanket coverage', () => {
    expect(coversDelivery({ state: 'البحر الأحمر' }, null, { city: 'بورتسودان', district: 'ديم عرب' })).toBe(false);
    expect(coversDelivery({ allCities: true, allDistricts: true }, null, { city: 'بورتسودان', district: 'ديم عرب' })).toBe(false);
  });
  it('covers known and custom cities only in the chosen state', () => {
    const area = resolveRegionalCoverage(input)!;
    expect(coversDelivery(area, null, { city: 'طوكر', district: 'أي حي' })).toBe(true);
    expect(coversDelivery(area, null, { state: 'البحر الأحمر', city: 'مدينة جديدة', district: 'أي حي' })).toBe(true);
    expect(coversDelivery(area, null, { state: 'كسلا', city: 'مدينة جديدة', district: 'أي حي' })).toBe(false);
    expect(coversDelivery(area, null, { city: 'مدينة غير معروفة', district: 'أي حي' })).toBe(false);
  });
  it('covers all districts in one city without including another city', () => {
    const area = resolveRegionalCoverage({ ...input, cityId: 'port-sudan' })!;
    expect(coversDelivery(area, null, { city: 'بورتسودان', district: 'حي جديد' })).toBe(true);
    expect(coversDelivery(area, null, { city: 'طوكر', district: 'حي جديد' })).toBe(false);
  });
  it('only resolves a state from a known structured city', () => {
    expect(stateForCity('  بُورتسودان ')).toBe('البحر الأحمر');
    expect(stateForCity('مدينة غير معروفة')).toBeNull();
  });
  it.each(['', ' ', '-1', '1.234', 'NaN', 'Infinity', '100000000'])('rejects an invalid price %j', baseFee => {
    expect(regionalPriceSchema.safeParse({ baseFee }).success).toBe(false);
  });
  it('accepts an explicit free price and rejects inverted delivery times', () => {
    expect(regionalPriceSchema.parse({ baseFee: '0', etaMin: '', etaMax: '' }).baseFee).toBe(0);
    expect(regionalPriceSchema.safeParse({ baseFee: '100.50', etaMin: 60, etaMax: 30 }).success).toBe(false);
  });
  it('requires state in new address forms while retaining version 2 compatibility', () => {
    const order = { customerName: 'عميل اختبار', customerPhone: '+249900000001', customerCity: 'بورتسودان', customerDistrict: 'ديم عرب', customerAddress: 'شارع الاختبار', deliveryMethod: 'MERCHANT_DELIVERY', items: [{ productId: 'product', quantity: 1 }] };
    expect(placeOrderSchema.safeParse({ ...order, deliveryAddressVersion: '2' }).success).toBe(true);
    expect(placeOrderSchema.safeParse({ ...order, deliveryAddressVersion: '3' }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...order, deliveryAddressVersion: '3', customerState: 'البحر الأحمر' }).success).toBe(true);
    expect(placeOrderSchema.safeParse({ ...order, customerState: 'كسلا' }).success).toBe(false);
  });
});
