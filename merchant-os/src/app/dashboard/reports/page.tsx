import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { getFullReport } from '@/modules/reports/services/reports.service';
import { RevenueChart } from './_components/revenue-chart';
import { StatusChart } from './_components/status-chart';
import { HoursChart } from './_components/hours-chart';
import { ProductsChart } from './_components/products-chart';
import { SEGMENT_CONFIG } from '@/modules/crm/types';
import Link from 'next/link';
import type { DateRange } from '@/modules/reports/types';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, type Dictionary } from '@/lib/i18n/translations';

export const dynamic = 'force-dynamic';

function pct(v: number) {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function changeColor(v: number) {
  return v > 0 ? 'text-emerald-600' : v < 0 ? 'text-red-500' : 'text-[var(--muted-foreground)]';
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const dict: Dictionary = dictionaries[locale];
  const t = dict.reportsPage;

  const RANGES: { value: DateRange; label: string }[] = [
    { value: 'today', label: t.ranges.today },
    { value: 'yesterday', label: t.ranges.yesterday },
    { value: 'week', label: t.ranges.week },
    { value: 'month', label: t.ranges.month },
    { value: 'quarter', label: t.ranges.quarter },
  ];

  const range: DateRange = (searchParams.range as DateRange) ?? 'month';
  const report = await getFullReport(session.user.merchantId, range);
  const { summary, dailyRevenue, ordersByStatus, hourlyOrders, topProducts, topCustomers, branchStats, financialSummary } = report;

  const translatedOrdersByStatus = ordersByStatus.map((s) => ({
    ...s,
    label: dict.ordersPage.statusLabel[s.status as keyof typeof dict.ordersPage.statusLabel] ?? s.label,
  }));

  const peakHour = hourlyOrders.reduce((max, h) => (h.orders > max.orders ? h : max), hourlyOrders[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{t.subtitle}</p>
        </div>
        {/* Range Tabs */}
        <div className="flex gap-1.5 bg-[var(--muted)]/50 rounded-xl p-1">
          {RANGES.map((r) => (
            <Link key={r.value} href={`?range=${r.value}`}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                range === r.value
                  ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}>
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label={t.kpiTotalOrders}
          value={summary.totalOrders.toString()}
          change={summary.ordersChange}
          changeSuffix={t.changeSuffix}
          icon="📦"
        />
        <KpiCard
          label={t.kpiRevenue}
          value={`${summary.totalRevenue.toFixed(0)} SDG`}
          change={summary.revenueChange}
          changeSuffix={t.changeSuffix}
          icon="💰"
          highlight
        />
        <KpiCard
          label={t.kpiAvgOrder}
          value={`${summary.avgOrderValue.toFixed(0)} SDG`}
          icon="📊"
        />
        <KpiCard
          label={t.kpiCancellationRate}
          value={`${summary.cancellationRate.toFixed(1)}%`}
          icon="❌"
          negative={summary.cancellationRate > 10}
        />
        <KpiCard
          label={t.kpiNewCustomers}
          value={summary.newCustomers.toString()}
          icon="👥"
        />
      </div>

      {/* Revenue Trend */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-[var(--foreground)]">{t.revenueTrendTitle}</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{t.revenueTrendSubtitle}</p>
          </div>
          <div className="text-left">
            <p className="text-2xl font-black text-[var(--foreground)]">{summary.totalRevenue.toFixed(0)}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{t.totalSuffix}</p>
          </div>
        </div>
        <RevenueChart data={dailyRevenue} locale={locale} tooltipRevenue={t.tooltipRevenue} tooltipOrders={t.tooltipOrders} />
      </div>

      {/* Status + Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="font-bold text-[var(--foreground)] mb-1">{t.statusDistTitle}</h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">{t.statusDistSubtitlePrefix} {summary.totalOrders} {t.statusDistSubtitleSuffix}</p>
          {translatedOrdersByStatus.length === 0 ? (
            <p className="text-center py-12 text-sm text-[var(--muted-foreground)]">{t.noData}</p>
          ) : (
            <StatusChart data={translatedOrdersByStatus} ordersSuffix={t.ordersSuffix} />
          )}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-[var(--foreground)]">{t.peakHoursTitle}</h2>
            {peakHour?.orders > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">
                {t.peakBadgePrefix} {peakHour.label}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">{t.peakHoursSubtitle}</p>
          <HoursChart data={hourlyOrders} ordersSuffix={t.ordersSuffix} />
        </div>
      </div>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="font-bold text-[var(--foreground)] mb-1">{t.topProductsTitle}</h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-5">{t.topProductsSubtitle}</p>
          <ProductsChart data={topProducts} tooltipQuantity={t.tooltipQuantity} tooltipRevenue={t.tooltipRevenue} />
          {/* Top products table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {[t.colRank, t.colProduct, t.colQuantity, t.colRevenue].map((h) => (
                    <th key={h} className="py-2 px-3 text-right text-xs font-semibold text-[var(--muted-foreground)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {topProducts.map((p, i) => (
                  <tr key={p.id} className="hover:bg-[var(--muted)]/20">
                    <td className="py-2.5 px-3 text-xs text-[var(--muted-foreground)] font-mono">{i + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-[var(--foreground)] max-w-48 truncate">{p.name}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[var(--foreground)]">{p.quantity}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">{p.revenue.toFixed(0)} SDG</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="font-bold text-[var(--foreground)] mb-5">{t.financialSummaryTitle}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <FinCard label={t.grossSales} value={financialSummary.grossRevenue} />
          <FinCard label={t.deliveryFees} value={financialSummary.deliveryFees} color="text-blue-600" />
          <FinCard label={t.discounts} value={financialSummary.discounts} color="text-amber-600" prefix="-" />
          <FinCard label={t.netRevenue} value={financialSummary.netRevenue} color="text-emerald-600" bold />
        </div>
        {/* Net breakdown bar */}
        {financialSummary.grossRevenue > 0 && (
          <div className="mt-5">
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              <div className="bg-[var(--primary)] transition-all"
                style={{ width: `${(financialSummary.netRevenue / financialSummary.grossRevenue) * 100}%` }} />
              <div className="bg-blue-400 transition-all"
                style={{ width: `${(financialSummary.deliveryFees / financialSummary.grossRevenue) * 100}%` }} />
              <div className="bg-amber-400 transition-all"
                style={{ width: `${(financialSummary.discounts / financialSummary.grossRevenue) * 100}%` }} />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[var(--primary)]" />{t.legendNet}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-400" />{t.legendDelivery}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-400" />{t.legendDiscounts}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Grid: Customers + Branches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-bold text-[var(--foreground)]">{t.topCustomersTitle}</h2>
            <Link href="/dashboard/crm/customers" className="text-xs text-[var(--primary)] hover:underline">{t.viewAll}</Link>
          </div>
          {topCustomers.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--muted-foreground)]">{t.noData}</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {topCustomers.map((c, i) => {
                const seg = SEGMENT_CONFIG[c.segment as keyof typeof SEGMENT_CONFIG];
                const segLabel = dict.crmCustomersPage.segments[c.segment as keyof typeof dict.crmCustomersPage.segments] ?? seg?.label;
                return (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-6 text-xs font-black text-[var(--muted-foreground)] text-center">{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-xs font-black text-[var(--primary)]">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[var(--foreground)] truncate">{c.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{c.totalOrders} {t.ordersSuffix}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-mono font-bold text-sm text-[var(--foreground)]">{c.totalSpent.toFixed(0)}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">SDG</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${seg?.bg} ${seg?.color}`}>{segLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Branch Stats */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-bold text-[var(--foreground)]">{t.branchPerformanceTitle}</h2>
          </div>
          {branchStats.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--muted-foreground)]">{t.noBranches}</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {branchStats.map((b, i) => {
                const maxRev = branchStats[0].revenue || 1;
                return (
                  <div key={b.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[var(--muted-foreground)]">{i + 1}</span>
                        <p className="font-semibold text-sm text-[var(--foreground)]">{b.name}</p>
                      </div>
                      <div className="text-left">
                        <span className="font-mono font-bold text-sm text-[var(--foreground)]">{b.revenue.toFixed(0)} SDG</span>
                        <span className="text-xs text-[var(--muted-foreground)] mr-2">({b.orders} {t.ordersSuffix})</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--muted)]">
                      <div className="h-full rounded-full bg-[var(--primary)] transition-all"
                        style={{ width: `${(b.revenue / maxRev) * 100}%` }} />
                    </div>
                    {b.cancellations > 0 && (
                      <p className="text-xs text-red-500 mt-1">{b.cancellations} {t.cancellationsSuffix}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, change, changeSuffix, icon, highlight, negative }: {
  label: string; value: string; change?: number; changeSuffix?: string; icon: string; highlight?: boolean; negative?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? 'bg-[var(--primary)]/5 border-[var(--primary)]/20' : 'bg-[var(--card)] border-[var(--border)]'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`text-2xl font-black ${negative ? 'text-red-600' : highlight ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
        {value}
      </p>
      {change !== undefined && (
        <p className={`text-xs mt-1 font-semibold ${changeColor(change)}`}>
          {pct(change)} {changeSuffix}
        </p>
      )}
    </div>
  );
}

function FinCard({ label, value, color, prefix, bold }: {
  label: string; value: number; color?: string; prefix?: string; bold?: boolean;
}) {
  return (
    <div className={`rounded-xl ${bold ? 'bg-emerald-50 border border-emerald-200' : 'bg-[var(--muted)]/30'} p-4`}>
      <p className="text-xs text-[var(--muted-foreground)] mb-1">{label}</p>
      <p className={`text-xl font-black font-mono ${color ?? 'text-[var(--foreground)]'}`}>
        {prefix}{value.toFixed(0)} <span className="text-xs font-normal">SDG</span>
      </p>
    </div>
  );
}
