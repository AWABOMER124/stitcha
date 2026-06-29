'use client';

import { useState, useTransition } from 'react';
import { createSettlementAction, markSettlementPaidAction } from '@/modules/finance/actions';

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'معلقة', cls: 'bg-amber-100 text-amber-700' },
  PROCESSING: { label: 'قيد المعالجة', cls: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'مكتملة', cls: 'bg-emerald-100 text-emerald-700' },
  FAILED: { label: 'فشلت', cls: 'bg-red-100 text-red-700' },
};

interface Settlement {
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

  function handleMarkPaid(id: string) {
    if (!confirm('تأكيد إتمام هذه التسوية؟')) return;
    startTransition(async () => {
      const res = await markSettlementPaidAction(id);
      if (res.success) {
        setSettlements((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, status: 'COMPLETED', paidAt: new Date().toISOString() } : s,
          ),
        );
      } else {
        alert(res.error);
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
          <p className="text-xs text-[var(--muted-foreground)] mb-1">إجمالي المبيعات</p>
          <p className="text-xl font-black text-[var(--foreground)]">{fmt(totals.gross)} SDG</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted-foreground)] mb-1">إجمالي العمولات</p>
          <p className="text-xl font-black text-red-600">{fmt(totals.commission)} SDG</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted-foreground)] mb-1">إجمالي صافي التجار</p>
          <p className="text-xl font-black text-emerald-600">{fmt(totals.net)} SDG</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-[var(--muted-foreground)]">{settlements.length} تسوية</p>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          + إنشاء تسوية
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {settlements.length === 0 ? (
          <div className="p-12 text-center text-sm text-[var(--muted-foreground)]">لا توجد تسويات حتى الآن</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                  {['التاجر', 'الفترة', 'الطلبات', 'المبيعات', 'العمولة', 'الصافي', 'الحالة', 'إجراء'].map((h) => (
                    <th key={h} className="py-3 px-4 text-right text-xs font-medium text-[var(--muted-foreground)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {settlements.map((s) => {
                  const statusInfo = STATUS_CONFIG[s.status] ?? { label: s.status, cls: 'bg-gray-100 text-gray-600' };
                  const from = new Date(s.periodFrom).toLocaleDateString('ar', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const to = new Date(s.periodTo).toLocaleDateString('ar', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  return (
                    <tr key={s.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[var(--foreground)]">{s.merchant?.name ?? '—'}</td>
                      <td className="py-3.5 px-4 text-xs text-[var(--muted-foreground)] whitespace-nowrap">{from} → {to}</td>
                      <td className="py-3.5 px-4 text-center font-mono">{s.totalOrders}</td>
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">{fmt(Number(s.grossAmount))} {s.currency}</td>
                      <td className="py-3.5 px-4 font-mono text-red-600 whitespace-nowrap">{fmt(Number(s.commission))} {s.currency}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 whitespace-nowrap">{fmt(Number(s.netAmount))} {s.currency}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {s.status === 'PENDING' && (
                          <button
                            onClick={() => handleMarkPaid(s.id)}
                            disabled={isPending}
                            className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50"
                          >
                            تأكيد الدفع
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
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-2xl" dir="rtl">
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-5">إنشاء تسوية جديدة</h2>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">التاجر *</label>
                <select
                  required
                  value={form.merchantId}
                  onChange={(e) => setForm((p) => ({ ...p, merchantId: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                >
                  <option value="">اختر التاجر</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">من</label>
                  <input type="date" required value={form.periodFrom}
                    onChange={(e) => setForm((p) => ({ ...p, periodFrom: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">إلى</label>
                  <input type="date" required value={form.periodTo}
                    onChange={(e) => setForm((p) => ({ ...p, periodTo: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">ملاحظات</label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none"
                  placeholder="ملاحظات اختيارية..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending}
                  className="flex-1 rounded-lg bg-[var(--primary)] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {isPending ? 'جاري الحساب...' : 'إنشاء التسوية'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
