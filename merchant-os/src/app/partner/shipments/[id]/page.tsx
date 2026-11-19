import Link from 'next/link';
import { PartnerCodPanel } from '@/modules/delivery-partners/components/cod-panel';
import { supportsPartnerWaybill } from '@/modules/delivery-partners/services/partner-waybill.service';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';
import { getOrderDeliveryAddress } from '@/lib/addresses/order-address';
import { PrintShipmentLabel } from '@/components/partner/print-label';

export default async function PartnerShipmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { partnerId } = await requireDeliveryPartner();
  const { id } = await params;
  if (!id || id.length > 100) notFound();
  const row = await prisma.platformShipment.findFirst({ where: { id, partnerId }, include: {
    returnShipment: true,
    partner: { select: { name: true, providerConfig: { select: { outboundWebhookUrl: true } } } }, courier: { select: { name: true, phone: true } },
    order: { include: { delivery: true, customer: { select: { name: true, phone: true, address: true } },
      merchant: { select: { name: true, phone: true, address: true } }, branch: true, items: true, payment: { select: { status: true } } } },
  } });
  if (!row) notFound();
  const address = getOrderDeliveryAddress(row.order);
  const branch = row.order.branch ?? await prisma.branch.findFirst({ where: { merchantId: row.order.merchantId, isMain: true, isActive: true } });
  const panel = 'break-inside-avoid rounded-2xl border bg-white p-5';
  const money = (value: { toString(): string }) => Number(value.toString()).toLocaleString('ar') + ' ' + row.currency;
  return <article dir="rtl" className="mx-auto max-w-5xl space-y-5 text-slate-900">
    <Link href="/partner/shipments" className="text-sm font-bold text-teal-700 print:hidden">← جميع الشحنات</Link>
    <header className={panel}><h1 className="text-2xl font-black">تفاصيل البوليصة</h1><p className="mt-2">{row.partner.name} · طلب #{row.order.orderNumber}</p><p dir="ltr" className="mt-3 break-all font-mono text-xl font-bold">{row.trackingCode}</p><p className="mt-2 text-sm">مرجع شركة الشحن: {row.providerReference || 'لم يصدر مرجع من الشركة بعد'}</p><p className="mt-2 text-xs">هذه بيانات شحنة وصلة؛ بوليصة شركة الشحن ومرجعها تصدران من نظام الشركة.</p></header>
    <div className="grid gap-5 md:grid-cols-2">
      <section className={panel}><h2 className="font-black">المرسل وموقع الاستلام</h2><p className="mt-3">{row.order.merchant.name} · {branch?.name || 'الفرع'}</p><p className="mt-2" dir="ltr">{branch?.phone || row.order.merchant.phone || '—'}</p><p className="mt-2 whitespace-pre-wrap">{branch?.address || row.order.merchant.address || 'عنوان غير مسجل'}</p>{branch?.lat != null && branch.lng != null && <p dir="ltr" className="mt-2 text-xs">{branch.lat}, {branch.lng}</p>}</section>
      <section className={panel}><h2 className="font-black">المستلم وموقع التسليم</h2><p className="mt-3">{row.order.customerName || row.order.customer.name}</p><p className="mt-2" dir="ltr">{row.order.customerPhone || row.order.customer.phone}</p><dl className="mt-4 space-y-3 text-sm">{[['الولاية', address.state], ['المدينة', address.city], ['الحي', address.district], ['العنوان التفصيلي', address.address], ['وصف العنوان / معلم قريب', address.addressDescription]].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap font-semibold">{value || 'غير مسجل'}</dd></div>)}</dl>{row.order.delivery?.lat != null && row.order.delivery.lng != null && <p dir="ltr" className="mt-3 text-xs">{row.order.delivery.lat}, {row.order.delivery.lng}</p>}</section>
    </div>
    <section className={panel}><h2 className="font-black">الأصناف والمبالغ</h2><div className="mt-4 divide-y">{row.order.items.map(item => {
      const snapshot = item.productSnapshot;
      const name = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) && typeof snapshot.name === 'string' ? snapshot.name : 'صنف';
      return <div key={item.id} className="flex justify-between gap-4 py-3 text-sm"><span>{name} × {item.quantity}</span><strong>{money(item.total)}</strong></div>;
    })}</div><p className="mt-3">رسوم التوصيل: {money(row.fee)}</p><p className="mt-2 font-black">المطلوب تحصيله: {money(row.order.paymentMethod === 'CASH' ? row.order.total : 0)}</p><p className="mt-2 text-xs text-slate-500">طابق التحصيل مع payment.codAmount في حدث الربط، وليس مع مجموع رسوم التوصيل وحدها.</p></section>
    {row.order.notes && <section className={panel}><h2 className="font-bold">ملاحظات الطلب</h2><p className="mt-2 whitespace-pre-wrap text-sm">{row.order.notes}</p></section>}
    {row.returnShipment && <Link className="inline-block rounded-xl border px-5 py-3 print:hidden" href={'/partner/shipments/' + row.id + '/return'}>عرض وطباعة الرجيع</Link>}
    {row.providerReference && supportsPartnerWaybill(row.partner.providerConfig?.outboundWebhookUrl) && <a target="_blank" className="inline-block rounded-xl bg-teal-700 px-5 py-3 font-bold text-white print:hidden" href={'/api/partner/shipments/' + row.id + '/waybill'}>عرض وطباعة بوليصة وصلة PDF</a>}
    <PartnerCodPanel shipmentId={row.id} />
    <PrintShipmentLabel label="طباعة بيانات الشحنة" />
  </article>;
}
