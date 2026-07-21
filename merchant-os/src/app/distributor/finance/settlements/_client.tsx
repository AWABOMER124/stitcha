'use client';

import { useState, useTransition } from 'react';
import { createSettlementAction, markSettlementPaidAction } from '@/modules/finance/actions';
import { useLocale } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

const STATUS_CLS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
};

export interface Settlement {
  id: string;
  merchantId: string;
  status: string;
  totalOrders: number;
  grossAmount: number | string;
  commission: number | string;
  fees: number | string;
  netAmount: number | string;
  currency: string;
  periodFrom: string | Date;
  periodTo: string | Date;
  notes?: string | null;
  paidAt?: string | Date | null;
  createdAt: string | Date;
  merchant?: { id: string; name: string };
}

interface Merchant {
  id: string;
  name: string;
  status: string;
}

export function SettlementsClient({
  initialSettlements,
  merchants,
}: {
  initialSettlements: Settlement[];
  merchants: Merchant[];
}) {
  const { dict, locale } = useLocale();
  const t = dict.distributorSettlementsPage;
  const dateLocale = locale === 'ar' ? 'ar-SD' : 'en-US';
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [settlements, setSettlements] = useState<Settlement[]>(initialSettlements);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [form, setForm] = useState({
    merchantId: '',
    periodFrom: firstOfMonth,
    periodTo: today,
    notes: '',
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await createSettlementAction({
        merchantId: form.merchantId,
        periodFrom: new Date(form.periodFrom),
        periodTo: new Date(form.periodTo),
        notes: form.notes || undefined,
      });
      if (res.success) {
        setSettlements((prev) => [res.data as Settlement, ...prev]);
        setShowForm(false);
      } else {
        setError(res.error);
      }
    });
  }

  async function handleMarkPaid(id: string) {
    const ok = await confirmDialog({ message: t.confirmMarkPaid, confirmLabel: t.confirmPayment });
    if (!ok) return;
    startTransition(async () => {
      const res = await markSettlementPaidAction(id);
      if (res.success) {
        setSettlements((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, status: 'COMPLETED', paidAt: new Date().toISOString() } : s,
          ),
        );
      } else {
        toast.error(res.error);
      }
    });
  }

  const totals = settlements.reduce(
    (acc, s) => ({
      gross: acc.gross + Number(s.grossAmount),
      commission: acc.commission + Number(s.commission),
      net: acc.net + Number(s.netAmount),
    }),
    { gross: 0, commission: 0, net: 0 },
  );

  function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted-foreground)] mb-1">{t.totalSales}</p>
          <p className="text-xl font-black text-[var(--foreground)]">{fmt(totals.gross)} SDG</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted-foreground)] mb-1">{t.totalCommissions}</p>
          <p className="text-xl font-black text-red-600">{fmt(totals.commission)} SDG</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted-foreground)] mb-1">{t.totalMerchantNet}</p>
          <p className="text-xl font-black text-emerald-600">{fmt(totals.net)} SDG</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-[var(--muted-foreground)]">{settlements.length} {t.settlementsSuffix}</p>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          {t.createSettlement}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {settlements.length === 0 ? (
          <div className="p-12 text-center text-sm text-[var(--muted-foreground)]">{t.empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                  {[t.colMerchant, t.colPeriod, t.colOrders, t.colSales, t.colCommission, t.colNet, t.colStatus, t.colAction].map((h) => (
                    <th key={h} className="py-3 px-4 text-right text-xs font-medium text-[var(--muted-foreground)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {settlements.map((s) => {
                  const statusCls = STATUS_CLS[s.status] ?? 'bg-gray-100 text-gray-600';
                  const statusLabel = t.statuses[s.status as keyof typeof t.statuses] ?? s.status;
                  const from = new Date(s.periodFrom).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const to = new Date(s.periodTo).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' });
                  return (
                    <tr key={s.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[var(--foreground)]">{s.merchant?.name ?? '—'}</td>
                      <td className="py-3.5 px-4 text-xs text-[var(--muted-foreground)] whitespace-nowrap">{from} → {to}</td>
                      <td className="py-3.5 px-4 text-center font-mono">{s.totalOrders}</td>
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">{fmt(Number(s.grossAmount))} {s.currency}</td>
                      <td className="py-3.5 px-4 font-mono text-red-600 whitespace-nowrap">{fmt(Number(s.commission))} {s.currency}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 whitespace-nowrap">{fmt(Number(s.netAmount))} {s.currency}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCls}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {s.status === 'PENDING' && (
                          <button
                            onClick={() => handleMarkPaid(s.id)}
                            disabled={isPending}
                            className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50"
                          >
                            {t.confirmPayment}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-5">{t.modalTitle}</h2>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.merchantLabel}</label>
                <select
                  required
                  value={form.merchantId}
                  onChange={(e) => setForm((p) => ({ ...p, merchantId: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                >
                  <option value="">{t.chooseMerchant}</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.fromLabel}</label>
                  <input type="date" required value={form.periodFrom}
                    onChange={(e) => setForm((p) => ({ ...p, periodFrom: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.toLabel}</label>
                  <input type="date" required value={form.periodTo}
                    onChange={(e) => setForm((p) => ({ ...p, periodTo: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.notesLabel}</label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none"
                  placeholder={t.notesPlaceholder} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending}
                  className="flex-1 rounded-lg bg-[var(--primary)] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {isPending ? t.calculating : t.create}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
