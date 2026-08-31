import { describe, expect, it } from 'vitest';
import {
  SUDAN_STATES, SUDAN_DISTRICTS, getSudanCities, getSudanDistricts,
  changeSudanSelection, resolveCoverageLocation,
} from './sudan';

describe('Sudan directory integrity', () => {
  it('includes 18 distinct states, each with cities and unique city IDs', () => {
    expect(SUDAN_STATES).toHaveLength(18);
    expect(new Set(SUDAN_STATES.map(state => state.id)).size).toBe(18);
    const cityIds = SUDAN_STATES.flatMap(state => state.cities.map(city => city.id));
    expect(new Set(cityIds).size).toBe(cityIds.length);
    for (const state of SUDAN_STATES) {
      expect(state.cities.length).toBeGreaterThan(0);
      expect(new Set(state.cities.map(city => city.name)).size).toBe(state.cities.length);
    }
  });
  it('includes districts for all six requested cities without orphan or duplicate IDs', () => {
    const cityIds = SUDAN_STATES.flatMap(state => state.cities.map(city => city.id));
    expect(Object.keys(SUDAN_DISTRICTS).sort()).toEqual(['port-sudan', 'kassala', 'atbara', 'gedaref', 'wad-madani', 'khartoum'].sort());
    for (const [city, districts] of Object.entries(SUDAN_DISTRICTS)) {
      expect(cityIds).toContain(city);
      expect(districts.length).toBeGreaterThan(10);
      expect(new Set(districts.map(district => district.id)).size).toBe(districts.length);
      expect(new Set(districts.map(district => district.name)).size).toBe(districts.length);
    }
  });
  it('keeps the capital cities separate and has no delivery geometry or activation flags', () => {
    expect(getSudanCities('khartoum').map(city => city.id)).toEqual(['khartoum', 'bahri', 'omdurman']);
    for (const place of [...SUDAN_STATES.flatMap(state => state.cities), ...Object.values(SUDAN_DISTRICTS).flat()]) {
      expect(Object.keys(place).sort()).toEqual(['id', 'name']);
    }
  });
  it('returns no suggestions for invalid IDs, including object prototype keys', () => {
    expect(getSudanCities('unknown')).toEqual([]);
    for (const id of ['unknown', '__proto__', 'constructor']) expect(getSudanDistricts(id)).toEqual([]);
  });
  it('clears dependent selections when the parent changes', () => {
    const initial = { stateId: 'khartoum', cityId: 'khartoum', districtId: 'burri' };
    expect(changeSudanSelection(initial, 'stateId', 'red-sea')).toEqual({ stateId: 'red-sea', cityId: '', districtId: '' });
    expect(changeSudanSelection(initial, 'cityId', 'bahri')).toEqual({ stateId: 'khartoum', cityId: 'bahri', districtId: '' });
    expect(changeSudanSelection(initial, 'districtId', 'al-taif').districtId).toBe('al-taif');
    expect(initial.districtId).toBe('burri');
  });
});

describe('Coverage location validation', () => {
  const selection = { locationMode: 'directory', stateId: 'red-sea', cityId: 'port-sudan', districtId: 'deim-arab' };
  it('resolves trusted labels even if submitted labels are tampered with', () => {
    expect(resolveCoverageLocation({ ...selection, name: 'Wrong', city: 'Wrong' })).toEqual({ city: 'بورتسودان', name: 'ديم عرب' });
  });
  it.each([
    { stateId: 'kassala' }, { cityId: 'atbara' }, { districtId: 'burri' },
    { stateId: '' }, { cityId: '' }, { districtId: '__proto__' }, { locationMode: 'other' },
  ])('rejects mismatched or missing directory IDs: %j', change => {
    expect(resolveCoverageLocation({ ...selection, ...change })).toBeNull();
  });
  it('accepts a custom service area in a listed city', () => {
    expect(resolveCoverageLocation({ ...selection, districtId: '', name: '  نطاق تجريبي  ' })).toEqual({ city: 'بورتسودان', name: 'نطاق تجريبي' });
  });
  it('accepts an unlisted city under an existing state, never a stale district', () => {
    const custom = { ...selection, cityId: 'custom', districtId: '', city: 'مدينة تجريبية', name: 'حي تجريبي' };
    expect(resolveCoverageLocation(custom)).toEqual({ city: 'مدينة تجريبية', name: 'حي تجريبي' });
    expect(resolveCoverageLocation({ ...custom, districtId: 'deim-arab' })).toBeNull();
    expect(resolveCoverageLocation({ ...custom, city: '' })).toBeNull();
    expect(resolveCoverageLocation({ ...custom, stateId: 'unknown' })).toBeNull();
  });
  it('retains legacy forms without accepting partial directory submissions', () => {
    expect(resolveCoverageLocation({ city: 'Khartoum', name: 'Existing area' })).toEqual({ city: 'Khartoum', name: 'Existing area' });
    expect(resolveCoverageLocation({ name: 'Existing area' })).toEqual({ city: null, name: 'Existing area' });
    expect(resolveCoverageLocation({ city: 'Khartoum', name: 'Area', cityId: 'khartoum' })).toBeNull();
  });
  it.each(['', 'a', 'a'.repeat(121), 'invalid\u0000name'])('rejects invalid free text: %j', name => {
    expect(resolveCoverageLocation({ ...selection, districtId: '', name })).toBeNull();
  });
});
