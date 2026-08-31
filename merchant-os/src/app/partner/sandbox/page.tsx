import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';
import { decryptSecret } from '@/lib/crypto/secret';
import { getPublicOrigin } from '@/lib/public-origin';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createSandboxStore, createSandboxShipment, updateSandboxShipment, rotateSandboxKey, sandboxStatuses } from '@/modules/delivery-partners/services/partner-sandbox.service';
import { shipmentTransitions } from '@/modules/delivery-partners/services/shipment-state.service';
import { LiveRefresh } from '@/components/shared/live-refresh';

async function sandboxAction(form: FormData) {
  'use server';
  const { partnerId, userId, role } = await requireDeliveryPartner({ verified: true });
  if (!checkRateLimit(`sandbox-ui:${userId}`, 30, 60000)) redirect('/partner/sandbox?error=rate');
  try {
    const intent = form.get('intent');
    if (intent === 'create-store') await createSandboxStore(partnerId);
    else if (intent === 'create-shipment') await createSandboxShipment(partnerId, String(form.get('idempotencyKey') ?? ''));
    else if (intent === 'rotate' && role === 'DELIVERY_PARTNER_OWNER') await rotateSandboxKey(partnerId);
    else if (intent === 'status') await updateSandboxShipment(partnerId, String(form.get('id') ?? ''), sandboxStatuses.parse(form.get('status')));
    else throw new Error('Invalid action');
  } catch { redirect('/partner/sandbox?error=operation'); }
  revalidatePath('/partner/sandbox');
  redirect('/partner/sandbox?saved=1');
}
const labels: Record<string, string> = { REQUESTED: 'أُصدرت البوليصة', ASSIGNED: 'تم تعيين مندوب', PICKED_UP: 'استلم المندوب', IN_TRANSIT: 'في الطريق', DELIVERED: 'تم التسليم', CANCELLED: 'أُلغيت البوليصة', FAILED: 'تعذر التسليم', READY: 'جاهز للشحن', OUT_FOR_DELIVERY: 'خرج للتوصيل' };
export default async function SandboxPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { partnerId, role, verified } = await requireDeliveryPartner();
  const query = await searchParams;
  const store = await prisma.partnerSandboxStore.findUnique({ where: { partnerId }, include: { shipments: { orderBy: { createdAt: 'desc' }, take: 100 } } });
  return <div className="mx-auto max-w-6xl space-y-6" dir="rtl">
    <LiveRefresh intervalMs={10000} />
    <header><p className="font-bold text-[var(--primary)]">بيئة Sandbox</p><h1 className="mt-2 text-2xl font-black">متجر الاختبار والبواليص</h1><p className="mt-3 leading-7">اختبر دورة الشحن دون تكلفة أو طلبات حقيقية. هذه مساحة محاكاة داخل بوابة الشريك وليست متجراً عاماً للبيع.</p></header>
    <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-950">معزول عن التجار والعملاء والدفعات وشركات الشحن. لا رسائل للعملاء ولا تحصيل ولا استدعاء لنظام شركة حقيقية. النجاح هنا لا يغني عن اختبار الربط في بيئة شركة التوصيل.</p>
    {query.error && <p role="alert" className="text-red-700">تعذرت العملية: راجع حالة الشحنة وحد الاختبار وصلاحياتك. لا يمكن الإلغاء بعد استلام المندوب.</p>}
    {query.saved && <p role="status" className="text-emerald-700">تم تنفيذ العملية التجريبية.</p>}
    {!verified && <Link href="/partner/security" className="block rounded-xl border p-4 font-bold">أكّد البريد أو واتساب لبدء الاختبار ←</Link>}
    {!store ? <form action={sandboxAction}><button name="intent" value="create-store" className="rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white">إنشاء متجر تجريبي خاص بالشركة</button></form> : <>
      <section className="grid gap-5 rounded-2xl border bg-[var(--card)] p-6 md:grid-cols-2"><div><h2 className="text-lg font-black">{store.name}</h2><p className="mt-3 text-sm leading-7">المنتج: طرد اختباري × 2<br />القيمة: 1,000 SDG افتراضية<br />العميل: عميل تجريبي — لا رقم هاتف حقيقي<br />الطلب يبدأ جاهزاً للشحن، وتنعكس حالته عند الاستلام والتسليم.</p></div><div className="space-y-3"><p className="text-sm">{store.shipments.length} / 100 شحنة تجريبية</p><form action={sandboxAction}><input type="hidden" name="idempotencyKey" value={randomUUID()} /><button name="intent" value="create-shipment" className="rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white">إنشاء طلب وإصدار بوليصة اختبار</button></form><Link className="block underline" href="/partner/docs#sandbox">أمثلة طلبات API والتوقيع</Link></div></section>
      <details className="rounded-2xl border bg-[var(--card)] p-5"><summary className="cursor-pointer font-bold">مفاتيح الربط التجريبي — لا تشاركها علناً</summary><div className="mt-4 space-y-4 text-sm"><p>المفتاح خاص بهذا المتجر، ولا يعمل على الإنتاج. يستخدم أيضاً لتوقيع إشعارات الاختبار.</p><code dir="ltr" className="block break-all select-all rounded-lg bg-[var(--muted)] p-3">{decryptSecret(store.apiKey)}</code><p>Webhook الاختبار:</p><code dir="ltr" className="block break-all select-all">{await getPublicOrigin()}/api/partner-sandbox/webhooks/{store.webhookToken}</code>{role === 'DELIVERY_PARTNER_OWNER' && <form action={sandboxAction}><p className="mb-2">التدوير يبطل المفتاح السابق فوراً.</p><button name="intent" value="rotate" className="rounded-xl border px-4 py-2">تدوير مفتاح الاختبار</button></form>}</div></details>
      <div className="space-y-4">{store.shipments.map(row => <section key={row.id} className="rounded-2xl border bg-[var(--card)] p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p dir="ltr" className="break-all font-mono text-sm">{row.trackingCode}</p><p className="mt-2 text-sm">الشحنة: {labels[row.status]} · الطلب: {labels[row.orderStatus] ?? row.orderStatus}</p></div><Link className="rounded-xl border px-4 py-2" href={`/partner/sandbox/labels/${row.id}`}>عرض البوليصة / طباعة</Link></div><form action={sandboxAction} className="mt-4 flex flex-wrap gap-3"><input type="hidden" name="intent" value="status" /><input type="hidden" name="id" value={row.id} />{(shipmentTransitions[row.status] ?? []).map(status => <button key={status} name="status" value={status} className="rounded-lg border px-3 py-2 text-sm">{labels[status]}</button>)}</form><details className="mt-4 text-sm"><summary className="cursor-pointer">سجل عكس الحالات</summary><pre dir="ltr" className="mt-2 overflow-auto rounded-xl bg-[var(--muted)] p-3 text-xs">{JSON.stringify(row.events, null, 2)}</pre></details></section>)}</div>
    </>}
  </div>;
}
