import { StatsCard } from '@/components/dashboard/stats-card';
import { getTodayOverviewAction, getOrdersAction } from '@/modules/orders/actions';

export default async function DashboardPage() {
  const [overviewResult, recentResult] = await Promise.all([
    getTodayOverviewAction(),
    getOrdersAction({ limit: 5 }),
  ]);

  const overview = overviewResult.success ? overviewResult.data : null;
  const recentOrders = recentResult.success ? (recentResult.data?.data ?? []) : [];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Overview of your store&apos;s performance today</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Today's Orders"
          value={overview?.totalOrders ?? 0}
          icon="shopping-bag"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Today's Revenue"
          value={`${Number(overview?.revenue ?? 0).toLocaleString()} SDG`}
          icon="banknote"
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Pending Orders"
          value={overview?.pendingOrders ?? 0}
          icon="clock"
          variant="warning"
        />
        <StatsCard
          title="Low Stock Items"
          value={0}
          icon="alert-triangle"
          variant="destructive"
        />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent Orders</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Latest orders from your store</p>
          </div>
          <a href="/dashboard/orders" className="text-sm font-medium text-[var(--primary)] hover:underline">
            View all →
          </a>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center text-sm text-[var(--muted-foreground)]">No orders yet today</div>
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
                    <p className="text-sm font-medium text-[var(--foreground)]">{order.customerName ?? 'Unknown'}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {order.orderNumber} · {new Date(order.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
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
