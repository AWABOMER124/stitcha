import { getAuthContext, requirePermission } from '@/lib/permissions';
import Link from 'next/link';
import { getPublicOrigin } from '@/lib/public-origin';
import {
  createStoreAffiliateAction,
  reviewStoreAffiliateCommissionAction,
  setStoreAffiliateStatusAction,
  updateStoreAffiliateProgramAction,
} from '@/modules/store-affiliates/actions';
import { getStoreAffiliateDashboard } from '@/modules/store-affiliates/store-affiliates.service';

export const dynamic = 'force-dynamic';

const commissionStatus: Record<string, string> = {
  PENDING: 'معلّقة', APPROVED: 'معتمدة', PAID: 'مسددة', REJECTED: 'مرفوضة', REVERSED: 'معكوسة',
};

export default async function StoreAffiliatesPage() {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:read');
  const { program, merchant, affiliates, commissions, totals } = await getStoreAffiliateDashboard(auth.merchantId);
  const origin = await getPublicOrigin();
  const canConfigure = auth.role === 'MERCHANT_OWNER' || auth.permissions.includes('settings:update');
  const canReview = auth.role === 'MERCHANT_OWNER' || auth.permissions.includes('invoices:update');
  const pending = totals.find(row => row.status === 'PENDING');
  const paid = totals.find(row => row.status === 'PAID');

  return <div className="mx-auto max-w-7xl space-y-7" dir="rtl">
    <header><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-bold text-[var(--primary)]">نمو المبيعات</p><h1 className="mt-2 text-2xl font-black">التسويق بالعمولة</h1><p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">أنشئ روابط للمسوّقين، تتبع الطلبات المؤهلة، واعتمد العمولة بعد التسليم وفترة التعليق. الإسناد يعتمد آخر رابط صالح.</p></div><div className="flex flex-wrap gap-2"><Link href="/dashboard/affiliates/applications" className="rounded-xl border px-4 py-2 text-sm font-bold">طلبات الانضمام</Link><Link href="/dashboard/affiliates/onboarding" className="rounded-xl border border-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary)]">توثيق المسوّقين والسداد</Link></div></div></header>
    {!program.isActive && <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">البرنامج موقوف. الروابط موجودة لكن الزيارات والطلبات الجديدة لن تُنسب حتى تفعّله بنسبة عمولة أكبر من صفر.</p>}

    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[['المسوّقون', affiliates.length], ['الزيارات', affiliates.reduce((sum, item) => sum + item._count.visits, 0)], ['عمولات معلّقة', `${Number(pending?._sum.amount ?? 0).toLocaleString()} ${program.currency}`], ['تم سدادها', `${Number(paid?._sum.amount ?? 0).toLocaleString()} ${program.currency}`]].map(([label, value]) => <article key={String(label)} className="rounded-2xl border bg-[var(--card)] p-5"><p className="text-sm text-[var(--muted-foreground)]">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></article>)}
    </section>

    <section className="rounded-2xl border bg-[var(--card)] p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">سياسة البرنامج</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">الحالة: {program.isActive ? 'مفعّل' : 'موقوف'}</p></div><span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs">عمولة على قيمة المنتجات قبل التوصيل</span></div>
      {canConfigure ? <form action={updateStoreAffiliateProgramAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm">نسبة العمولة %<input name="commissionRate" type="number" min="0" max="100" step="0.01" defaultValue={program.commissionRate.toString()} className="mt-1 w-full rounded-lg border bg-[var(--background)] p-2.5"/></label>
        <label className="text-sm">نافذة الإسناد بالأيام<input name="attributionDays" type="number" min="1" max="90" defaultValue={program.attributionDays} className="mt-1 w-full rounded-lg border bg-[var(--background)] p-2.5"/></label>
        <label className="text-sm">تعليق العمولة بالأيام<input name="holdDays" type="number" min="0" max="180" defaultValue={program.holdDays} className="mt-1 w-full rounded-lg border bg-[var(--background)] p-2.5"/></label>
        <label className="text-sm">الحد الأدنى للسداد<input name="minimumPayout" type="number" min="0" step="0.01" defaultValue={program.minimumPayout.toString()} className="mt-1 w-full rounded-lg border bg-[var(--background)] p-2.5"/></label>
        <label className="text-sm">العملة<input name="currency" minLength={3} maxLength={6} defaultValue={program.currency} className="mt-1 w-full rounded-lg border bg-[var(--background)] p-2.5 uppercase"/></label>
        <label className="text-sm md:col-span-2 xl:col-span-4">الشروط<textarea name="terms" maxLength={3000} rows={3} defaultValue={program.terms ?? ''} className="mt-1 w-full rounded-lg border bg-[var(--background)] p-2.5"/></label>
        <label className="flex items-center gap-2 text-sm"><input name="isActive" type="checkbox" value="true" defaultChecked={program.isActive}/> تفعيل البرنامج</label>
        <button className="rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white md:col-span-2 xl:col-span-5">حفظ السياسة</button>
      </form> : <p className="mt-4 text-sm">تعديل السياسة متاح لمالك المتجر.</p>}
    </section>

    {canConfigure && <section className="rounded-2xl border bg-[var(--card)] p-6"><h2 className="font-black">إضافة مسوّق</h2><form action={createStoreAffiliateAction} className="mt-4 grid gap-3 md:grid-cols-4"><input name="name" required minLength={2} maxLength={120} placeholder="اسم المسوّق" className="rounded-lg border bg-[var(--background)] p-2.5"/><input name="phone" required minLength={7} maxLength={32} placeholder="رقم الهاتف" className="rounded-lg border bg-[var(--background)] p-2.5"/><input name="email" type="email" placeholder="البريد — اختياري" className="rounded-lg border bg-[var(--background)] p-2.5"/><button className="rounded-lg bg-slate-900 p-2.5 font-bold text-white">إنشاء رابط</button></form></section>}

    <section><h2 className="mb-3 font-black">المسوّقون ({affiliates.length})</h2><div className="grid gap-4 lg:grid-cols-2">{affiliates.map(affiliate => {
      const link = `${origin}/store/${encodeURIComponent(merchant.slug)}/affiliate/${affiliate.code}`;
      return <article key={affiliate.id} className="rounded-2xl border bg-[var(--card)] p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{affiliate.name}</h3><p dir="ltr" className="mt-1 text-right text-sm text-[var(--muted-foreground)]">{affiliate.phone}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${affiliate.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{affiliate.status === 'ACTIVE' ? 'نشط' : 'موقوف'}</span></div><code dir="ltr" className="mt-4 block break-all rounded-lg bg-[var(--muted)] p-3 text-xs select-all">{link}</code><div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]"><span>{affiliate._count.visits} زيارة</span><span>{affiliate._count.attributions} طلب منسوب</span><span>{affiliate._count.commissions} عمولة</span>{canConfigure && <form action={setStoreAffiliateStatusAction} className="ms-auto"><input type="hidden" name="affiliateId" value={affiliate.id}/><input type="hidden" name="status" value={affiliate.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'}/><button className="rounded-lg border px-3 py-1.5 font-bold text-[var(--foreground)]">{affiliate.status === 'ACTIVE' ? 'إيقاف' : 'إعادة التفعيل'}</button></form>}</div></article>;
    })}{!affiliates.length && <p className="rounded-2xl border border-dashed p-10 text-center text-[var(--muted-foreground)] lg:col-span-2">لم تضف مسوّقين بعد.</p>}</div></section>

    <section><h2 className="mb-3 font-black">سجل العمولات ({commissions.length})</h2><p className="mb-3 text-xs text-[var(--muted-foreground)]">تأكيد السداد ينفذ دفعة واحدة لكل العمولات المعتمدة لنفس المسوّق بعد بلوغ الحد الأدنى.</p><div className="space-y-3">{commissions.map(item => <article key={item.id} className="rounded-2xl border bg-[var(--card)] p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold">{item.affiliate.name}</p><p className="text-sm text-[var(--muted-foreground)]">الطلب {item.order.orderNumber} · {commissionStatus[item.status]}</p></div><p className="font-black">{Number(item.amount).toLocaleString()} {item.currency}</p></div><p className="mt-2 text-xs text-[var(--muted-foreground)]">انتهاء التعليق: {item.holdUntil.toLocaleString('ar-SD')}</p>{canReview && item.status === 'PENDING' && <div className="mt-4 grid gap-2 md:grid-cols-2"><form action={reviewStoreAffiliateCommissionAction}><input type="hidden" name="commissionId" value={item.id}/><input type="hidden" name="decision" value="APPROVE"/><button className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white">اعتماد</button></form><form action={reviewStoreAffiliateCommissionAction} className="flex gap-2"><input type="hidden" name="commissionId" value={item.id}/><input type="hidden" name="decision" value="REJECT"/><input name="note" required maxLength={500} placeholder="سبب الرفض" className="min-w-0 flex-1 rounded-lg border p-2"/><button className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white">رفض</button></form></div>}{canReview && item.status === 'APPROVED' && <form action={reviewStoreAffiliateCommissionAction} className="mt-4 flex gap-2"><input type="hidden" name="commissionId" value={item.id}/><input type="hidden" name="decision" value="PAY"/><input name="paymentRef" required maxLength={120} placeholder="مرجع التحويل" className="min-w-0 flex-1 rounded-lg border p-2"/><button className="rounded-lg bg-[var(--primary)] px-4 py-2 font-bold text-white">سداد رصيد المسوّق المعتمد</button></form>}</article>)}{!commissions.length && <p className="rounded-2xl border border-dashed p-10 text-center text-[var(--muted-foreground)]">لا توجد عمولات حتى الآن.</p>}</div></section>
  </div>;
}
