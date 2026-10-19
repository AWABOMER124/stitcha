import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { listMerchantOnlineSettlements } from '@/modules/online-settlements/online-settlements.service';

export const dynamic = 'force-dynamic';

export default async function MerchantOnlineSettlementsPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');
  const { batches, balances } = await listMerchantOnlineSettlements(session.user.merchantId);
  const available = balances.filter(item => item.status === 'AVAILABLE').reduce((sum, item) => sum + Number(item._sum.netAmount ?? 0), 0);
  const held = balances.filter(item => item.status === 'HELD').reduce((sum, item) => sum + Number(item._sum.netAmount ?? 0), 0);
  return <div className="space-y-6" dir="rtl">
    <header><h1 className="text-2xl font-black">تسويات الدفع الإلكتروني</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">وصلة تحصّل مدفوعات البطاقات ثم تحول صافي مستحقاتك أسبوعياً بعد الرسوم والاستردادات.</p></header>
    <section className="grid gap-4 sm:grid-cols-2"><Card label="متاح للتسوية" value={available}/><Card label="قيد الحجز" value={held}/></section>
    <section className="space-y-3"><h2 className="font-black">سجل التسويات</h2>{batches.map(batch => <article key={batch.id} className="rounded-2xl border bg-[var(--card)] p-5"><div className="flex justify-between gap-3"><strong>{Number(batch.netAmount).toLocaleString()} {batch.currency}</strong><span className="text-sm font-bold">{batch.status === 'COMPLETED' ? '✅ تم التحويل' : '⏳ قيد التحويل'}</span></div><p className="mt-2 text-xs text-[var(--muted-foreground)]">{batch.periodFrom.toLocaleDateString('ar-SD')} — {batch.periodTo.toLocaleDateString('ar-SD')} · {batch.totalPayments} دفعة · {batch.totalRefunds} استرداد</p>{batch.status === 'COMPLETED' && <p className="mt-2 text-sm">{batch.payoutMethod} · {batch.payoutReference}</p>}</article>)}{!batches.length && <p className="rounded-2xl border border-dashed p-8 text-center text-[var(--muted-foreground)]">ستظهر أول تسوية بعد اكتمال أول دفعات إلكترونية وفترة الحجز.</p>}</section>
  </div>;
}

function Card({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border bg-[var(--card)] p-5"><p className="text-sm text-[var(--muted-foreground)]">{label}</p><p className="mt-2 text-2xl font-black">{value.toLocaleString()} SDG</p></div>; }
