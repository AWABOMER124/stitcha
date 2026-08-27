import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getInvoiceAction } from '@/modules/invoices/actions';
import { InvoiceActions } from '@/components/invoices/invoice-actions';
import { InvoiceDocument, type InvoiceDocumentData } from '@/components/invoices/invoice-document';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getInvoiceAction(id);
  if (!result.success || !result.data) notFound();
  const invoice = result.data as InvoiceDocumentData;
  return <div className="space-y-4"><div className="print:hidden flex flex-wrap items-center justify-between gap-3"><Link href="/dashboard/invoices" className="text-sm font-bold text-[var(--primary)]">← كل الفواتير</Link><InvoiceActions id={id} status={invoice.status} publicToken={invoice.publicToken} /></div><InvoiceDocument invoice={invoice} /></div>;
}
