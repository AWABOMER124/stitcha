import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db/prisma', () => ({ default: {} }));
const { coverageGeometrySchema } = await import('./coverage.service');
describe('optional service area map', () => {
  it('accepts a named area without a map and keeps the location unknown', () => {
    expect(coverageGeometrySchema.parse({ code: 'krt-kalakla', centerLat: '', centerLng: '', radiusKm: '' }))
      .toMatchObject({ centerLat: null, centerLng: null, radiusKm: null });
  });
  it('rejects partial map data and accepts valid complete geometry', () => {
    expect(coverageGeometrySchema.safeParse({ code: 'area', centerLat: 15.5, centerLng: '', radiusKm: '' }).success).toBe(false);
    expect(coverageGeometrySchema.safeParse({ code: 'area', centerLat: 15.5, centerLng: 32.5, radiusKm: 10 }).success).toBe(true);
  });
});
