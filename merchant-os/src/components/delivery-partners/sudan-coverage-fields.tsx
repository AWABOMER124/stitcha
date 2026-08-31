'use client';

import { useReducer } from 'react';
import {
  SUDAN_STATES, EMPTY_SUDAN_SELECTION, changeSudanSelection, getSudanCities, getSudanDistricts,
  type SudanSelection,
} from '@/lib/geography/sudan';

const fieldClass = 'mt-2 w-full rounded-xl border border-[var(--input)] bg-[var(--card)] px-3 py-3 disabled:opacity-60';

export function SudanCoverageFields() {
  const [selection, select] = useReducer(
    (current: SudanSelection, action: { field: keyof SudanSelection; value: string }) =>
      changeSudanSelection(current, action.field, action.value), EMPTY_SUDAN_SELECTION,
  );
  const cities = getSudanCities(selection.stateId);
  const districts = getSudanDistricts(selection.cityId);
  const district = districts.find(item => item.id === selection.districtId);
  const scopeKey = `${selection.stateId}:${selection.cityId}:${selection.districtId}`;
  return (
    <fieldset className="grid gap-3 rounded-xl border border-[var(--border)] p-3 sm:col-span-2 sm:grid-cols-2">
      <legend className="px-2 text-sm font-bold">الموقع داخل السودان</legend>
      <input type="hidden" name="locationMode" value="directory" />
      <label className="text-sm font-semibold">
        الولاية
        <select name="stateId" required value={selection.stateId} className={fieldClass}
          onChange={event => select({ field: 'stateId', value: event.target.value })}>
          <option value="">اختر الولاية</option>
          {SUDAN_STATES.map(state => <option key={state.id} value={state.id}>{state.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">
        المدينة
        <select name="cityId" required disabled={!selection.stateId} value={selection.cityId} className={fieldClass}
          onChange={event => select({ field: 'cityId', value: event.target.value })}>
          <option value="">اختر المدينة</option>
          {cities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
          <option value="custom">مدينة أخرى في الولاية — إدخال يدوي</option>
        </select>
      </label>
      {selection.cityId === 'custom' ? (
        <label className="text-sm font-semibold">
          اسم المدينة غير المدرجة
          <input key={selection.stateId} name="city" required minLength={2} maxLength={120} className={fieldClass} />
        </label>
      ) : (
        <label className="text-sm font-semibold">
          الحي / المنطقة
          <select name="districtId" value={selection.districtId} disabled={!selection.cityId || !districts.length}
            className={fieldClass} onChange={event => select({ field: 'districtId', value: event.target.value })}>
            <option value="">{districts.length ? 'منطقة مخصصة / حي غير مدرج' : 'أدخل اسم المنطقة يدوياً'}</option>
            {districts.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      )}
      <label className="text-sm font-semibold">
        {district ? 'اسم المنطقة المختارة' : 'اسم نطاق الخدمة / الحي غير المدرج'}
        <input key={scopeKey} name="name" defaultValue={district?.name ?? ''} readOnly={!!district}
          required minLength={2} maxLength={120} className={fieldClass} />
      </label>
      <p role="status" className="text-xs leading-6 text-[var(--muted-foreground)] sm:col-span-2">
        دليل أولي للمدن والأحياء، وليس قائمة شاملة أو تأكيداً لتوفر التوصيل.
        يجب تحديد مركز المنطقة ونصف قطر التغطية الفعلي أدناه، ثم إضافة التسعير.
        {selection.cityId && !districts.length && ' لا توجد أحياء مدرجة لهذه المدينة بعد؛ يمكنك إدخال المنطقة يدوياً.'}
      </p>
    </fieldset>
  );
}
