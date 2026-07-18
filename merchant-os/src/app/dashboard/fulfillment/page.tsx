import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getFulfillmentStatsAction, getActiveOrdersAction } from '@/modules/fulfillment/actions';
import { KanbanBoard } from './_components/kanban-board';
import type { ActiveOrder } from '@/modules/fulfillment/types';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs font-medium text-[var(--muted-foreground)]">{label}</p>
      <p className={`mt-1 text-2xl font-black tabular-nums ${color ?? 'text-[var(--foreground)]'}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{sub}</p>}
    </div>
  );
}

async function FulfillmentStats() {
  const [result, cookieStore] = await Promise.all([getFulfillmentStatsAction(), cookies()]);
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].fulfillmentPage;
  if (!result.success) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {result.error}
      </div>
    );
  }
  const s = result.data;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label={t.statToday} value={s.totalToday} />
      <StatCard label={t.statActive} value={s.activeOrders} color="text-amber-600" />
      <StatCard label={t.statDelivered} value={s.deliveredToday} color="text-emerald-600" />
      <StatCard
        label={t.statRevenue}
        value={`${s.revenueToday.toLocaleString()} SDG`}
        color="text-[var(--primary)]"
      />
      <StatCard
        label={t.statAvgPrep}
        value={s.avgPrepTime > 0 ? `${s.avgPrepTime} ${t.minuteAbbr}` : '—'}
        sub={t.avgPrepSuffix}
      />
    </div>
  );
}

async function BoardLoader() {
  const result = await getActiveOrdersAction();
  const initialOrders: ActiveOrder[] = result.success ? result.data : [];
  return <KanbanBoard initialOrders={initialOrders} />;
}

export default async function FulfillmentPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].fulfillmentPage;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)]">{t.title}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t.subtitle}
          </p>
        </div>
        <a
          href="/dashboard/orders"
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          {t.allOrders}
        </a>
      </div>

      {/* Stats */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--muted)]" />
            ))}
          </div>
        }
      >
        <FulfillmentStats />
      </Suspense>

      {/* Kanban */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-[var(--muted)]" />
            ))}
          </div>
        }
      >
        <BoardLoader />
      </Suspense>
    </div>
  );
}
