'use client';

import { useState, useTransition } from 'react';
import { updateDeliveryStatusAction, assignDriverAction } from '@/modules/delivery/actions';
import { useLocale } from '@/lib/i18n/context';

export interface Delivery {
  id: string;
  status: string;
  driverName: string | null;
  driverPhone: string | null;
  address: string | null;
  area: string | null;
  order: { id: string; orderNumber: string; customerName: string | null; customerPhone: string | null; status: string } | null;
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-stone-100 text-stone-600',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  PICKED_UP: 'bg-indigo-100 text-indigo-700',
  IN_TRANSIT: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
};

export function DeliveryClient({ initialDeliveries }: { initialDeliveries: Delivery[] }) {
  const { dict } = useLocale();
  const t = dict.deliveryPage;
  const STATUS_LABEL = t.statuses;
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      const res = await updateDeliveryStatusAction(id, { status });
      if (res.success) setDeliveries((d) => d.map((x) => (x.id === id ? { ...x, status } : x)));
    });
  }

  function submitAssign(id: string) {
    if (!driverName || !driverPhone) { setError(t.driverNameRequired); return; }
    setError('');
    startTransition(async () => {
      const res = await assignDriverAction(id, { driverName, driverPhone });
      if (res.success) {
        setDeliveries((d) => d.map((x) => (x.id === id ? { ...x, driverName, driverPhone, status: 'ASSIGNED' } : x)));
        setAssigningId(null);
        setDriverName('');
        setDriverPhone('');
      } else setError(res.error);
    });
  }

  const header = (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.title}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
    </div>
  );

  if (deliveries.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">🚚</p>
          <p className="font-semibold text-[var(--foreground)]">{t.empty}</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t.emptySubtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">{t.colOrder}</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">{t.colCustomer}</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">{t.colDriver}</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">{t.colStatus}</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {deliveries.map((d) => (
              <>
                <tr key={d.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-mono font-bold text-[var(--foreground)]">{d.order?.orderNumber ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-[var(--muted-foreground)]">
                    <div>{d.order?.customerName ?? '—'}</div>
                    {d.order?.customerPhone && <div className="text-xs">{d.order.customerPhone}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[var(--muted-foreground)]">
                    {d.driverName ? (
                      <div>
                        <div className="text-[var(--foreground)]">{d.driverName}</div>
                        <div className="text-xs">{d.driverPhone}</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      defaultValue={d.status}
                      disabled={isPending}
                      onChange={(e) => handleStatusChange(d.id, e.target.value)}
                      className={`rounded-md border-0 px-2 py-1 text-xs font-medium disabled:opacity-50 ${STATUS_CLASS[d.status] ?? ''}`}
                    >
                      {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-left">
                    <button
                      onClick={() => (assigningId === d.id ? setAssigningId(null) : (setAssigningId(d.id), setDriverName(d.driverName ?? ''), setDriverPhone(d.driverPhone ?? '')))}
                      className="text-xs font-medium text-[var(--primary)] hover:underline"
                    >
                      {d.driverName ? t.reassign : t.assignDriver}
                    </button>
                  </td>
                </tr>
                {assigningId === d.id && (
                  <tr>
                    <td colSpan={5} className="bg-[var(--muted)]/20 px-5 py-4">
                      {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">{error}</div>}
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.driverNameLabel}</label>
                          <input value={driverName} onChange={(e) => setDriverName(e.target.value)}
                            className="w-48 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.driverPhoneLabel}</label>
                          <input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)}
                            className="w-48 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
                        </div>
                        <button onClick={() => submitAssign(d.id)} disabled={isPending}
                          className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors">
                          {isPending ? t.saving : t.save}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
