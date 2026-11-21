import Link from 'next/link';
import { isQiadIntegration } from '@/modules/delivery-partners/services/partner-protocol';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';
import { BusinessRuleError } from '@/lib/errors';
import { SudanCoverageFields } from '@/components/delivery-partners/sudan-coverage-fields';
import { saveRegionalPrice } from '@/modules/delivery-partners/services/regional-pricing.service';

async function savePrice(formData: FormData) {
  'use server';
  const { partnerId } = await requireDeliveryPartner();
  const input = Object.fromEntries(formData);
  try {
    await saveRegionalPrice(partnerId, input, typeof input.priceId === 'string' && input.priceId ? input.priceId : undefined);
  } catch (error) {
    if (error instanceof BusinessRuleError) redirect(`/partner/coverage?error=${encodeURIComponent(error.message)}`);
    throw error;
  }
  revalidatePath('/partner/coverage');
  redirect('/partner/coverage?saved=price');
}
async function disablePrice(formData: FormData) {
  'use server';
  const { partnerId } = await requireDeliveryPartner();
  await prisma.deliveryPartnerPricingRule.updateMany({ where: { id: String(formData.get('id')), partnerId }, data: { isActive: false } });
  revalidatePath('/partner/coverage');
  redirect('/partner/coverage?saved=disabled');
}
export default async function CoveragePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; edit?: string }> }) {
  const { error, saved, edit } = await searchParams;
  const errorMessage = error === 'validation' || error === 'location' ? 'اختر الولاية والمدينة أو كل المدن، ثم الحي أو كل الأحياء وأدخل السعر.' : error === 'duplicate' ? 'توجد تسعيرة لهذا النطاق بالفعل؛ عدّل التسعيرة الحالية.' : error;
  const { partnerId } = await requireDeliveryPartner();
  const [prices, partner] = await Promise.all([
    prisma.deliveryPartnerPricingRule.findMany({ where: { partnerId, isActive: true }, include: { serviceArea: true }, orderBy: { createdAt: 'desc' } }),
    prisma.deliveryPartner.findUniqueOrThrow({ where: { id: partnerId }, select: { supportsCod: true, providerConfig: { select: { outboundWebhookUrl: true, market: true } } } }),
  ]);
  const saudi = partner.providerConfig?.market === 'SA';
  const editing = prices.find(price => price.id === edit);
  const inputClass = 'mt-2 w-full rounded-xl border border-[var(--input)] bg-[var(--card)] px-3 py-3';
  return <div className="space-y-6" dir="rtl">
    <header><h1 className="text-2xl font-black">التغطية والأسعار</h1><p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">اختر الولاية والمدينة والحي، ثم أدخل سعر التوصيل الثابت. يمكنك تطبيق السعر على كل المدن أو كل الأحياء، دون إحداثيات أو حساب مسافة.</p></header>
    {!saudi && isQiadIntegration(partner.providerConfig?.outboundWebhookUrl) && <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-7 text-blue-950">التغطية التشغيلية الحالية لقياد: الخرطوم وأم درمان وبحري، بكل أحيائها. تطبق الأسعار داخل هذه المدن فقط، ولن تظهر عروض لمدينة خارجها حتى لو أُضيفت تسعيرة أوسع.</p>}
    {saudi && <p className="rounded-xl border bg-blue-50 p-4 text-sm text-blue-950">الشحن 20 ريال على التاجر لكل المملكة. الدفع عند الاستلام 2% من قيمة البضاعة بعد الخصم، دون رسوم الشحن. الرجيع 20 ريال دون تحصيل.</p>}
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-[var(--card)] p-4"><p className="text-sm font-bold">الدفع عند الاستلام: <span className={partner.supportsCod ? 'text-emerald-700' : 'text-amber-700'}>{partner.supportsCod ? 'مفعّل' : 'غير مفعّل'}</span></p><Link href="/partner/settings#delivery-services" className="text-sm font-bold text-[var(--primary)]">إدارة الدفع عند الاستلام ←</Link></section>
    {saved && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{saved === 'disabled' ? 'تم تعطيل التسعيرة.' : 'تم حفظ تسعيرة التوصيل.'}</p>}
    {(error || (edit && !editing)) && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{edit && !editing ? 'التسعيرة غير موجودة أو غير متاحة للتعديل.' : errorMessage?.slice(0, 300)}</p>}
    <section className="max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
      <h2 className="mb-5 text-lg font-black">{editing ? 'تعديل تسعيرة التوصيل' : 'إضافة تسعيرة توصيل'}</h2>
      <form key={editing?.id ?? saved ?? 'new'} action={savePrice} className="grid gap-5 sm:grid-cols-2">
        <input type="hidden" name="priceId" value={editing?.id ?? ''} />
        <SudanCoverageFields country={partner.providerConfig?.market} initial={editing?.serviceArea ?? undefined} />
        <label className="text-sm font-bold sm:col-span-2">سعر التوصيل ({saudi ? 'ريال سعودي' : 'جنيه سوداني'})<input name="baseFee" type="number" inputMode="decimal" required min="0" max="99999999.99" step="0.01" readOnly={saudi} defaultValue={saudi ? 20 : editing ? Number(editing.baseFee) : ''} placeholder="مثال: 3000" className={inputClass} /><span className="mt-2 block text-xs font-normal text-[var(--muted-foreground)]">سعر ثابت لكل طلب داخل النطاق المختار.</span></label>
        <details className="rounded-xl border p-4 sm:col-span-2"><summary className="cursor-pointer text-sm font-semibold">زمن التوصيل وملاحظات المنطقة (اختياري)</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">زمن التوصيل من (دقيقة)<input name="etaMin" type="number" min="0" max="10080" step="1" defaultValue={editing?.serviceArea?.estimatedMinutesMin ?? ''} className={inputClass} /></label>
          <label className="text-sm font-semibold">إلى (دقيقة)<input name="etaMax" type="number" min="0" max="10080" step="1" defaultValue={editing?.serviceArea?.estimatedMinutesMax ?? ''} className={inputClass} /></label>
          <label className="text-sm font-semibold sm:col-span-2">ملاحظات المنطقة<textarea name="description" rows={2} maxLength={1000} defaultValue={editing?.serviceArea?.description ?? ''} className={inputClass} /></label>
        </div></details>
        <p className="rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-600 sm:col-span-2">التسعيرة الخاصة بالحي لها الأولوية، ثم تسعيرة المدينة، ثم تسعيرة كل المدن في الولاية. لا يشمل «كل المدن» ولايات أخرى.</p>
        {editing && (Number(editing.perKmFee) !== 0 || editing.maxDistanceKm != null || editing.currency !== (saudi ? 'SAR' : 'SDG') || Number(editing.minimumFee) !== 0 || editing.maximumFee != null) && <p className="text-sm text-amber-800 sm:col-span-2">حفظ التعديل يستبدل التسعيرة السابقة بسعر ثابت بعملة السوق للنطاق الذي تختاره.</p>}
        <button className="rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white sm:col-span-2">{editing ? 'حفظ التعديل' : 'إضافة التسعيرة'}</button>
        {editing && <Link href="/partner/coverage" className="text-sm font-bold text-[var(--primary)]">إلغاء التعديل</Link>}
      </form>
    </section>
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"><h2 className="mb-4 font-black">التسعيرات الحالية</h2>
      {!prices.length && <p className="p-5 text-center text-sm text-[var(--muted-foreground)]">لا توجد تسعيرات بعد. أضف أول تسعيرة من النموذج أعلاه.</p>}
      <div className="grid gap-3 xl:grid-cols-2">{prices.map(price => <article key={price.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-bold">{price.serviceArea?.state ?? 'ولاية غير مسجلة'} · {price.serviceArea?.allCities ? 'كل المدن' : price.serviceArea?.city ?? price.serviceArea?.name ?? 'نطاق سابق'}</p><p className="mt-2 text-sm text-[var(--muted-foreground)]">{price.serviceArea?.allDistricts ? 'كل الأحياء' : price.serviceArea?.district ?? 'حي غير مسجل'}</p></div><p className="text-lg font-black text-[var(--primary)]">{Number(price.baseFee).toLocaleString('ar')} <span className="text-xs">{price.currency}</span></p></div>
        {(Number(price.perKmFee) !== 0 || price.maxDistanceKm != null || Number(price.minimumFee) !== 0 || price.maximumFee != null) && <p className="mt-3 text-xs text-amber-800">تسعيرة سابقة بشروط إضافية؛ يمكنك تعديلها إلى السعر الثابت الجديد.</p>}
        {price.serviceArea?.description && <p className="mt-3 whitespace-pre-wrap text-xs text-[var(--muted-foreground)]">{price.serviceArea.description}</p>}
        <div className="mt-4 flex gap-5"><Link href={`/partner/coverage?edit=${price.id}`} className="text-sm font-bold text-[var(--primary)]">تعديل</Link><form action={disablePrice}><input type="hidden" name="id" value={price.id} /><button className="text-sm font-bold text-red-600">تعطيل</button></form></div>
      </article>)}</div>
    </section>
  </div>;
}
