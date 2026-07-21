'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCustomerAction } from '@/modules/crm/actions';
import { useLocale } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

export interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  segment: string;
  totalOrders: number;
  totalSpent: number | string;
  isBlocked: boolean;
  notes: string | null;
  loyaltyAccount: { points: number } | null;
}

export function CustomerProfileClient({ customer }: { customer: CustomerDetail }) {
  const { dict } = useLocale();
  const t = dict.customerProfilePage;
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(customer.notes ?? '');
  const [editingNotes, setEditingNotes] = useState(false);

  async function handleToggleBlock() {
    const ok = await confirmDialog({
      message: customer.isBlocked ? t.confirmUnblock : t.confirmBlock,
      confirmLabel: customer.isBlocked ? t.unblock : t.block,
      danger: !customer.isBlocked,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await updateCustomerAction(customer.id, { isBlocked: !customer.isBlocked });
      if (res.success) router.refresh();
      else toast.error(res.error);
    });
  }

  function handleSaveNotes() {
    startTransition(async () => {
      const res = await updateCustomerAction(customer.id, { notes });
      if (res.success) { setEditingNotes(false); router.refresh(); }
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h3 className="font-bold text-[var(--foreground)] mb-4">{t.actions}</h3>
        <button onClick={handleToggleBlock} disabled={isPending}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            customer.isBlocked
              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              : 'border-red-200 text-red-600 hover:bg-red-50'
          }`}>
          {customer.isBlocked ? t.unblock : t.block}
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[var(--foreground)]">{t.notes}</h3>
          {!editingNotes && (
            <button onClick={() => setEditingNotes(true)}
              className="text-xs text-[var(--primary)] hover:underline">{t.edit}</button>
          )}
        </div>
        {editingNotes ? (
          <div className="space-y-2">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none" />
            <div className="flex gap-2">
              <button onClick={handleSaveNotes} disabled={isPending}
                className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50">{t.save}</button>
              <button onClick={() => { setEditingNotes(false); setNotes(customer.notes ?? ''); }}
                className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-xs text-[var(--muted-foreground)]">{t.cancel}</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">{notes || t.noNotes}</p>
        )}
      </div>
    </div>
  );
}
