import { SUDAN_STATES, resolveCoverageLocation } from './sudan';

export function resolveCoverageAddress(input: Record<string, unknown>) {
  const location = resolveCoverageLocation(input);
  if (!location) return null;
  const read = (key: string) => typeof input[key] === 'string' ? input[key].trim() : '';
  const version = read('addressVersion');
  if (version && version !== '2') return null;
  const description = read('description').replace(/\r\n?/g, '\n');
  if (description.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(description)) return null;
  const state = SUDAN_STATES.find(item => item.id === read('stateId'))?.name ?? null;
  const selectedDistrict = read('districtId') ? location.name : null;
  if (version !== '2') return { ...location, state, district: selectedDistrict, description: description || null };
  if (read('locationMode') !== 'directory' || !state || !location.city) return null;
  const valid = (value: string) => value.length >= 2 && value.length <= 120 && !/[\u0000-\u001f\u007f]/.test(value);
  const name = read('name'), district = selectedDistrict || read('district');
  if (!valid(name) || !valid(district)) return null;
  return { name, city: location.city, state, district, description: description || null };
}
