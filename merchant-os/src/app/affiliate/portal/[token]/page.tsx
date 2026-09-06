import { notFound } from 'next/navigation';
import { getStoreAffiliatePortal } from '@/modules/store-affiliates/store-affiliates.service';
import { getPublicOrigin } from '@/lib/public-origin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'بوابة المسوّق — وصلة', robots: { index: false, follow: false }, referrer: 'no-referrer' };

const labels: Record<string, string> = { PENDING: 'قيد التعليق', APPROVED: 'معتمدة', PAID: 'مدفوعة', REJECTED: 'مرفوضة', REVERSED: 'معكوسة' };

export default async function AffiliatePortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [data, origin] = await Promise.all([getStoreAffiliatePortal(token), getPublicOrigin()]);
  if (!data) notFound();
  const link = `${origin}/store/${encodeURIComponent(data.merchant.slug)}/affiliate/${encodeURIComponent(data.affiliate.code)}`;
  const totalFor = (status: string) => data.totals.filter(item => item.status === status).reduce((sum, item) => sum + item.amount, 0);
  const currency = data.program.currency;
  const verification = data.verification?.status === 'APPROVED' ? 'مؤكدة' : data.verification?.status === 'PENDING' ? 'قيد المراجعة' : 'مطلوبة';
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950" dir="rtl"><div className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-3xl bg-[#07111f] p-7 text-white"><p className="font-bold text-emerald-300">وصلة · بوابة المسوّق</p><h1 className="mt-2 text-3xl font-black">مرحباً {data.affiliate.name}</h1><p className="mt-2 text-sm text-slate-300">تسويقك لمتجر {data.merchant.name} ومتابعة نتائجك وعمولاتك في مكان واحد.</p></header>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card label="الزيارات" value={data.visits.toLocaleString('ar-SD')}/><Card label="الطلبات المنسوبة" value={data.attributedOrders.toLocaleString('ar-SD')}/><Card label="عمولات معلّقة" value={`${totalFor('PENDING').toLocaleString()} ${currency}`}/><Card label="عمولات مدفوعة" value={`${totalFor('PAID').toLocaleString()} ${currency}`}/></section>
    <section className="rounded-2xl border bg-white p-6"><h2 className="font-black">رابط التسويق الخاص بك</h2><p className="mt-1 text-sm text-slate-600">شارك هذا الرابط فقط؛ تُحتسب النتيجة حسب سياسة المتجر وفترة الإسناد.</p><code dir="ltr" className="mt-4 block break-all rounded-xl bg-slate-100 p-4 text-sm select-all">{link}</code></section>
    <section className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border bg-white p-6"><h2 className="font-black">حالة الاستحقاق</h2><dl className="mt-4 space-y-3 text-sm"><Row label="الهوية" value={verification}/><Row label="بيانات السداد" value={data.payoutReady ? 'مكتملة' : 'مطلوبة'}/><Row label="الحد الأدنى للسداد" value={`${data.program.minimumPayout.toLocaleString()} ${currency}`}/><Row label="فترة تعليق العمولة" value={`${data.program.holdDays} يوم`}/></dl><p className="mt-4 text-xs leading-6 text-slate-500">لا تُدفع العمولة إلا بعد اعتماد التاجر لها، اكتمال التحقق، والوصول للحد الأدنى.</p></article><article className="rounded-2xl border bg-white p-6"><h2 className="font-black">ملخص العمولات</h2><div className="mt-4 space-y-3">{data.totals.length ? data.totals.map(item => <div key={`${item.status}-${item.currency}`} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>{labels[item.status] ?? item.status} · {item.count}</span><b>{item.amount.toLocaleString()} {item.currency}</b></div>) : <p className="text-sm text-slate-500">لا توجد عمولات بعد.</p>}</div></article></section>
    <section className="rounded-2xl border bg-white p-6"><h2 className="font-black">آخر العمولات</h2><div className="mt-4 space-y-3">{data.commissions.length ? data.commissions.map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm"><div><b>{labels[item.status] ?? item.status}</b><p className="mt-1 text-xs text-slate-500">{item.createdAt.toLocaleDateString('ar-SD')} · تعليق حتى {item.holdUntil.toLocaleDateString('ar-SD')}</p>{item.note && <p className="mt-1 text-xs text-slate-500">ملاحظة: {item.note}</p>}</div><b>{item.amount.toLocaleString()} {item.currency}</b></article>) : <p className="text-sm text-slate-500">لا توجد نتائج مكتسبة بعد.</p>}</div></section>
    <p className="pb-4 text-center text-xs text-slate-500">هذا الرابط خاص بك وصالح لمدة 30 يوماً. اطلب رابطاً جديداً من المتجر عند انتهاء صلاحيته.</p>
  </div></main>;
}

function Card({ label, value }: { label: string; value: string }) { return <article className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></article>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><dt className="text-slate-500">{label}</dt><dd className="font-bold">{value}</dd></div>; }
