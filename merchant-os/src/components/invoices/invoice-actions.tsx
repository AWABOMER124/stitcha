'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateInvoiceStatusAction } from '@/modules/invoices/actions';

export function InvoiceActions({ id, status, publicToken }: { id: string; status: string; publicToken: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();
  const update = (next: string) => start(async () => { const result = await updateInvoiceStatusAction(id, next); if (!result.success) setError(result.error ?? 'تعذر تحديث الفاتورة'); else router.refresh(); });
  return <div className="print:hidden space-y-2"><div className="flex flex-wrap gap-2"><button onClick={() => window.print()} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white">طباعة / PDF</button><button onClick={() => navigator.clipboard.writeText(`${location.origin}/invoice/${publicToken}`)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-bold">نسخ رابط العميل</button>{status === 'ISSUED' && <><button disabled={pending} onClick={() => update('PAID')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">تأكيد السداد</button><button disabled={pending} onClick={() => update('VOID')} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-700">إلغاء الفاتورة</button></>}</div>{error && <p className="text-sm text-red-600">{error}</p>}</div>;
}
