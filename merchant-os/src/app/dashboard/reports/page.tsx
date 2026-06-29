import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getFullReport } from '@/modules/reports/services/reports.service';
import { RevenueChart } from './_components/revenue-chart';
import { StatusChart } from './_components/status-chart';
import { HoursChart } from './_components/hours-chart';
import { ProductsChart } from './_components/products-chart';
import { SEGMENT_CONFIG } from '@/modules/crm/types';
import Link from 'next/link';
import type { DateRange } from '@/modules/reports/types';

export const dynamic = 'force-dynamic';

const RANGES: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'اليوم' },
  { value: 'yesterday', label: 'أمس' },
  { value: 'week', label: '7 أيام' },
  { value: 'month', label: '30 يوم' },
  { value: 'quarter', label: '3 أشهر' },
];

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

  const range: DateRange = (searchParams.range as DateRange) ?? 'month';
  const report = await getFullReport(session.user.merchantId, range);
  const { summary, dailyRevenue, ordersByStatus, hourlyOrders, topProducts, topCustomers, branchStats, financialSummary } = report;

  const peakHour = hourlyOrders.reduce((max, h) => (h.orders > max.orders ? h : max), hourlyOrders[0]);

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">التقارير والإحصاءات</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">تحليل شامل للمبيعات والتشغيل</p>
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
          label="إجمالي الطلبات"
          value={summary.totalOrders.toString()}
          change={summary.ordersChange}
          icon="📦"
        />
        <KpiCard
          label="الإيرادات"
          value={`${summary.totalRevenue.toFixed(0)} SDG`}
          change={summary.revenueChange}
          icon="💰"
          highlight
        />
        <KpiCard
          label="متوسط الطلب"
          value={`${summary.avgOrderValue.toFixed(0)} SDG`}
          icon="📊"
        />
        <KpiCard
          label="نسبة الإلغاء"
          value={`${summary.cancellationRate.toFixed(1)}%`}
          icon="❌"
          negative={summary.cancellationRate > 10}
        />
        <KpiCard
          label="عملاء جدد"
          value={summary.newCustomers.toString()}
          icon="👥"
        />
      </div>

      {/* Revenue Trend */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-[var(--foreground)]">منحنى الإيرادات</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">الأعمدة = الإيراد (SDG) · الخط = عدد الطلبات</p>
          </div>
          <div className="text-left">
            <p className="text-2xl font-black text-[var(--foreground)]">{summary.totalRevenue.toFixed(0)}</p>
            <p className="text-xs text-[var(--muted-foreground)]">SDG إجمالي</p>
          </div>
        </div>
        <RevenueChart data={dailyRevenue} />
      </div>

      {/* Status + Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="font-bold text-[var(--foreground)] mb-1">توزيع حالات الطلبات</h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">إجمالي {summary.totalOrders} طلب</p>
          {ordersByStatus.length === 0 ? (
            <p className="text-center py-12 text-sm text-[var(--muted-foreground)]">لا توجد بيانات</p>
          ) : (
            <StatusChart data={ordersByStatus} />
          )}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-[var(--foreground)]">ساعات الذروة</h2>
            {peakHour?.orders > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">
                ذروة {peakHour.label}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">توزيع الطلبات خلال اليوم</p>
          <HoursChart data={hourlyOrders} />
        </div>
      </div>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="font-bold text-[var(--foreground)] mb-1">أكثر المنتجات مبيعاً</h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-5">بناءً على الكمية المباعة من الطلبات المكتملة</p>
          <ProductsChart data={topProducts} />
          {/* Top products table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['#', 'المنتج', 'الكمية', 'الإيراد'].map((h) => (
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
        <h2 className="font-bold text-[var(--foreground)] mb-5">الملخص المالي</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <FinCard label="إجمالي المبيعات" value={financialSummary.grossRevenue} />
          <FinCard label="رسوم التوصيل" value={financialSummary.deliveryFees} color="text-blue-600" />
          <FinCard label="الخصومات" value={financialSummary.discounts} color="text-amber-600" prefix="-" />
          <FinCard label="صافي الإيراد" value={financialSummary.netRevenue} color="text-emerald-600" bold />
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
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[var(--primary)]" />صافي</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-400" />توصيل</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-400" />خصومات</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Grid: Customers + Branches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-bold text-[var(--foreground)]">أفضل العملاء</h2>
            <Link href="/dashboard/crm/customers" className="text-xs text-[var(--primary)] hover:underline">عرض الكل</Link>
          </div>
          {topCustomers.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--muted-foreground)]">لا توجد بيانات</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {topCustomers.map((c, i) => {
                const seg = SEGMENT_CONFIG[c.segment as keyof typeof SEGMENT_CONFIG];
                return (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-6 text-xs font-black text-[var(--muted-foreground)] text-center">{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-xs font-black text-[var(--primary)]">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[var(--foreground)] truncate">{c.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{c.totalOrders} طلب</p>
                    </div>
                    <div className="text-left">
                      <p className="font-mono font-bold text-sm text-[var(--foreground)]">{c.totalSpent.toFixed(0)}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">SDG</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${seg?.bg} ${seg?.color}`}>{seg?.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Branch Stats */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-bold text-[var(--foreground)]">أداء الفروع</h2>
          </div>
          {branchStats.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--muted-foreground)]">لا توجد فروع</p>
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
                        <span className="text-xs text-[var(--muted-foreground)] mr-2">({b.orders} طلب)</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--muted)]">
                      <div className="h-full rounded-full bg-[var(--primary)] transition-all"
                        style={{ width: `${(b.revenue / maxRev) * 100}%` }} />
                    </div>
                    {b.cancellations > 0 && (
                      <p className="text-xs text-red-500 mt-1">{b.cancellations} إلغاء</p>
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

function KpiCard({ label, value, change, icon, highlight, negative }: {
  label: string; value: string; change?: number; icon: string; highlight?: boolean; negative?: boolean;
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
          {pct(change)} عن الفترة السابقة
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
