'use client';

import { useState, useTransition } from 'react';
import { advanceOrderStatusAction } from '@/modules/fulfillment/actions';
import {
  STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
} from '@/modules/fulfillment/types';
import type { ActiveOrder, OrderStatus } from '@/modules/fulfillment/types';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/context';

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-indigo-100 text-indigo-700',
  PREPARING: 'bg-amber-100 text-amber-700',
  READY: 'bg-emerald-100 text-emerald-700',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-stone-100 text-stone-600',
};

function StatusTimeline({ history }: { history: ActiveOrder['statusHistory'] }) {
  const { dict, locale } = useLocale();
  const statusLabel = dict.ordersPage.statusLabel;
  const dateLocale = locale === 'ar' ? 'ar-SD' : 'en-US';
  return (
    <div className="space-y-3">
      {[...history].reverse().map((entry, i) => (
        <div key={entry.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={`h-3 w-3 rounded-full border-2 ${i === 0 ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)] bg-[var(--card)]'}`} />
            {i < history.length - 1 && <div className="mt-1 h-full w-px bg-[var(--border)]" style={{ minHeight: '24px' }} />}
          </div>
          <div className="pb-4 min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {statusLabel[entry.status as keyof typeof statusLabel] ?? entry.status}
            </p>
            {entry.note && (
              <p className="text-xs text-[var(--muted-foreground)]">{entry.note}</p>
            )}
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {new Date(entry.createdAt).toLocaleString(dateLocale, {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderDetailClient({ order: initialOrder }: { order: ActiveOrder }) {
  const { dict, locale } = useLocale();
  const t = dict.orderDetailPage;
  const ot = dict.ordersPage;
  const ft = dict.fulfillmentPage;
  const dateLocale = locale === 'ar' ? 'ar-SD' : 'en-US';
  const [order, setOrder] = useState(initialOrder);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const status = order.status as OrderStatus;
  const isTerminal = TERMINAL_STATUSES.includes(status);
  const nextStatuses = STATUS_TRANSITIONS[status] ?? [];
  const primaryNext = nextStatuses[0] as OrderStatus | undefined;
  const cancelNext = nextStatuses[1] as OrderStatus | undefined;
  const nextLabel = ft.nextStatusLabel[status as keyof typeof ft.nextStatusLabel];

  async function handleAdvance(newStatus: OrderStatus) {
    setError(null);
    startTransition(async () => {
      const result = await advanceOrderStatusAction(order.id, { status: newStatus });
      if (result.success) {
        setOrder(result.data);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const snapshot = (item: ActiveOrder['items'][0]) =>
    item.productSnapshot as { name?: string; image?: string };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-[var(--foreground)]">
              {t.orderNumberPrefix}{order.orderNumber}
            </h1>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}>
              {ot.statusLabel[status as keyof typeof ot.statusLabel] ?? status}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {new Date(order.createdAt).toLocaleString(dateLocale, {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {/* Status actions */}
        {!isTerminal && (
          <div className="flex items-center gap-2">
            {cancelNext && (
              <button
                disabled={isPending}
                onClick={() => handleAdvance(cancelNext)}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                {cancelNext === 'CANCELLED' ? t.cancelOrder : t.rejectOrder}
              </button>
            )}
            {primaryNext && nextLabel && (
              <button
                disabled={isPending}
                onClick={() => handleAdvance(primaryNext)}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isPending ? '...' : nextLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order items */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="font-semibold text-[var(--foreground)]">{t.itemsTitle}</h2>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--muted)] text-sm">
                      {snapshot(item).image ? (
                        <img src={snapshot(item).image} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      ) : '🍽'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {snapshot(item).name ?? t.unknownProduct}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-[var(--muted-foreground)]">{t.noteLabel} {item.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-sm">
                    <span className="text-[var(--muted-foreground)]">×{item.quantity}</span>
                    <span className="font-semibold text-[var(--foreground)] tabular-nums">
                      {Number(item.unitPrice).toLocaleString()} SDG
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* Totals */}
            <div className="border-t border-[var(--border)] px-5 py-4 space-y-1.5">
              {[
                { label: t.subtotal, value: Number(order.subtotal) },
                { label: t.deliveryFee, value: Number(order.deliveryFee) },
                { label: t.discount, value: -Number(order.discount) },
                { label: t.tax, value: Number(order.tax) },
              ].map(({ label, value }) =>
                value !== 0 ? (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">{label}</span>
                    <span className="tabular-nums text-[var(--foreground)]">
                      {value.toLocaleString()} SDG
                    </span>
                  </div>
                ) : null
              )}
              <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base font-black">
                <span className="text-[var(--foreground)]">{t.total}</span>
                <span className="text-[var(--primary)] tabular-nums">
                  {Number(order.total).toLocaleString()} SDG
                </span>
              </div>
            </div>
          </div>

          {/* Status timeline */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="mb-4 font-semibold text-[var(--foreground)]">{t.statusHistoryTitle}</h2>
            <StatusTimeline history={order.statusHistory} />
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">{t.customerInfoTitle}</h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-[var(--foreground)]">
                {order.customerName ?? order.customer?.name ?? '—'}
              </p>
              {(order.customerPhone ?? order.customer?.phone) && (
                <a
                  href={`tel:${order.customerPhone ?? order.customer?.phone}`}
                  className="flex items-center gap-1.5 text-[var(--primary)] hover:underline"
                >
                  📞 {order.customerPhone ?? order.customer?.phone}
                </a>
              )}
              {order.customerAddress && (
                <p className="text-[var(--muted-foreground)] text-xs leading-relaxed">
                  📍 {order.customerAddress}
                </p>
              )}
            </div>
          </div>

          {/* Delivery & Payment */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">{t.deliveryPaymentTitle}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">{t.deliveryMethodLabel}</span>
                <span className="font-medium text-[var(--foreground)]">
                  {t.deliveryMethods[order.deliveryMethod as keyof typeof t.deliveryMethods] ?? order.deliveryMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">{t.paymentMethodLabel}</span>
                <span className="font-medium text-[var(--foreground)]">
                  {t.paymentMethods[order.paymentMethod as keyof typeof t.paymentMethods] ?? order.paymentMethod}
                </span>
              </div>
              {order.branch && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">{t.branchLabel}</span>
                  <span className="font-medium text-[var(--foreground)]">{order.branch.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {(order.notes || order.internalNotes) && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-2">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">{t.notesTitle}</h2>
              {order.notes && (
                <p className="text-sm text-[var(--muted-foreground)]">
                  <span className="font-medium text-[var(--foreground)]">{t.customerNotePrefix} </span>
                  {order.notes}
                </p>
              )}
              {order.internalNotes && (
                <p className="text-sm text-[var(--muted-foreground)]">
                  <span className="font-medium text-[var(--foreground)]">{t.internalNotePrefix} </span>
                  {order.internalNotes}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
