'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCustomerAction } from '@/modules/crm/actions';

export function CustomerProfileClient({ customer }: { customer: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(customer.notes ?? '');
  const [editingNotes, setEditingNotes] = useState(false);

  function handleToggleBlock() {
    if (!confirm(customer.isBlocked ? 'إلغاء حظر هذا العميل؟' : 'حظر هذا العميل من الطلب؟')) return;
    startTransition(async () => {
      const res = await updateCustomerAction(customer.id, { isBlocked: !customer.isBlocked });
      if (res.success) router.refresh();
      else alert(res.error);
    });
  }

  function handleSaveNotes() {
    startTransition(async () => {
      const res = await updateCustomerAction(customer.id, { notes });
      if (res.success) { setEditingNotes(false); router.refresh(); }
      else alert(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h3 className="font-bold text-[var(--foreground)] mb-4">إجراءات</h3>
        <button onClick={handleToggleBlock} disabled={isPending}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            customer.isBlocked
              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              : 'border-red-200 text-red-600 hover:bg-red-50'
          }`}>
          {customer.isBlocked ? '✓ إلغاء الحظر' : '⛔ حظر العميل'}
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[var(--foreground)]">ملاحظات</h3>
          {!editingNotes && (
            <button onClick={() => setEditingNotes(true)}
              className="text-xs text-[var(--primary)] hover:underline">تعديل</button>
          )}
        </div>
        {editingNotes ? (
          <div className="space-y-2">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none" />
            <div className="flex gap-2">
              <button onClick={handleSaveNotes} disabled={isPending}
                className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50">حفظ</button>
              <button onClick={() => { setEditingNotes(false); setNotes(customer.notes ?? ''); }}
                className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-xs text-[var(--muted-foreground)]">إلغاء</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">{notes || 'لا توجد ملاحظات'}</p>
        )}
      </div>
    </div>
  );
}
