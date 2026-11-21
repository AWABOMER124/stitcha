'use client';
import { useId, useState } from 'react';
import { SUDAN_STATES, getSudanDistricts } from '@/lib/geography/sudan';
import { stateForCity } from '@/lib/geography/regional-coverage';
import { SAUDI_REGIONS, saudiRegionForCity } from '@/lib/geography/saudi';
export function DeliveryAddressFields({ country = 'SD', initialState = '', initialCity = '', initialDistrict = '', initialDescription = '', required = true, locale = 'ar', onLocationChange }: {
  country?: string; initialState?: string; initialCity?: string; initialDistrict?: string; initialDescription?: string; required?: boolean; locale?: string; onLocationChange?: () => void;
}) {
  const id = useId(), ar = locale === 'ar';
  const saudi = country === 'SA';
  const regions = saudi ? SAUDI_REGIONS : SUDAN_STATES;
  const [state, setState] = useState(initialState || (saudi ? saudiRegionForCity(initialCity) : stateForCity(initialCity)) || '');
  const [city, setCity] = useState(initialCity), [district, setDistrict] = useState(initialDistrict);
  const cities = regions.find(item => item.name === state)?.cities ?? [];
  const cityId = cities.find(item => item.name === city)?.id;
  const cls = 'mt-1 w-full rounded-xl border border-[var(--border,#e7e5e4)] bg-transparent px-3 py-2.5 text-sm font-normal';
  return <fieldset className="space-y-3">
    <legend className="sr-only">{ar ? 'تفاصيل عنوان التوصيل' : 'Delivery address details'}</legend>
    <input type="hidden" name="deliveryAddressVersion" value="3" />
    <label className="block text-sm font-bold">{ar ? saudi ? 'المنطقة' : 'الولاية' : 'Region / state'}<select name="customerState" required={required} value={state} onChange={event => { setState(event.target.value); setCity(''); setDistrict(''); onLocationChange?.(); }} className={cls}><option value="">{ar ? 'اختر المنطقة / الولاية' : 'Choose region / state'}</option>{regions.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-bold">{ar ? 'المدينة' : 'City'}<input name="customerCity" required={required} minLength={2} maxLength={120} list={`cities-${id}`} value={city} onChange={event => { setCity(event.target.value); setDistrict(''); onLocationChange?.(); }} className={cls} /><datalist id={`cities-${id}`}>{cities.map(item => <option key={item.id} value={item.name} />)}</datalist></label>
      <label className="block text-sm font-bold">{ar ? 'الحي' : 'District'}<input name="customerDistrict" required={required} minLength={2} maxLength={120} list={`districts-${id}`} value={district} onChange={event => { setDistrict(event.target.value); onLocationChange?.(); }} className={cls} /><datalist id={`districts-${id}`}>{getSudanDistricts(cityId ?? '').map(item => <option key={item.id} value={item.name} />)}</datalist></label>
    </div>
    <label className="block text-sm font-bold">{ar ? 'وصف العنوان / أقرب معلم (اختياري)' : 'Address description / landmark (optional)'}<textarea name="customerAddressDescription" maxLength={1000} rows={2} defaultValue={initialDescription} className={cls} /></label>
    <p className="text-xs text-[var(--muted-foreground,#78716c)]">{ar ? 'اختر الولاية ثم المدينة والحي، أو اكتب اسم مدينة وحي غير مدرجين داخل الولاية المختارة.' : 'Choose the state, then select or enter a city and district within that state.'}</p>
  </fieldset>;
}
