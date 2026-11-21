'use client';

import { useActionState } from 'react';
import { savePaymobSettingsAction } from '@/modules/paymob-payments/actions';

export function PaymobSettingsForm({ settings }: { settings: {
  enabled: boolean; mode: 'TEST' | 'LIVE'; publicKey: string; integrationIds: number[];
  saved: { secretKey: boolean; apiKey: boolean; hmac: boolean; publicKey: boolean };
} }) {
  const [state, action, pending] = useActionState(savePaymobSettingsAction, { ok: false, message: '' });
  const field = 'mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3';
  return <form action={action} className="space-y-5">
    <label className="block text-sm font-bold">البيئة<select name="mode" defaultValue={settings.mode} className={field}><option value="TEST">اختبار — TEST</option><option value="LIVE">تشغيل فعلي — LIVE</option></select></label>
    <label className="block text-sm font-bold">المفتاح العام — Public Key<input name="publicKey" defaultValue={settings.publicKey} autoComplete="off" maxLength={2048} dir="ltr" className={field}/></label>
    {([['secretKey', 'المفتاح السري — Secret Key'], ['apiKey', 'مفتاح الاستعلام والمطابقة — API Key'], ['hmac', 'سر التوقيع — HMAC']] as const).map(([name, label]) => <label key={name} className="block text-sm font-bold">{label}<input type="password" name={name} autoComplete="new-password" placeholder={settings.saved[name] ? 'محفوظ — اتركه فارغًا للإبقاء عليه' : 'لم يضف بعد'} maxLength={8192} dir="ltr" className={field}/></label>)}
    <label className="block text-sm font-bold">معرّفات طرق الدفع — Integration IDs<input name="integrationIds" defaultValue={settings.integrationIds.join(', ')} autoComplete="off" dir="ltr" placeholder="12345, 67890" className={field}/><span className="mt-2 block text-xs font-normal text-[var(--muted-foreground)]">استخدم معرّفات السعودية بالريال، وبنفس بيئة المفاتيح المختارة.</span></label>
    <label className="flex items-center gap-3 rounded-xl border p-4 text-sm font-bold"><input name="enabled" type="checkbox" defaultChecked={settings.enabled}/>تفعيل Paymob للاشتراكات والمتاجر السعودية</label>
    <p className="text-sm leading-7 text-[var(--muted-foreground)]">رسوم معالجة Paymob تخصم من مستحقات التاجر بعد مطابقتها. لا توجد إضافة تلقائية لرسوم على فاتورة العميل.</p>
    <button disabled={pending} className="rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white disabled:opacity-50">{pending ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}</button>
    {state.message && <p role="status" className={`rounded-xl p-4 text-sm ${state.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}>{state.message}</p>}
  </form>;
}
