import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { listPublicAffiliateStores } from '@/modules/marketer-applications/marketer-applications.service';
import { applyToStoreAffiliateProgramAction } from '@/modules/marketer-portal/actions';

export const dynamic = 'force-dynamic';

export default async function MarketerProgramsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'MARKETER') redirect('/login');
  const stores = await listPublicAffiliateStores();

  return <main className="min-h-screen bg-[#f7faf9] px-5 py-10 text-[#07111f]" dir="rtl">
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-[#07111f] p-7 text-white">
        <div><p className="text-sm font-bold text-[#13c4a3]">بوابة المسوّق</p><h1 className="mt-2 text-3xl font-black">برامج المتاجر المتاحة</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">انضم إلى برامج عدة متاجر بحساب واحد. يراجع كل تاجر طلبك قبل تفعيل رابط التسويق الخاص به.</p></div>
        <Link href="/marketer" className="rounded-xl border border-white/25 px-4 py-2 text-sm font-bold">العودة للبوابة</Link>
      </header>
      {!stores.length ? <section className="rounded-3xl border border-dashed bg-white p-12 text-center"><p className="text-3xl">🛍️</p><h2 className="mt-3 font-black">لا توجد برامج متاحة الآن</h2><p className="mt-2 text-sm text-slate-500">ستظهر هنا المتاجر التي فعّلت التسويق بالعمولة.</p></section> : <section className="grid gap-5 md:grid-cols-2">{stores.map(store => <article key={store.merchantId} className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-black">{store.merchant.name}</h2><p dir="ltr" className="mt-1 text-xs text-slate-500">/store/{store.merchant.slug}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{Number(store.commissionRate)}% عمولة</span></div><p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">{store.terms || 'تُراجع الطلبات وبيانات الهوية قبل إصدار رابط التسويق.'}</p><form action={applyToStoreAffiliateProgramAction} className="mt-5"><input type="hidden" name="merchantId" value={store.merchantId}/><button className="w-full rounded-xl bg-[#13c4a3] px-4 py-3 font-bold text-[#07111f]">انضم إلى البرنامج</button></form></article>)}</section>}
    </div>
  </main>;
}
