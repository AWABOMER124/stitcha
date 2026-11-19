import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { date, deliveryMethodLabels, money, orderStatusLabels, paymentMethodLabels, paymentStatusLabels } from '../_format';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_READ);
  const { id } = await params;
  if (!id || id.length > 100) notFound();
  const order = await prisma.order.findUnique({ where: { id }, select: {
    orderNumber: true, status: true, createdAt: true, customerName: true, customerPhone: true, customerAddress: true,
    subtotal: true, deliveryFee: true, discount: true, tax: true, total: true, paymentMethod: true, deliveryMethod: true, notes: true,
    merchant: { select: { id: true, name: true } }, customer: { select: { name: true, phone: true } },
    delivery: { select: { state: true, city: true, area: true, address: true, notes: true } },
    payment: { select: { status: true } }, invoice: { select: { currency: true } },
    items: { select: { id: true, productSnapshot: true, quantity: true, unitPrice: true, total: true }, orderBy: { createdAt: 'asc' } },
    statusHistory: { select: { id: true, status: true, createdAt: true, note: true }, orderBy: { createdAt: 'asc' } },
  } });
  if (!order) notFound();
  const currency = order.invoice?.currency || 'SDG';
  const panel = 'rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5';
  return <div dir="rtl" className="space-y-6">
    <Link href="/admin/orders" className="text-sm font-bold text-[var(--primary)]">← جميع طلبات المنصة</Link>
    <header><h1 className="mt-4 text-2xl font-black">طلب #{order.orderNumber}</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">{date(order.createdAt)} · بتوقيت الرياض · {orderStatusLabels[order.status]}</p></header>
    <div className="grid gap-4 md:grid-cols-2">
      <section className={panel}><h2 className="font-bold">المتجر والعميل</h2><dl className="mt-4 space-y-3 text-sm">
        <div><dt className="text-[var(--muted-foreground)]">المتجر</dt><dd className="mt-1"><Link href={`/admin/merchants/${order.merchant.id}`} className="font-bold text-[var(--primary)]">{order.merchant.name}</Link></dd></div>
        <div><dt className="text-[var(--muted-foreground)]">اسم العميل</dt><dd className="mt-1">{order.customerName || order.customer.name}</dd></div>
        <div><dt className="text-[var(--muted-foreground)]">الهاتف</dt><dd className="mt-1" dir="ltr">{order.customerPhone || order.customer.phone || '—'}</dd></div>
        <div><dt className="text-[var(--muted-foreground)]">عنوان الطلب</dt><dd className="mt-1 whitespace-pre-wrap">{order.customerAddress || 'غير مسجل في الطلب'}</dd></div>
        <div><dt className="text-[var(--muted-foreground)]">الولاية والمدينة والحي</dt><dd className="mt-1">{order.delivery?.state || 'ولاية غير مسجلة'} · {order.delivery?.city || 'مدينة غير مسجلة'} · {order.delivery?.area || 'حي غير مسجل'}</dd></div>
        {order.delivery?.notes && <div><dt className="text-[var(--muted-foreground)]">وصف العنوان</dt><dd className="mt-1 whitespace-pre-wrap">{order.delivery.notes}</dd></div>}
      </dl></section>
      <section className={panel}><h2 className="font-bold">الدفع والتوصيل</h2><dl className="mt-4 space-y-3 text-sm">
        <div><dt className="text-[var(--muted-foreground)]">حالة الدفع</dt><dd className="mt-1">{order.payment ? paymentStatusLabels[order.payment.status] : 'لا يوجد سجل دفع'}</dd></div>
        <div><dt className="text-[var(--muted-foreground)]">طريقة الدفع</dt><dd className="mt-1">{paymentMethodLabels[order.paymentMethod]}</dd></div>
        <div><dt className="text-[var(--muted-foreground)]">طريقة الاستلام</dt><dd className="mt-1">{deliveryMethodLabels[order.deliveryMethod]}</dd></div>
      </dl>{order.notes && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-[var(--muted)] p-3 text-sm">{order.notes}</p>}</section>
    </div>
    <section className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]"><h2 className="p-5 font-bold">محتويات الطلب</h2><table className="w-full text-right text-sm"><thead className="bg-[var(--muted)]/40"><tr>{['الصنف', 'الكمية', 'سعر الوحدة', 'الإجمالي'].map(label => <th scope="col" key={label} className="px-5 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border)]">{order.items.map(item => {
      const snapshot = item.productSnapshot;
      const name = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) && typeof snapshot.name === 'string' ? snapshot.name : 'صنف محفوظ';
      return <tr key={item.id}><td className="px-5 py-4">{name}</td><td className="px-5 py-4">{item.quantity}</td><td className="whitespace-nowrap px-5 py-4">{money(item.unitPrice, currency)}</td><td className="whitespace-nowrap px-5 py-4">{money(item.total, currency)}</td></tr>;
    })}</tbody></table></section>
    <div className="grid gap-4 md:grid-cols-2"><section className={panel}><h2 className="font-bold">ملخص المبلغ</h2><dl className="mt-4 space-y-3 text-sm">{[
      ['قيمة الأصناف', order.subtotal], ['التوصيل', order.deliveryFee], ['الخصم', order.discount], ['الضريبة', order.tax], ['الإجمالي', order.total],
    ].map(([label, value]) => <div key={String(label)} className="flex justify-between gap-4"><dt>{String(label)}</dt><dd className="font-bold">{money(value, currency)}</dd></div>)}</dl></section>
      <section className={panel}><h2 className="font-bold">سجل حالة الطلب</h2><ol className="mt-4 space-y-4">{order.statusHistory.map(event => <li key={event.id} className="border-s-2 border-[var(--border)] ps-3 text-sm"><p className="font-bold">{orderStatusLabels[event.status]}</p><time className="mt-1 block text-xs text-[var(--muted-foreground)]">{date(event.createdAt)}</time>{event.note && <p className="mt-2 whitespace-pre-wrap">{event.note}</p>}</li>)}{!order.statusHistory.length && <li className="text-sm text-[var(--muted-foreground)]">لا يوجد سجل تغييرات محفوظ.</li>}</ol></section>
    </div>
  </div>;
}
