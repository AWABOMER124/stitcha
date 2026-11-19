import Link from 'next/link';
import { OrderStatus, type Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { date, money, orderStatusLabels, paymentStatusLabels } from './_format';

export const dynamic = 'force-dynamic';
const fieldClass = 'rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm';
const buttonClass = 'rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold hover:bg-[var(--muted)]';

export default async function AdminOrdersPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_READ);
  const sp = await searchParams;
  const search = (typeof sp.search === 'string' ? sp.search : '').trim().slice(0, 150);
  const status = typeof sp.status === 'string' && Object.values(OrderStatus).includes(sp.status as OrderStatus) ? sp.status as OrderStatus : '';
  const requestedPage = typeof sp.page === 'string' && /^\d{1,6}$/.test(sp.page) ? Math.max(1, Number(sp.page)) : 1;
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(search ? { OR: [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { merchant: { name: { contains: search, mode: 'insensitive' } } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerPhone: { contains: search } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
    ] } : {}),
  };
  const total = await prisma.order.count({ where });
  const pages = Math.max(1, Math.ceil(total / 25)), page = Math.min(requestedPage, pages);
  const orders = await prisma.order.findMany({
    where, skip: (page - 1) * 25, take: 25, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { id: true, orderNumber: true, status: true, total: true, customerName: true, createdAt: true,
      merchant: { select: { id: true, name: true } }, customer: { select: { name: true } },
      payment: { select: { status: true } }, invoice: { select: { currency: true } } },
  });
  function pageHref(next: number) {
    const query = new URLSearchParams({ page: String(next) });
    if (search) query.set('search', search);
    if (status) query.set('status', status);
    return `/admin/orders?${query}`;
  }
  return <div dir="rtl" className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-black">طلبات المنصة</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">{total.toLocaleString('ar')} طلب {search || status ? 'مطابق للفلاتر' : 'من جميع المتاجر'} · المواعيد بتوقيت الرياض</p></div>
      <Link href="/admin" className={buttonClass}>العودة إلى لوحة التحكم</Link>
    </header>
    <form key={`${search}:${status}`} action="/admin/orders" method="get" className="flex flex-wrap gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <label className="flex min-w-52 flex-1 flex-col gap-2 text-sm font-bold">البحث<input type="search" name="search" defaultValue={search} maxLength={150} placeholder="رقم الطلب، المتجر، اسم العميل أو الهاتف" className={fieldClass} /></label>
      <label className="flex flex-col gap-2 text-sm font-bold">حالة الطلب<select name="status" defaultValue={status} className={fieldClass}><option value="">جميع الحالات</option>{Object.entries(orderStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <div className="flex items-end gap-2"><button className={`${buttonClass} bg-[var(--primary)] text-white`}>بحث وتصفية</button><Link href="/admin/orders" className={buttonClass}>مسح الفلاتر</Link></div>
    </form>
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className="w-full text-right text-sm"><caption className="sr-only">قائمة طلبات جميع متاجر المنصة</caption>
        <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40"><tr>{['رقم الطلب', 'المتجر', 'العميل', 'حالة الطلب', 'الدفع', 'الإجمالي', 'تاريخ الطلب', 'التفاصيل'].map(label => <th scope="col" key={label} className="whitespace-nowrap px-4 py-4 font-bold">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-[var(--border)]">{orders.map(order => <tr key={order.id} className="hover:bg-[var(--muted)]/30">
          <td className="whitespace-nowrap px-4 py-4"><Link href={`/admin/orders/${order.id}`} className="font-bold text-[var(--primary)]">#{order.orderNumber}</Link></td>
          <td className="px-4 py-4"><Link href={`/admin/merchants/${order.merchant.id}`} className="hover:underline">{order.merchant.name}</Link></td>
          <td className="px-4 py-4">{order.customerName || order.customer.name}</td>
          <td className="whitespace-nowrap px-4 py-4"><span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-bold">{orderStatusLabels[order.status]}</span></td>
          <td className="whitespace-nowrap px-4 py-4">{order.payment ? paymentStatusLabels[order.payment.status] : 'لا يوجد سجل دفع'}</td>
          <td className="whitespace-nowrap px-4 py-4 font-bold">{money(order.total, order.invoice?.currency)}</td>
          <td className="whitespace-nowrap px-4 py-4 text-xs">{date(order.createdAt)}</td>
          <td className="px-4 py-4"><Link href={`/admin/orders/${order.id}`} className="whitespace-nowrap font-bold text-[var(--primary)]" aria-label={`عرض الطلب ${order.orderNumber}`}>عرض الطلب ←</Link></td>
        </tr>)}{!orders.length && <tr><td colSpan={8} className="p-12 text-center text-[var(--muted-foreground)]">{search || status ? 'لا توجد طلبات مطابقة. جرّب تغيير الفلاتر.' : 'لا توجد طلبات بعد.'}</td></tr>}</tbody>
      </table>
    </div>
    <nav aria-label="صفحات الطلبات" className="flex items-center justify-between gap-3"><span className="text-sm text-[var(--muted-foreground)]">صفحة {page} من {pages}</span><div className="flex gap-2">{page > 1 && <Link href={pageHref(page - 1)} className={buttonClass}>السابق</Link>}{page < pages && <Link href={pageHref(page + 1)} className={buttonClass}>التالي</Link>}</div></nav>
  </div>;
}
