export interface GeoPoint {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two lat/lng points, in kilometers. */
export function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Returns the point in `points` nearest to `origin`, with its distance in km, or null if `points` is empty. */
export function findNearest<T extends GeoPoint>(origin: GeoPoint, points: T[]): { point: T; distanceKm: number } | null {
  if (points.length === 0) return null;

  let nearest = points[0];
  let nearestDistance = haversineDistanceKm(origin, points[0]);

  for (const point of points.slice(1)) {
    const distance = haversineDistanceKm(origin, point);
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }

  return { point: nearest, distanceKm: nearestDistance };
}
