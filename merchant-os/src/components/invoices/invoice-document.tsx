type Money = number | string | { toString(): string };
type InvoiceItemData = { id: string; description: string; sku?: string | null; quantity: number; unitPrice: Money; total: Money };
export type InvoiceDocumentData = {
  invoiceNumber: string; status: string; currency: string; publicToken: string;
  customerName?: string | null; customerPhone?: string | null; billingAddress?: string | null; notes?: string | null;
  subtotal: Money; deliveryFee: Money; discount: Money; tax: Money; total: Money;
  issuedAt?: Date | string | null; createdAt: Date | string;
  merchant: { name: string; phone?: string | null; address?: string | null };
  order: { orderNumber: string };
  items: InvoiceItemData[];
};
const statusLabels: Record<string, string> = { DRAFT: 'مسودة', ISSUED: 'صادرة', PAID: 'مدفوعة', VOID: 'ملغاة' };

export function InvoiceDocument({ invoice }: { invoice: InvoiceDocumentData }) {
  const money = (value: unknown) => `${Number(value).toLocaleString('ar-SD')} ${invoice.currency}`;
  const totals: Array<[string, unknown]> = [['الإجمالي الفرعي', invoice.subtotal], ['التوصيل', invoice.deliveryFee], ['الخصم', -Number(invoice.discount)], ['الضريبة', invoice.tax]];
  return <article className="mx-auto max-w-4xl rounded-2xl border border-[var(--border)] bg-white p-6 text-slate-950 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none" dir="rtl">
    <header className="flex flex-wrap justify-between gap-6 border-b border-slate-200 pb-6"><div><p className="text-sm font-bold text-teal-700">WASLA | وصلة</p><h1 className="mt-1 text-3xl font-black">فاتورة</h1><p className="mt-2 font-mono text-sm">{invoice.invoiceNumber}</p></div><div className="text-left"><h2 className="text-xl font-black">{invoice.merchant.name}</h2><p className="text-sm text-slate-600">{invoice.merchant.phone ?? ''}</p><p className="text-sm text-slate-600">{invoice.merchant.address ?? ''}</p></div></header>
    <section className="grid gap-4 border-b border-slate-200 py-5 sm:grid-cols-3"><div><span className="text-xs text-slate-500">العميل</span><strong className="block">{invoice.customerName ?? '—'}</strong><span className="text-sm text-slate-600">{invoice.customerPhone ?? ''}</span></div><div><span className="text-xs text-slate-500">تاريخ الإصدار</span><strong className="block">{new Date(invoice.issuedAt ?? invoice.createdAt).toLocaleDateString('ar-SD')}</strong><span className="text-sm text-slate-600">طلب {invoice.order.orderNumber}</span></div><div><span className="text-xs text-slate-500">الحالة</span><strong className="block text-teal-700">{statusLabels[invoice.status] ?? invoice.status}</strong></div></section>
    {invoice.billingAddress && <p className="py-3 text-sm text-slate-600">عنوان الفوترة: {invoice.billingAddress}</p>}
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b-2 border-slate-900"><th className="py-3 text-right">البيان</th><th className="py-3 text-center">الكمية</th><th className="py-3 text-left">سعر الوحدة</th><th className="py-3 text-left">الإجمالي</th></tr></thead><tbody>{invoice.items.map(item => <tr key={item.id} className="border-b border-slate-200"><td className="py-3">{item.description}{item.sku && <small className="block text-slate-500">SKU: {item.sku}</small>}</td><td className="py-3 text-center">{item.quantity}</td><td className="py-3 text-left">{money(item.unitPrice)}</td><td className="py-3 text-left font-bold">{money(item.total)}</td></tr>)}</tbody></table></div>
    <section className="mr-auto mt-6 w-full max-w-sm space-y-2 text-sm">{totals.map(([label,value]) => Number(value) !== 0 && <div key={label} className="flex justify-between"><span>{label}</span><span>{money(value)}</span></div>)}<div className="flex justify-between border-t-2 border-slate-900 pt-3 text-lg font-black"><span>الإجمالي</span><span>{money(invoice.total)}</span></div></section>
    {invoice.notes && <p className="mt-6 rounded-lg bg-slate-50 p-3 text-sm">ملاحظات: {invoice.notes}</p>}
    <footer className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">تم إصدار هذه الفاتورة إلكترونياً عبر منصة وصلة.</footer>
  </article>;
}
