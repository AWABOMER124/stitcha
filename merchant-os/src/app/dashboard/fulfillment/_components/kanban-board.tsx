'use client';

import { useEffect, useState, useTransition } from 'react';
import { getActiveOrdersAction, advanceOrderStatusAction } from '@/modules/fulfillment/actions';
import {
  KANBAN_COLUMNS,
  STATUS_TRANSITIONS,
  NEXT_STATUS_LABEL,
  TERMINAL_STATUSES,
  DELAY_THRESHOLD_MINUTES,
} from '@/modules/fulfillment/types';
import type { ActiveOrder, OrderStatus } from '@/modules/fulfillment/types';
import Link from 'next/link';

const POLL_INTERVAL_MS = 30_000;

function elapsedMinutes(date: Date | string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000);
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes} د`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}س ${m}د` : `${h}س`;
}

function OrderCard({
  order,
  onAdvance,
  isPending,
}: {
  order: ActiveOrder;
  onAdvance: (orderId: string, status: OrderStatus, label: string) => void;
  isPending: boolean;
}) {
  const status = order.status as OrderStatus;
  const isTerminal = TERMINAL_STATUSES.includes(status);
  const elapsed = elapsedMinutes(order.createdAt);
  const isDelayed = !isTerminal && elapsed > DELAY_THRESHOLD_MINUTES;

  const nextStatuses = STATUS_TRANSITIONS[status] ?? [];
  const primaryNext = nextStatuses[0] as OrderStatus | undefined;
  const cancelNext = nextStatuses[1] as OrderStatus | undefined;

  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div
      className={`rounded-xl border bg-white p-3 shadow-sm transition-all hover:shadow-md ${
        isDelayed ? 'border-red-400 ring-1 ring-red-300' : 'border-[var(--border)]'
      } ${isPending ? 'opacity-60' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--foreground)] truncate">
            #{order.orderNumber}
          </p>
          <p className="text-[11px] text-[var(--muted-foreground)] truncate">
            {order.customerName ?? order.customer?.name ?? '—'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              isDelayed ? 'bg-red-100 text-red-700' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
            }`}
          >
            {formatElapsed(elapsed)}
          </span>
          {isDelayed && (
            <span className="text-[10px] text-red-600 font-medium">⚠ متأخر</span>
          )}
        </div>
      </div>

      {/* Items summary */}
      <div className="mb-2 text-[11px] text-[var(--muted-foreground)] space-y-0.5">
        {order.items.slice(0, 2).map((item) => {
          const snapshot = item.productSnapshot as { name?: string };
          return (
            <div key={item.id} className="flex justify-between">
              <span className="truncate max-w-[120px]">{snapshot?.name ?? 'منتج'}</span>
              <span className="font-medium text-[var(--foreground)]">×{item.quantity}</span>
            </div>
          );
        })}
        {order.items.length > 2 && (
          <p className="text-[10px] text-[var(--muted-foreground)]">+{order.items.length - 2} أصناف أخرى</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-1 border-t border-[var(--border)] pt-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-[var(--foreground)]">
            {Number(order.total).toLocaleString()} SDG
          </span>
          <span className="text-[10px] text-[var(--muted-foreground)]">({itemCount} أصناف)</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="text-[10px] text-[var(--primary)] hover:underline"
          >
            تفاصيل
          </Link>
          {primaryNext && NEXT_STATUS_LABEL[status] && (
            <button
              disabled={isPending}
              onClick={() => onAdvance(order.id, primaryNext, NEXT_STATUS_LABEL[status]!)}
              className="rounded-md bg-[var(--primary)] px-2 py-1 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {NEXT_STATUS_LABEL[status]}
            </button>
          )}
          {cancelNext && (cancelNext === 'CANCELLED' || cancelNext === 'REJECTED') && (
            <button
              disabled={isPending}
              onClick={() => onAdvance(order.id, cancelNext, cancelNext === 'CANCELLED' ? 'إلغاء' : 'رفض')}
              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {cancelNext === 'CANCELLED' ? 'إلغاء' : 'رفض'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function KanbanBoard({ initialOrders }: { initialOrders: ActiveOrder[] }) {
  const [orders, setOrders] = useState<ActiveOrder[]>(initialOrders);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const result = await getActiveOrdersAction();
    if (result.success) {
      setOrders(result.data);
      setLastUpdated(new Date());
      setError(null);
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => { refresh(); });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  async function handleAdvance(orderId: string, status: OrderStatus, label: string) {
    setPendingId(orderId);
    try {
      const result = await advanceOrderStatusAction(orderId, { status });
      if (result.success) {
        await refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setPendingId(null);
    }
  }

  const ordersByStatus = Object.fromEntries(
    KANBAN_COLUMNS.map((col) => [
      col.status,
      orders.filter((o) => o.status === col.status),
    ]),
  );

  const activeCount = orders.length;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-[var(--muted-foreground)]">
              مباشر · {activeCount} طلب نشط
            </span>
          </div>
          <span className="text-[11px] text-[var(--muted-foreground)]">
            آخر تحديث: {lastUpdated.toLocaleTimeString('ar-SD', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <button
          onClick={() => refresh()}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          ↻ تحديث
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-xs underline">تجاهل</button>
        </div>
      )}

      {/* Kanban grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {KANBAN_COLUMNS.map((col) => {
          const colOrders = ordersByStatus[col.status] ?? [];
          return (
            <div key={col.status} className="flex flex-col gap-2">
              {/* Column header */}
              <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${col.bgColor} ${col.borderColor}`}>
                <span className={`text-xs font-bold ${col.textColor}`}>{col.label}</span>
                <span className={`text-xs font-black tabular-nums ${col.textColor}`}>
                  {colOrders.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 min-h-[200px]">
                {colOrders.length === 0 ? (
                  <div className={`rounded-xl border-2 border-dashed ${col.borderColor} p-4 text-center`}>
                    <p className="text-[11px] text-[var(--muted-foreground)]">لا توجد طلبات</p>
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onAdvance={handleAdvance}
                      isPending={pendingId === order.id}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
