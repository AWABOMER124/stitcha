'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSalesSettingsAction } from '@/modules/assisted-sales/actions';
import type { SalesSettings } from '@/modules/assisted-sales/policy';
import { buttonClass, inputClass } from './types';

export function SalesSettingsEditor({ settings, staff }: { settings: SalesSettings; staff: { userId: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState('');
  const [rules, setRules] = useState(settings.staffRules);
  function changeRule(userId: string, patch: Partial<SalesSettings['staffRules'][number]>) {
    const current = rules.find(r => r.userId === userId) ?? { userId, discountPercent: settings.staffDiscountPercent, canApprove: false, canViewAll: false, disabled: false };
    setRules([...rules.filter(r => r.userId !== userId), { ...current, ...patch }]);
  }
  function save(form: FormData) {
    setFeedback('');
    startTransition(async () => {
      const result = await saveSalesSettingsAction({ enabled: form.has('enabled'), allowCod: form.has('allowCod'), allowPickup: form.has('allowPickup'),
        staffDiscountPercent: Number(form.get('discount')), defaultExpiryHours: Number(form.get('expiry')), defaultDeliveryFee: Number(form.get('fee')),
        checkoutTitle: form.get('title'), terms: form.get('terms'), whatsappTemplate: form.get('template'), staffRules: rules.filter(r => staff.some(s => s.userId === r.userId)) });
      setFeedback(result.success ? 'تم حفظ إعدادات المبيعات.' : result.error);
      if (result.success) router.refresh();
    });
  }
  return <form action={save} data-action-guard="off" className="space-y-6 rounded-2xl border bg-[var(--card)] p-4 sm:p-6">
    <div><h2 className="text-xl font-black">تحكم يناسب طريقة بيعك</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">سياسة الأسعار ورسائل واتساب وصلاحيات الفريق. الإعدادات لمالك المتجر.</p></div>
    <div className="flex flex-wrap gap-5 text-sm font-bold">{[['enabled', 'تفعيل المبيعات الخاصة'], ['allowCod', 'إتاحة الدفع عند الاستلام'], ['allowPickup', 'إتاحة الاستلام من المتجر']].map(([key, title]) => <label key={key} className="flex min-h-11 items-center gap-2"><input type="checkbox" name={key} defaultChecked={Boolean(settings[key as keyof SalesSettings])} />{title}</label>)}</div>
    <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-bold">حد خصم الموظفين الافتراضي ٪<input name="discount" className={inputClass} type="number" min={0} max={100} step="0.01" defaultValue={settings.staffDiscountPercent} required /></label>
      <label className="text-sm font-bold">صلاحية العرض الافتراضية بالساعات<input name="expiry" className={inputClass} type="number" min={1} max={720} defaultValue={settings.defaultExpiryHours} required /></label>
      <label className="text-sm font-bold">رسوم الشحن الافتراضية<input name="fee" className={inputClass} type="number" min={0} max={999999} step="0.01" defaultValue={settings.defaultDeliveryFee} required /></label></div>
    <label className="block text-sm font-bold">عنوان صفحة العميل<input name="title" className={inputClass} maxLength={100} minLength={2} defaultValue={settings.checkoutTitle} required /></label>
    <label className="block text-sm font-bold">شروط العرض<textarea name="terms" className={inputClass} rows={3} maxLength={2000} defaultValue={settings.terms} /><span className="mt-1 block text-xs font-normal text-[var(--muted-foreground)]">تُحفظ نسخة من الشروط مع كل عرض جديد أو معدل.</span></label>
    <label className="block text-sm font-bold">قالب رسالة واتساب<textarea name="template" className={inputClass} rows={3} maxLength={1000} defaultValue={settings.whatsappTemplate} required /><span className="mt-1 block text-xs font-normal leading-6 text-[var(--muted-foreground)]">المتغيرات المتاحة: {'{customer} {store} {total} {currency} {link}'} — الرابط مطلوب.</span></label>
    <section><h3 className="font-bold">صلاحيات كل موظف</h3><p className="mt-1 text-xs leading-6 text-[var(--muted-foreground)]">الخصم الأكبر يحتاج موافقة موظف آخر مخول. صلاحية الاطلاع لا تمنح صلاحية إنشاء الطلبات؛ تُدار صلاحيات الدور من صفحة الفريق. المالك يحتفظ بصلاحيات الإدارة.</p>
      <div className="mt-3 space-y-3">{staff.map(member => {
        const rule = rules.find(r => r.userId === member.userId);
        return <div key={member.userId} className="flex flex-wrap items-center gap-4 rounded-xl border p-3"><p className="min-w-36 flex-1 break-all text-sm font-bold">{member.name}</p>
          <label className="text-xs">حد الخصم ٪<input type="number" min={0} max={100} step="0.01" className={`${inputClass} max-w-24`} value={rule?.discountPercent ?? settings.staffDiscountPercent} onChange={e => changeRule(member.userId, { discountPercent: Number(e.target.value) })} /></label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={rule?.canApprove ?? false} onChange={e => changeRule(member.userId, { canApprove: e.target.checked })} />موافقة الخصومات</label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={rule?.canViewAll ?? false} onChange={e => changeRule(member.userId, { canViewAll: e.target.checked })} />رؤية كل العروض</label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={rule?.disabled ?? false} onChange={e => changeRule(member.userId, { disabled: e.target.checked })} />إيقاف الوصول</label>
          {rule && <button type="button" className="min-h-11 text-sm text-[#087d82] underline" onClick={() => setRules(rules.filter(r => r.userId !== member.userId))}>استخدام الافتراضي</button>}
        </div>;
      })}</div>
    </section>
    <p className="rounded-xl bg-[var(--muted)] p-3 text-xs leading-6">صلاحية العرض تحدد آخر موعد لبدء إتمامه. بعد إنشاء الطلب تثبت قيمته، وتخضع مهلة جلسة الدفع لبوابة الدفع. إيقاف الميزة لا يوقف سداد الطلبات التي أُنشئت بالفعل.</p>
    <div className="flex flex-wrap items-center gap-3"><button disabled={pending} className={buttonClass}>{pending ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}</button>{feedback && <p role="status" className="text-sm">{feedback}</p>}</div>
  </form>;
}
