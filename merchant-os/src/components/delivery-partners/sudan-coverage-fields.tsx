'use client';
import { useState } from 'react';
import { SUDAN_STATES, getSudanDistricts } from '@/lib/geography/sudan';
import { stateForCity } from '@/lib/geography/regional-coverage';
const fieldClass = 'mt-2 w-full rounded-xl border border-[var(--input)] bg-[var(--card)] px-3 py-3 disabled:opacity-60';
type InitialAddress = { state?: string | null; city?: string | null; district?: string | null; allCities?: boolean; allDistricts?: boolean };
export function SudanCoverageFields({ initial = {} }: { initial?: InitialAddress }) {
  const originalState = SUDAN_STATES.find(item => item.name === (initial.state ?? stateForCity(initial.city)));
  const originalCity = originalState?.cities.find(item => item.name === initial.city);
  const [stateId, setStateId] = useState(originalState?.id ?? '');
  const [cityId, setCityId] = useState(initial.allCities ? 'all' : originalCity?.id ?? (initial.city ? 'custom' : ''));
  const [districtId, setDistrictId] = useState(initial.allDistricts ? 'all' : originalCity && initial.district
    ? getSudanDistricts(originalCity.id).find(item => item.name === initial.district)?.id ?? 'custom' : initial.district ? 'custom' : 'all');
  const state = SUDAN_STATES.find(item => item.id === stateId), districts = getSudanDistricts(cityId);
  return <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
    <legend className="sr-only">نطاق تسعيرة التوصيل</legend>
    <label className="text-sm font-semibold">الولاية<select name="stateId" required value={stateId} className={fieldClass} onChange={event => { setStateId(event.target.value); setCityId(''); setDistrictId('all'); }}><option value="">اختر الولاية</option>{SUDAN_STATES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="text-sm font-semibold">المدينة<select name="cityId" required disabled={!stateId} value={cityId} className={fieldClass} onChange={event => { setCityId(event.target.value); setDistrictId('all'); }}><option value="">اختر المدينة أو كل المدن</option><option value="all">كل المدن في الولاية</option>{state?.cities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="custom">مدينة أخرى — إدخال يدوي</option></select></label>
    {cityId === 'custom' && <label className="text-sm font-semibold">اسم المدينة<input key={stateId} name="city" required minLength={2} maxLength={120} defaultValue={stateId === originalState?.id ? initial.city ?? '' : ''} className={fieldClass} /></label>}
    {cityId === 'all' ? <><input type="hidden" name="districtId" value="all" /><p className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900 sm:col-span-2">يشمل السعر كل المدن وكل الأحياء داخل الولاية المختارة.</p></> : <>
      <label className="text-sm font-semibold sm:col-span-2">الحي<select name="districtId" required disabled={!cityId} value={districtId} className={fieldClass} onChange={event => setDistrictId(event.target.value)}><option value="all">كل الأحياء في المدينة</option>{districts.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="custom">حي آخر — إدخال يدوي</option></select></label>
      {districtId === 'custom' && <label className="text-sm font-semibold sm:col-span-2">اسم الحي<input key={`${stateId}:${cityId}`} name="district" required minLength={2} maxLength={120} defaultValue={stateId === originalState?.id && (cityId === originalCity?.id || cityId === 'custom') ? initial.district ?? '' : ''} className={fieldClass} /></label>}
    </>}
  </fieldset>;
}
