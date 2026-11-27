'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, MapPin } from 'lucide-react';

type Address = { state: string; city: string; district: string; address: string; description: string };
export function PublicQuoteCheckout({ token, pickup, cash, started, expiresAt, customerName = '', customerPhone = '' }: { token: string; pickup: boolean; cash: boolean; started: boolean; expiresAt: string; customerName?: string; customerPhone?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState('');
  const [address, setAddress] = useState<Address>({ state: '', city: '', district: '', address: '', description: '' });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const locationController = useRef<AbortController | null>(null);
  useEffect(() => () => locationController.current?.abort(), []);
  useEffect(() => {
    if (!started || cash) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, 10000);
    return () => clearInterval(timer);
  }, [started, cash, router]);
  async function captureLocation() {
    if (!navigator.geolocation) { setLocationMessage('المتصفح لا يدعم تحديد الموقع. يمكنك كتابة العنوان يدويًا.'); return; }
    setLocating(true); setLocationMessage('');
    try {
      const point = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
      const coordinates = { lat: point.coords.latitude, lng: point.coords.longitude };
      setLocation(coordinates);
      locationController.current?.abort();
      const controller = new AbortController(); locationController.current = controller;
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
        url.searchParams.set('latitude', String(coordinates.lat)); url.searchParams.set('longitude', String(coordinates.lng)); url.searchParams.set('localityLanguage', 'ar');
        const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
        if (!response.ok) throw new Error();
        const data = await response.json() as { principalSubdivision?: unknown; city?: unknown; locality?: unknown; lookupSource?: unknown };
        // Never label an IP estimate as the customer's selected delivery point.
        if (data.lookupSource && data.lookupSource !== 'reverseGeocoding') throw new Error();
        const clean = (v: unknown) => typeof v === 'string' ? v.trim().slice(0, 120) : '';
        const city = clean(data.city); const locality = clean(data.locality);
        setAddress(current => ({ ...current, state: current.state || clean(data.principalSubdivision), city: current.city || city || locality, district: current.district || (locality !== city ? locality : '') }));
        setLocationMessage('تم تحديد الموقع وتعبئة البيانات المتاحة. راجع المدينة والحي وأكمل الشارع ورقم المبنى.');
      } catch {
        setLocationMessage('تم حفظ دبوس الموقع. تعذرت تعبئة العنوان تلقائيًا؛ اكتب المدينة والحي وتفاصيل الوصول.');
      } finally { clearTimeout(timer); }
    } catch {
      setLocationMessage('تعذر تحديد الموقع. اسمح بالوصول للموقع وحاول مجددًا، أو اكتب العنوان يدويًا.');
    } finally { setLocating(false); }
  }
  async function submit(form: FormData) {
    if (submitting.current) return;
    submitting.current = true; setPending(true); setError('');
    try {
      const details = { customerName: form.get('customerName'), customerPhone: form.get('customerPhone'), ...(!pickup ? { ...address, ...(location ? location : {}) } : {}) };
      const response = await fetch(`/api/sales/${token}/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(started ? {} : details) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'تعذر إتمام الطلب. حاول مجددًا.');
      if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else { router.refresh(); setPending(false); submitting.current = false; }
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر الاتصال؛ حاول مجددًا.'); setPending(false); submitting.current = false; }
  }
  const input = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-[var(--sales-color)] focus:ring-2 focus:ring-[var(--sales-color)]/20';
  function field(key: keyof Address, label: string, required = true, autoComplete?: string) {
    return <label className="text-sm font-bold">{label}<input name={key} value={address[key]} onChange={e => { const value = e.target.value; setAddress(current => ({ ...current, [key]: value })); }} className={input} required={required} minLength={required ? 2 : undefined} maxLength={120} autoComplete={autoComplete} /></label>;
  }
  return <form action={submit} className="mt-7 space-y-4 border-t border-slate-100 pt-6">
    {!started && <><h2 className="font-black">بيانات المستلم</h2><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">الاسم الكامل<input name="customerName" defaultValue={customerName} className={input} required minLength={2} maxLength={120} autoComplete="name" /></label><label className="text-sm font-bold">رقم الجوال مع رمز الدولة<input name="customerPhone" defaultValue={customerPhone} className={input} required minLength={9} maxLength={24} type="tel" dir="ltr" autoComplete="tel" /></label></div></>}
    {!pickup && !started && <><h2 className="pt-2 font-black">عنوان التوصيل</h2><button type="button" disabled={locating || pending} onClick={captureLocation} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--sales-color)] px-4 py-3 font-bold text-[var(--sales-color)] disabled:opacity-60"><MapPin size={18} />{locating ? 'جارٍ تحديد الموقع…' : location ? 'تحديث دبوس الموقع' : 'حدد موقعي وعبّئ العنوان'}</button><p className="text-xs leading-6 text-slate-500">عند اختيار تحديد الموقع، تُرسل الإحداثيات إلى BigDataCloud لتعبئة المنطقة والمدينة. يمكنك إدخال العنوان يدويًا.</p>{locationMessage && <p role="status" className="rounded-xl bg-slate-50 p-3 text-sm leading-7">{locationMessage}</p>}{location && <div className="flex items-center justify-between gap-3 text-sm"><a href={`https://www.google.com/maps?q=${location.lat},${location.lng}`} target="_blank" rel="noopener noreferrer" className="font-bold text-[var(--sales-color)]">مراجعة الموقع على الخريطة</a><button type="button" onClick={() => { setLocation(null); setLocationMessage('تم حذف دبوس الموقع. بيانات العنوان المكتوبة محفوظة.'); }} className="min-h-11 text-slate-500">حذف الموقع</button></div>}<div className="grid gap-4 sm:grid-cols-2">{field('state', 'المنطقة / الولاية', true, 'address-level1')}{field('city', 'المدينة', true, 'address-level2')}{field('district', 'الحي', true, 'address-level3')}</div><label className="block text-sm font-bold">الشارع ورقم المبنى<textarea name="address" value={address.address} onChange={e => { const value = e.target.value; setAddress(current => ({ ...current, address: value })); }} className={input} rows={3} required minLength={5} maxLength={500} autoComplete="street-address" /></label><label className="block text-sm font-bold">وصف الوصول / أقرب معلم (اختياري)<textarea name="description" value={address.description} onChange={e => { const value = e.target.value; setAddress(current => ({ ...current, description: value })); }} className={input} rows={2} maxLength={500} /></label></>}
    {pickup && !started && <p className="rounded-xl bg-slate-50 p-3 text-sm">الطلب للاستلام من المتجر. تواصل مع المتجر لتنسيق موعد الاستلام.</p>}
    {started && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm leading-7 text-amber-900">طلبك محفوظ وبانتظار تأكيد الدفع من البوابة. لو دفعت بالفعل، انتظر تحديث الحالة أو اضغط «تحديث حالة الدفع».</p>}
    {!started && <p className="text-xs leading-6 text-slate-500">يمكن بدء إتمام العرض قبل {new Date(expiresAt).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })} بتوقيت السعودية. التوفر يتأكد عند إتمام الطلب.</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={pending || locating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--sales-color)] px-5 py-4 text-sm font-bold text-white disabled:opacity-60"><LockKeyhole size={17} />{pending ? 'جارٍ تجهيز طلبك…' : cash ? 'تأكيد الطلب والدفع عند الاستلام' : started ? 'متابعة الدفع الآمن' : 'المتابعة إلى الدفع الآمن'}</button>
    {started && <button type="button" className="w-full py-2 text-sm font-bold text-[var(--sales-color)]" onClick={() => router.refresh()}>تحديث حالة الدفع</button>}
  </form>;
}
