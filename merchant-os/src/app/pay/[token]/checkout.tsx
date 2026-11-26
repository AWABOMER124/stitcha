'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';

export function PublicQuoteCheckout({ token, pickup, cash, started, expiresAt }: { token: string; pickup: boolean; cash: boolean; started: boolean; expiresAt: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!started || cash) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, 10000);
    return () => clearInterval(timer);
  }, [started, cash, router]);
  async function submit(form: FormData) {
    setPending(true); setError('');
    try {
      const response = await fetch(`/api/sales/${token}/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(started || pickup ? {} : { city: form.get('city'), district: form.get('district'), address: form.get('address') }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'تعذر إتمام الطلب. حاول مجددًا.');
      if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else { router.refresh(); setPending(false); }
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر الاتصال؛ حاول مجددًا.'); setPending(false); }
  }
  const input = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-[var(--sales-color)] focus:ring-2 focus:ring-[var(--sales-color)]/20';
  return <form action={submit} className="mt-7 space-y-4 border-t border-slate-100 pt-6">
    {!pickup && !started && <><h2 className="font-black">عنوان التوصيل</h2><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">المدينة<input name="city" className={input} required minLength={2} maxLength={120} autoComplete="address-level2" /></label><label className="text-sm font-bold">الحي<input name="district" className={input} required minLength={2} maxLength={120} autoComplete="address-level3" /></label></div><label className="block text-sm font-bold">الشارع ورقم المبنى وتفاصيل الوصول<textarea name="address" className={input} rows={3} required minLength={5} maxLength={500} autoComplete="street-address" /></label></>}
    {pickup && !started && <p className="rounded-xl bg-slate-50 p-3 text-sm">الطلب للاستلام من المتجر. تواصل مع المتجر لتنسيق موعد الاستلام.</p>}
    {started && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm leading-7 text-amber-900">طلبك محفوظ وبانتظار تأكيد الدفع من البوابة. لو دفعت بالفعل، انتظر تحديث الحالة أو اضغط «تحديث حالة الدفع».</p>}
    {!started && <p className="text-xs leading-6 text-slate-500">يمكن بدء إتمام العرض قبل {new Date(expiresAt).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })} بتوقيت السعودية. التوفر يتأكد عند إتمام الطلب.</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--sales-color)] px-5 py-4 text-sm font-bold text-white disabled:opacity-60"><LockKeyhole size={17} />{pending ? 'جارٍ تجهيز طلبك…' : cash ? 'تأكيد الطلب والدفع عند الاستلام' : started ? 'متابعة الدفع الآمن' : 'المتابعة إلى الدفع الآمن'}</button>
    {started && <button type="button" className="w-full py-2 text-sm font-bold text-[var(--sales-color)]" onClick={() => router.refresh()}>تحديث حالة الدفع</button>}
  </form>;
}
