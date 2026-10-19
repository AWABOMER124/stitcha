import { listOnlineSettlementsForAdmin } from '@/modules/online-settlements/online-settlements.service';
import { markOnlineSettlementPaidAction } from '@/modules/online-settlements/actions';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';

export const dynamic = 'force-dynamic';

export default async function OnlineSettlementsAdminPage() {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.PAYMENTS_REVIEW);
  const batches = await listOnlineSettlementsForAdmin();
  return <div className="space-y-6" dir="rtl">
    <header><h1 className="text-2xl font-black">تسويات مدفوعات المتاجر</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">كشوف أسبوعية للمدفوعات المحصلة في حساب وصلة بعد خصم رسوم Stripe وعمولة المنصة والاستردادات.</p></header>
    <div className="space-y-4">{batches.map(batch => <article key={batch.id} className="rounded-2xl border bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-black">{batch.merchant.name}</h2><p className="text-xs text-[var(--muted-foreground)]" dir="ltr">/store/{batch.merchant.slug}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${batch.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{batch.status === 'COMPLETED' ? 'تم التحويل' : 'بانتظار التحويل'}</span></div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5"><Metric label="المبيعات/الاستردادات" value={`${batch.totalPayments}/${batch.totalRefunds}`}/><Metric label="الإجمالي" value={`${Number(batch.grossAmount).toLocaleString()} ${batch.currency}`}/><Metric label="رسوم Stripe" value={`${Number(batch.processingFees).toLocaleString()} ${batch.currency}`}/><Metric label="عمولة وصلة" value={`${Number(batch.platformFees).toLocaleString()} ${batch.currency}`}/><Metric label="صافي التاجر" value={`${Number(batch.netAmount).toLocaleString()} ${batch.currency}`}/></dl>
      <p className="mt-3 text-xs text-[var(--muted-foreground)]">الفترة: {batch.periodFrom.toLocaleDateString('ar-SD')} — {batch.periodTo.toLocaleDateString('ar-SD')} · {batch._count.entries} حركة</p>
      {batch.status !== 'COMPLETED' ? <form action={markOnlineSettlementPaidAction} className="mt-4 grid gap-2 md:grid-cols-4"><input type="hidden" name="id" value={batch.id}/><input name="payoutMethod" required maxLength={80} placeholder="بنكك / ماي كاشي / بنك" className="rounded-xl border bg-[var(--background)] px-3 py-2"/><input name="payoutReference" required maxLength={160} placeholder="مرجع التحويل" className="rounded-xl border bg-[var(--background)] px-3 py-2"/><input name="notes" maxLength={500} placeholder="ملاحظة اختيارية" className="rounded-xl border bg-[var(--background)] px-3 py-2"/><button className="rounded-xl bg-[var(--primary)] px-4 py-2 font-bold text-white">تأكيد التحويل</button></form> : <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{batch.payoutMethod} · {batch.payoutReference} · {batch.paidAt?.toLocaleString('ar-SD')}</p>}
    </article>)}{batches.length === 0 && <p className="rounded-2xl border border-dashed p-10 text-center text-[var(--muted-foreground)]">لا توجد تسويات أسبوعية بعد.</p>}</div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[var(--muted)] p-3"><dt className="text-xs text-[var(--muted-foreground)]">{label}</dt><dd className="mt-1 font-black">{value}</dd></div>; }
