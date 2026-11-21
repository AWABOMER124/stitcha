import regions from './saudi-regions.json';
export const SAUDI_REGIONS = regions;
export function saudiRegionForCity(city: string | null | undefined) {
  return regions.find(region => region.cities.some(item => item.name === city))?.name ?? null;
}
