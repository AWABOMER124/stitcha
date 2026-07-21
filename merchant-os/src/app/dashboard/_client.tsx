'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { StatsCard } from '@/components/dashboard/stats-card';
import { useLocale } from '@/lib/i18n/context';

export interface OrderRow {
  id: string;
  customerName: string | null;
  orderNumber: string;
  createdAt: string | Date;
  status: string;
  total: number | string;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  ACCEPTED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400',
  PREPARING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  READY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
  DELIVERED: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  REJECTED: 'bg-stone-100 text-stone-700 dark:bg-stone-950 dark:text-stone-400',
};

export function DashboardHomeClient({
  overview,
  recentOrders,
  lowStockCount,
  onboardingChecklist,
}: {
  overview: { totalOrders: number; revenue: number; pendingOrders: number } | null;
  recentOrders: OrderRow[];
  lowStockCount: number;
  onboardingChecklist: ReactNode;
}) {
  const { dict, locale } = useLocale();
  const t = dict.dashboardHome;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>

      {onboardingChecklist}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title={t.todaysOrders} value={overview?.totalOrders ?? 0} icon="shopping-bag" />
        <StatsCard title={t.todaysRevenue} value={`${Number(overview?.revenue ?? 0).toLocaleString()} SDG`} icon="banknote" />
        <StatsCard title={t.pendingOrders} value={overview?.pendingOrders ?? 0} icon="clock" variant="warning" />
        <StatsCard
          title={t.lowStockItems}
          value={lowStockCount}
          icon="alert-triangle"
          variant={lowStockCount > 0 ? 'destructive' : 'default'}
        />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t.recentOrders}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{t.recentOrdersSubtitle}</p>
          </div>
          <Link href="/dashboard/orders" className="text-sm font-medium text-[var(--primary)] hover:underline">
            {t.viewAll}
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center text-sm text-[var(--muted-foreground)]">{t.noOrdersToday}</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[var(--muted)]/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--muted)] text-sm font-medium text-[var(--muted-foreground)]">
                    {(order.customerName ?? '??').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{order.customerName ?? t.unknownCustomer}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {order.orderNumber} · {new Date(order.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? ''}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {Number(order.total).toLocaleString()} SDG
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
