'use client';

import { useState, useTransition } from 'react';
import { assignDriverAction } from '@/modules/drivers/actions';
import { useLocale } from '@/lib/i18n/context';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  total: number | string;
  createdAt: string | Date;
  merchant?: { name: string };
  branch?: { name: string } | null;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  status: string;
}

export function DispatchClient({
  initialOrders,
  initialDrivers,
}: {
  initialOrders: Order[];
  initialDrivers: Driver[];
}) {
  const { dict } = useLocale();
  const t = dict.dispatchPage;
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isPending, startTransition] = useTransition();
  const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>({});

  function handleAssign(orderId: string) {
    const driverId = selectedDriver[orderId];
    if (!driverId) return;

    startTransition(async () => {
      const res = await assignDriverAction({ driverId, orderId });
      if (res.success) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        alert(res.error);
      }
    });
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-12 text-center">
        <p className="text-4xl mb-3">✅</p>
        <p className="font-semibold text-[var(--foreground)]">{t.noPendingOrders}</p>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">{t.noPendingOrdersSubtitle}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const ageMin = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
        const isUrgent = ageMin > 15;

        return (
          <div
            key={order.id}
            className={`rounded-xl border bg-[var(--card)] p-4 ${isUrgent ? 'border-red-300 ring-1 ring-red-100' : 'border-[var(--border)]'}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono font-black text-sm text-[var(--foreground)]">{order.orderNumber}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {order.merchant?.name ?? ''}
                  {order.branch ? ` · ${order.branch.name}` : ''}
                </p>
              </div>
              <div className="text-left">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}
                >
                  {isUrgent ? '🔴' : '⏱'} {ageMin}{t.minAbbr}
                </span>
                <p className="text-sm font-mono font-bold text-[var(--foreground)] mt-1">
                  {Number(order.total).toFixed(2)} SDG
                </p>
              </div>
            </div>

            {order.customerAddress && (
              <p className="text-xs text-[var(--muted-foreground)] mb-3 flex items-start gap-1.5">
                <span>📍</span>
                <span className="leading-relaxed">{order.customerAddress}</span>
              </p>
            )}

            {initialDrivers.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={selectedDriver[order.id] ?? ''}
                  onChange={(e) => setSelectedDriver((p) => ({ ...p, [order.id]: e.target.value }))}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                >
                  <option value="">{t.chooseDriver}</option>
                  {initialDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.phone} {d.status === 'ONLINE' ? '🟢' : '⚫'}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleAssign(order.id)}
                  disabled={isPending || !selectedDriver[order.id]}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-40 transition-colors"
                >
                  {t.assign}
                </button>
              </div>
            ) : (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                {t.noDriversAvailable}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
