import { describe, it, expect } from 'vitest';
import { haversineDistanceKm, findNearest } from './geo';

describe('haversineDistanceKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistanceKm({ lat: 15.5, lng: 32.5 }, { lat: 15.5, lng: 32.5 })).toBe(0);
  });

  it('matches a known distance (Khartoum to Omdurman, ~5-6km)', () => {
    const khartoum = { lat: 15.5007, lng: 32.5599 };
    const omdurman = { lat: 15.6445, lng: 32.4777 };
    const distance = haversineDistanceKm(khartoum, omdurman);
    expect(distance).toBeGreaterThan(10);
    expect(distance).toBeLessThan(20);
  });

  it('matches a known long distance (Khartoum to Cairo, ~1580km)', () => {
    const khartoum = { lat: 15.5007, lng: 32.5599 };
    const cairo = { lat: 30.0444, lng: 31.2357 };
    const distance = haversineDistanceKm(khartoum, cairo);
    expect(distance).toBeGreaterThan(1500);
    expect(distance).toBeLessThan(1650);
  });

  it('is symmetric', () => {
    const a = { lat: 15.5, lng: 32.5 };
    const b = { lat: 16.1, lng: 33.2 };
    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 10);
  });
});

describe('findNearest', () => {
  const origin = { lat: 15.5, lng: 32.5 };

  it('returns null for an empty list', () => {
    expect(findNearest(origin, [])).toBeNull();
  });

  it('picks the closest point among several candidates', () => {
    const far = { id: 'far', lat: 20, lng: 40 };
    const near = { id: 'near', lat: 15.51, lng: 32.51 };
    const medium = { id: 'medium', lat: 16, lng: 33 };

    const result = findNearest(origin, [far, medium, near]);
    expect(result?.point.id).toBe('near');
    expect(result?.distanceKm).toBeGreaterThan(0);
  });

  it('preserves the full candidate object on the winning point', () => {
    const candidate = { id: 'd1', name: 'Driver One', lat: 15.501, lng: 32.501 };
    const result = findNearest(origin, [candidate]);
    expect(result?.point).toEqual(candidate);
  });
});
