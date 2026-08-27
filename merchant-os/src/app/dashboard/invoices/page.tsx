import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createInvoiceAction, getInvoicesAction } from '@/modules/invoices/actions';

const labels: Record<string, string> = { DRAFT: 'مسودة', ISSUED: 'صادرة', PAID: 'مدفوعة', VOID: 'ملغاة' };

export default async function InvoicesPage() {
  const result = await getInvoicesAction();
  if (!result.success) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{result.error}</div>;
  if (!result.data) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">تعذر تحميل الفواتير.</div>;
  type InvoiceRow = { id: string; invoiceNumber: string; status: string; customerName?: string | null; total: number | string | { toString(): string }; currency: string; createdAt: Date | string; order: { orderNumber: string } };
  type OrderRow = { id: string; orderNumber: string; customerName?: string | null; total: number | string | { toString(): string } };
  const { invoices, orders } = result.data as { invoices: InvoiceRow[]; orders: OrderRow[] };

  async function createInvoice(formData: FormData) {
    'use server';
    const created = await createInvoiceAction(String(formData.get('orderId') ?? ''));
    if (created.success && created.data) redirect(`/dashboard/invoices/${created.data.id}`);
  }

  return <div className="space-y-6" dir="rtl">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-black">فواتير المتجر</h1><p className="text-sm text-[var(--muted-foreground)]">أنشئ فاتورة ثابتة من الطلب، اطبعها أو شارك رابطها مع العميل.</p></div><Link href="/dashboard/exports" className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-bold">تصدير الفواتير</Link></div>
    <form action={createInvoice} className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <select name="orderId" required className="min-w-64 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
        <option value="">اختر طلباً لم تتم فوترته</option>
        {orders.map(order => <option key={order.id} value={order.id}>{order.orderNumber} — {order.customerName ?? 'عميل'} — {Number(order.total).toLocaleString()} SDG</option>)}
      </select>
      <button disabled={!orders.length} className="rounded-lg bg-[var(--primary)] px-5 py-2 font-bold text-white disabled:opacity-50">إنشاء وإصدار الفاتورة</button>
    </form>
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]"><table className="w-full text-sm"><thead className="bg-[var(--muted)]/60"><tr>{['رقم الفاتورة','الطلب','العميل','الحالة','الإجمالي','التاريخ',''].map(h => <th key={h} className="px-4 py-3 text-right">{h}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border)]">{invoices.map(invoice => <tr key={invoice.id}><td className="px-4 py-3 font-mono font-bold">{invoice.invoiceNumber}</td><td className="px-4 py-3">{invoice.order.orderNumber}</td><td className="px-4 py-3">{invoice.customerName ?? '—'}</td><td className="px-4 py-3"><span className="rounded-full bg-[var(--muted)] px-2 py-1 text-xs font-bold">{labels[invoice.status] ?? invoice.status}</span></td><td className="px-4 py-3 font-bold">{Number(invoice.total).toLocaleString()} {invoice.currency}</td><td className="px-4 py-3">{new Date(invoice.createdAt).toLocaleDateString('ar-SD')}</td><td className="px-4 py-3"><Link href={`/dashboard/invoices/${invoice.id}`} className="font-bold text-[var(--primary)]">عرض</Link></td></tr>)}</tbody></table>{!invoices.length && <p className="p-10 text-center text-[var(--muted-foreground)]">لا توجد فواتير بعد.</p>}</div>
  </div>;
}
