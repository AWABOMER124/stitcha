import { SUDAN_STATES, getSudanDistricts } from './sudan';

export function normalizePlace(value: string | null | undefined) {
  return (value ?? '').normalize('NFKC').replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ar');
}

/** Resolve only an unambiguous directory city; never guess an unlisted city's state. */
export function stateForCity(city: string | null | undefined): string | null {
  const matches = SUDAN_STATES.filter(state => state.cities.some(item => normalizePlace(item.name) === normalizePlace(city)));
  return matches.length === 1 ? matches[0].name : null;
}

export function resolveRegionalCoverage(input: Record<string, unknown>) {
  const read = (key: string) => typeof input[key] === 'string' ? input[key].trim() : '';
  const valid = (value: string) => value.length >= 2 && value.length <= 120 && !/[\u0000-\u001f\u007f]/.test(value);
  const state = SUDAN_STATES.find(item => item.id === read('stateId'));
  if (!state) return null;
  const allCities = read('cityId') === 'all';
  const cityEntry = state.cities.find(item => item.id === read('cityId'));
  const city = allCities ? null : cityEntry?.name ?? (read('cityId') === 'custom' && valid(read('city')) ? read('city') : null);
  if (!allCities && !city) return null;
  // A listed city cannot be reassigned to a different state through manual input.
  if (city && stateForCity(city) && stateForCity(city) !== state.name) return null;
  const allDistricts = allCities || read('districtId') === 'all';
  if (allCities && read('districtId') && read('districtId') !== 'all') return null;
  const districtEntry = cityEntry ? getSudanDistricts(cityEntry.id).find(item => item.id === read('districtId')) : null;
  const district = allDistricts ? null : districtEntry?.name ?? (read('districtId') === 'custom' && valid(read('district')) ? read('district') : null);
  if (!allDistricts && !district) return null;
  const description = read('description').replace(/\r\n?/g, '\n');
  if (description.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(description)) return null;
  return { state: state.name, city, district, allCities, allDistricts,
    name: [state.name, city ?? 'كل المدن', district ?? 'كل الأحياء'].join(' · '), description: description || null };
}

export function coverageSpecificity(area: { allCities?: boolean; allDistricts?: boolean }) {
  return area.allCities ? 1 : area.allDistricts ? 2 : 3;
}
