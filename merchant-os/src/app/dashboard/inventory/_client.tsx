'use client';

import { Fragment, useState, useTransition } from 'react';
import { adjustStockAction } from '@/modules/inventory/actions';
import { useLocale } from '@/lib/i18n/context';

interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  product: { id: string; name: string; sku: string | null; images: unknown };
}

function statusOf(item: InventoryItem): 'ok' | 'low' | 'out' {
  if (item.quantity <= 0) return 'out';
  if (item.quantity <= item.lowStockThreshold) return 'low';
  return 'ok';
}

const STATUS_CLASS: Record<string, string> = {
  ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  low: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  out: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
};

export function InventoryClient({ initialItems }: { initialItems: InventoryItem[] }) {
  const { dict } = useLocale();
  const t = dict.inventoryPage;
  const STATUS_LABEL: Record<string, string> = { ok: t.statusOk, low: t.statusLow, out: t.statusOut };
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const lowCount = items.filter((i) => statusOf(i) === 'low').length;
  const outCount = items.filter((i) => statusOf(i) === 'out').length;

  function openAdjust(id: string) {
    setAdjustingId(id);
    setDelta('');
    setReason('');
    setError('');
  }

  function submitAdjust(item: InventoryItem) {
    const qty = Number(delta);
    if (!qty) { setError(t.invalidQuantity); return; }
    if (!reason.trim()) { setError(t.reasonRequired); return; }

    startTransition(async () => {
      const res = await adjustStockAction({
        productId: item.productId,
        quantity: qty,
        type: qty > 0 ? 'RESTOCK' : 'ADJUSTMENT',
        reason,
      });
      if (res.success) {
        const updated = res.data as { quantity: number };
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: updated.quantity } : i)));
        setAdjustingId(null);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">{t.totalTracked}</p>
          <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{items.length}</p>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">{t.lowStock}</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">{lowCount}</p>
        </div>
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{t.outOfStock}</p>
          <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-400">{outCount}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-semibold text-[var(--foreground)]">{t.empty}</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {t.emptySubtitle}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t.colProduct}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t.colAvailable}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t.colReserved}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t.colThreshold}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t.colStatus}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t.colAction}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.map((item) => {
                  const status = statusOf(item);
                  return (
                    <Fragment key={item.id}>
                      <tr className="transition-colors hover:bg-[var(--muted)]/30">
                        <td className="px-6 py-4 text-sm font-medium text-[var(--foreground)]">{item.product.name}</td>
                        <td className="px-6 py-4 text-sm text-[var(--foreground)]">{item.quantity}</td>
                        <td className="px-6 py-4 text-sm text-[var(--muted-foreground)]">{item.reservedQuantity}</td>
                        <td className="px-6 py-4 text-sm text-[var(--muted-foreground)]">{item.lowStockThreshold}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
                            {STATUS_LABEL[status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <button
                            onClick={() => (adjustingId === item.id ? setAdjustingId(null) : openAdjust(item.id))}
                            className="text-sm text-[var(--primary)] hover:underline"
                          >
                            {t.adjust}
                          </button>
                        </td>
                      </tr>
                      {adjustingId === item.id && (
                        <tr>
                          <td colSpan={6} className="bg-[var(--muted)]/20 px-6 py-4">
                            {error && (
                              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">{error}</div>
                            )}
                            <div className="flex flex-wrap items-end gap-3">
                              <div>
                                <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                                  {t.quantityLabel}
                                </label>
                                <input
                                  type="number"
                                  value={delta}
                                  onChange={(e) => setDelta(e.target.value)}
                                  placeholder={t.quantityPlaceholder}
                                  className="w-32 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                                />
                              </div>
                              <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.reasonLabel}</label>
                                <input
                                  type="text"
                                  value={reason}
                                  onChange={(e) => setReason(e.target.value)}
                                  placeholder={t.reasonPlaceholder}
                                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                                />
                              </div>
                              <button
                                onClick={() => submitAdjust(item)}
                                disabled={isPending}
                                className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors"
                              >
                                {isPending ? t.saving : t.save}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
