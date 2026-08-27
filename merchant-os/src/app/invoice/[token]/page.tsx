import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InvoiceDocument } from '@/components/invoices/invoice-document';
import { getPublicInvoice } from '@/modules/invoices/services/invoices.service';

export const metadata: Metadata = { title: 'فاتورة | وصلة', robots: { index: false, follow: false } };

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = token.length <= 100 ? await getPublicInvoice(token) : null;
  if (!invoice || invoice.status === 'DRAFT') notFound();
  return <main className="min-h-screen bg-slate-100 p-4 sm:p-8"><InvoiceDocument invoice={invoice} /><p className="mx-auto mt-4 max-w-4xl text-center text-xs text-slate-500 print:hidden">يمكنك حفظ الفاتورة بصيغة PDF من أمر الطباعة في المتصفح.</p></main>;
}
