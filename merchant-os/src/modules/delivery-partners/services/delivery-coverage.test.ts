import { describe, expect, it } from 'vitest';
import { coversDelivery, hasCoordinates, routeDistance } from './delivery-coverage';

const area = { city: 'الخرطوم', district: 'الكلاكلة القبة' };
describe('optional delivery coordinates', () => {
  it('matches the configured city and district without inventing a distance', () => {
    expect(coversDelivery(area, null, { city: ' الخرطوم ', district: 'الكَلاكلة  القبة' })).toBe(true);
    expect(routeDistance({ lat: 15.5, lng: 32.5 }, null)).toBeNull();
  });
  it('does not treat another district, another city or a legacy blank area as covered', () => {
    expect(coversDelivery(area, null, { city: 'أم درمان', district: area.district })).toBe(false);
    expect(coversDelivery(area, null, { city: area.city, district: 'حي آخر' })).toBe(false);
    expect(coversDelivery({ city: area.city }, null, area)).toBe(false);
  });
  it('preserves radius checks when coordinates exist and accepts real zero coordinates', () => {
    expect(hasCoordinates({ lat: 0, lng: 0 })).toBe(true);
    expect(routeDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
    expect(coversDelivery({ ...area, centerLat: 15.5, centerLng: 32.5, radiusKm: 1 }, { lat: 19.6, lng: 37.2 }, area)).toBe(false);
  });
});
