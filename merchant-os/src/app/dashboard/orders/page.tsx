import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getOrdersAction, updateOrderStatusAction } from '@/modules/orders/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, type Dictionary } from '@/lib/i18n/translations';
import { StatusTabs } from './_components/status-tabs';

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  ACCEPTED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400',
  PREPARING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  READY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
  DELIVERED: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  REJECTED: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400',
};

const NEXT_STATUS: Record<string, string> = {
  NEW: 'ACCEPTED',
  ACCEPTED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};

async function getDict(): Promise<{ dict: Dictionary; locale: Locale }> {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  return { dict: dictionaries[locale], locale };
}

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

async function OrdersList({ status }: { status?: string }) {
  const [result, { dict, locale }] = await Promise.all([
    getOrdersAction(status && status !== 'ALL' ? { status } : {}),
    getDict(),
  ]);
  const t = dict.ordersPage;
  const dateLocale = locale === 'ar' ? 'ar-SD' : 'en-US';

  if (!result.success) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/20">
        <p className="text-sm text-red-600 dark:text-red-400">
          {result.error ?? t.loadFailed}
        </p>
      </div>
    );
  }

  const orders = result.data?.data ?? [];

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">{t.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const nextStatus = NEXT_STATUS[order.status];
        const nextLabel = t.nextStatusLabel[order.status as keyof typeof t.nextStatusLabel];

        async function advanceStatus() {
          'use server';
          if (!nextStatus) return;
          await updateOrderStatusAction(order.id, { status: nextStatus });
        }

        return (
          <div
            key={order.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--muted)] text-lg font-bold text-[var(--muted-foreground)]">
                  {String(order.customerName ?? '??').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">{order.orderNumber}</h3>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? ''}`}>
                      {t.statusLabel[order.status as keyof typeof t.statusLabel] ?? order.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                    {order.customerName ?? t.unknownCustomer} · {order.customerPhone ?? '—'}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                    <span>{order.deliveryMethod === 'PICKUP' ? t.pickup : t.delivery}</span>
                    <span>·</span>
                    <span>{new Date(order.createdAt).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <p className="text-lg font-bold text-[var(--foreground)]">{Number(order.total).toLocaleString()} SDG</p>
                {nextStatus && nextLabel && (
                  <form action={advanceStatus}>
                    <button
                      type="submit"
                      className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
                    >
                      {nextLabel} →
                    </button>
                  </form>
                )}
                <a href={`/dashboard/orders/${order.id}`} className="text-xs text-[var(--primary)] hover:underline">
                  {t.viewDetails}
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const { dict } = await getDict();
  const t = dict.ordersPage;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.title}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
        </div>
      </div>

      <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-[var(--muted)]" />}>
        <StatusTabs />
      </Suspense>

      <Suspense
        fallback={
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--muted)]" />
            ))}
          </div>
        }
      >
        <OrdersList status={status} />
      </Suspense>
    </div>
  );
}
