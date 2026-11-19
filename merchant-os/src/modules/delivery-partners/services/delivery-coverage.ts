import { normalizePlace, stateForCity } from '@/lib/geography/regional-coverage';
type Coordinates = { lat?: number | null; lng?: number | null };
type Area = { state?: string | null; allCities?: boolean; allDistricts?: boolean; city?: string | null; district?: string | null; centerLat?: number | null; centerLng?: number | null; radiusKm?: number | null };

export function hasCoordinates(value: Coordinates | null | undefined): value is { lat: number; lng: number } {
  return !!value && typeof value.lat === 'number' && Number.isFinite(value.lat) && Math.abs(value.lat) <= 90
    && typeof value.lng === 'number' && Number.isFinite(value.lng) && Math.abs(value.lng) <= 180;
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radians = (value: number) => value * Math.PI / 180;
  const value = Math.sin(radians(b.lat - a.lat) / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(radians(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0, 1 - value)));
}

export function routeDistance(origin: Coordinates | null | undefined, destination: Coordinates | null | undefined): number | null {
  return hasCoordinates(origin) && hasCoordinates(destination) ? distanceKm(origin, destination) : null;
}

export function coversDelivery(area: Area, destination: Coordinates | null | undefined, address: { state?: string | null; city: string | null; district: string | null }) {
  const knownState = stateForCity(address.city);
  if (address.state && knownState && normalizePlace(address.state) !== normalizePlace(knownState)) return false;
  const destinationState = address.state ?? knownState;
  if (area.allCities || area.allDistricts) {
    if (!area.state || !destinationState || normalizePlace(area.state) !== normalizePlace(destinationState)) return false;
    if (area.allCities) return area.allDistricts === true && !area.city && !area.district;
    return !!area.city && !area.district && normalizePlace(area.city) === normalizePlace(address.city);
  }
  const center = { lat: area.centerLat, lng: area.centerLng };
  if (hasCoordinates(destination) && hasCoordinates(center) && area.radiusKm != null && area.radiusKm > 0) {
    return distanceKm(center, destination) <= area.radiusKm;
  }
  if (area.state && (!destinationState || normalizePlace(area.state) !== normalizePlace(destinationState))) return false;
  const city = normalizePlace(area.city), district = normalizePlace(area.district);
  return !!city && !!district && city === normalizePlace(address.city) && district === normalizePlace(address.district);
}

export function supportsAddressOnly(config: { integrationMode?: string | null; providerKey?: string } | null | undefined) {
  return config?.integrationMode === 'APP_V1' || config?.providerKey === 'TEST_SIMULATOR';
}
