'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface ManualPaymentAccountOption { id: string; channel: string; label: string; accountName: string; accountNumber: string; instructions: string | null; monthlyAmount: number; currency: string }

export function ManualPaymentForm({ accounts, locale }: { accounts: ManualPaymentAccountOption[]; locale: 'ar' | 'en' }) {
  const router = useRouter();
  const ar = locale === 'ar';
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = accounts.find(account => account.id === accountId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/subscriptions/manual-payment', { method: 'POST', body: new FormData(event.currentTarget) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || (ar ? 'تعذر إرسال التحويل' : 'Could not submit payment'));
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Error'); }
    finally { setBusy(false); }
  }

  if (accounts.length === 0) return <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{ar ? 'لم تُضف وصلة حسابات التحويل بعد. يمكنك إرسال طلب الترقية وسيظهر خيار السداد عند تفعيله.' : 'WASLA transfer accounts have not been configured yet.'}</p>;

  return <form onSubmit={submit} className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">{accounts.map(account => <button key={account.id} type="button" onClick={() => setAccountId(account.id)} className={`rounded-xl border p-4 text-start ${accountId === account.id ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)]'}`}><strong className="block">{account.label}</strong><span className="mt-1 block text-sm text-[var(--muted-foreground)]">{account.accountName}</span><span className="block font-mono text-sm">{account.accountNumber}</span></button>)}</div>
    <input type="hidden" name="paymentAccountId" value={accountId}/>
    {selected && <div className="rounded-xl bg-[var(--muted)] p-4 text-sm"><p>{ar ? 'المبلغ المطلوب' : 'Amount due'}: <strong>{selected.monthlyAmount.toLocaleString()} {selected.currency}</strong></p>{selected.instructions && <p className="mt-1 text-[var(--muted-foreground)]">{selected.instructions}</p>}</div>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">{ar ? 'رقم العملية' : 'Transaction reference'}<input required name="transactionRef" minLength={4} maxLength={100} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"/></label><label className="text-sm">{ar ? 'اسم المحوّل' : 'Sender name'}<input name="senderName" maxLength={120} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"/></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">{ar ? 'وقت التحويل' : 'Transfer time'}<input name="transferredAt" type="datetime-local" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"/></label><label className="text-sm">{ar ? 'إشعار التحويل' : 'Transfer receipt'}<input required name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 block w-full rounded-xl border border-dashed border-[var(--border)] p-2 text-sm"/></label></div>
    <p className="text-xs text-[var(--muted-foreground)]">{ar ? 'الإشعار خاص ولا يظهر للعامة. الحد الأقصى 10MB.' : 'The receipt is private and never public. Maximum 10MB.'}</p>
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={busy || !accountId} className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? (ar ? 'جاري الإرسال…' : 'Submitting…') : (ar ? 'إرسال للتحقق' : 'Submit for verification')}</button>
  </form>;
}
