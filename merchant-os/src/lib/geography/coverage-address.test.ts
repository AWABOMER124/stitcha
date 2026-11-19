import { describe, expect, it } from 'vitest';
import { resolveCoverageAddress } from './coverage-address';
import { createDeliveryZoneSchema, updateDeliveryZoneSchema } from '@/modules/finance/schemas/finance.schemas';

const input = { addressVersion: '2', locationMode: 'directory', stateId: 'red-sea', cityId: 'port-sudan', districtId: 'deim-arab', name: 'تغطية السوق', description: ' قرب السوق\nوالشارع الرئيسي ' };
describe('Coverage address fields', () => {
  it('keeps the service name independent and resolves trusted city and district labels', () => {
    expect(resolveCoverageAddress({ ...input, city: 'tampered', district: 'tampered', state: 'tampered' })).toEqual({
      state: 'البحر الأحمر', city: 'بورتسودان', district: 'ديم عرب', name: 'تغطية السوق', description: 'قرب السوق\nوالشارع الرئيسي',
    });
  });
  it('accepts a manual district inside a listed city', () => {
    expect(resolveCoverageAddress({ ...input, districtId: '', district: 'حي جديد' })?.district).toBe('حي جديد');
  });
  it('accepts an unlisted city and district without guessing coordinates', () => {
    expect(resolveCoverageAddress({ ...input, cityId: 'custom', city: 'مدينة جديدة', districtId: '', district: 'حي جديد' })).toMatchObject({ city: 'مدينة جديدة', district: 'حي جديد' });
  });
  it.each([{ districtId: '', district: '' }, { name: ' ' }, { stateId: 'khartoum' }, { districtId: 'burri' }, { description: 'a'.repeat(1001) }, { description: 'bad\u0000text' }, { addressVersion: '3' }])('rejects invalid new address: %j', change => {
    expect(resolveCoverageAddress({ ...input, ...change })).toBeNull();
  });
  it('preserves old forms and does not invent missing state or district metadata', () => {
    expect(resolveCoverageAddress({ city: 'مدينة قديمة', name: 'نطاق قديم' })).toEqual({ city: 'مدينة قديمة', name: 'نطاق قديم', state: null, district: null, description: null });
  });
  it('validates distributor location fields without breaking partial activation updates', () => {
    expect(createDeliveryZoneSchema.parse({ name: 'نطاق جديد', city: ' بورتسودان ', district: ' ديم عرب ', description: 'وصف', baseFee: 100 })).toMatchObject({ city: 'بورتسودان', district: 'ديم عرب', description: 'وصف' });
    expect(updateDeliveryZoneSchema.parse({ isActive: false })).toEqual({ isActive: false });
    expect(createDeliveryZoneSchema.safeParse({ name: 'نطاق', city: 'bad\u0000city', baseFee: 0 }).success).toBe(false);
  });
});
