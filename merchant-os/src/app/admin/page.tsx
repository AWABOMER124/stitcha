import { getPlatformStatsAction, getRecentActivityAction } from '@/modules/admin/actions';
import Link from 'next/link';

type Stats = {
  totalDistributors: number;
  activeDistributors: number;
  pendingDistributors: number;
  suspendedDistributors: number;
  totalMerchants: number;
  activeMerchants: number;
  totalOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  newDistributorsThisMonth: number;
  newMerchantsThisMonth: number;
};

type Activity = {
  recentOrders: Array<{ id: string; orderNumber: string; status: string; total: any; createdAt: any; merchant: { name: string } | null }>;
  recentMerchants: Array<{ id: string; name: string; status: string; businessType: string; createdAt: any }>;
  recentDistributors: Array<{ id: string; name: string; status: string; createdAt: any }>;
};

const ORDER_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'معلق', cls: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: 'مؤكد', cls: 'bg-blue-100 text-blue-700' },
  PREPARING: { label: 'يُعد', cls: 'bg-indigo-100 text-indigo-700' },
  READY: { label: 'جاهز', cls: 'bg-purple-100 text-purple-700' },
  OUT_FOR_DELIVERY: { label: 'في الطريق', cls: 'bg-cyan-100 text-cyan-700' },
  DELIVERED: { label: 'تم التوصيل', cls: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'ملغي', cls: 'bg-red-100 text-red-700' },
};

const DIST_STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'نشط', cls: 'bg-emerald-100 text-emerald-700' },
  PENDING: { label: 'معلق', cls: 'bg-amber-100 text-amber-700' },
  SUSPENDED: { label: 'موقوف', cls: 'bg-red-100 text-red-700' },
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function AdminDashboardPage() {
  const [statsRes, activityRes] = await Promise.all([
    getPlatformStatsAction(),
    getRecentActivityAction(),
  ]);

  const stats = statsRes.success ? (statsRes.data as Stats) : null;
  const activity = activityRes.success ? (activityRes.data as Activity) : null;

  return (
    <div dir="rtl" className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">لوحة تحكم المنصة</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">نظرة شاملة على أداء منصة وصلك</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon="🏢" label="الموزعون" value={fmt(stats?.totalDistributors ?? 0)}
          sub={`${stats?.activeDistributors ?? 0} نشط`} color="blue"
          badge={stats?.pendingDistributors ? `${stats.pendingDistributors} بانتظار الموافقة` : undefined}
          badgeColor="amber" href="/admin/distributors" />
        <KpiCard icon="🏪" label="التجار" value={fmt(stats?.totalMerchants ?? 0)}
          sub={`${stats?.activeMerchants ?? 0} نشط`} color="purple"
          badge={stats?.newMerchantsThisMonth ? `+${stats.newMerchantsThisMonth} هذا الشهر` : undefined}
          badgeColor="emerald" href="/admin/merchants" />
        <KpiCard icon="📦" label="الطلبات" value={fmt(stats?.totalOrders ?? 0)}
          sub={`${stats?.deliveredOrders ?? 0} مكتمل`} color="indigo" />
        <KpiCard icon="💰" label="إجمالي الإيرادات" value={fmtMoney(stats?.totalRevenue ?? 0)}
          sub="SDG" color="emerald" href="/admin/finance" />
      </div>

      {/* Distributor status breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <StatusCard label="موزع نشط" value={stats?.activeDistributors ?? 0} color="emerald" icon="✅" />
        <StatusCard label="بانتظار الموافقة" value={stats?.pendingDistributors ?? 0} color="amber" icon="⏳" href="/admin/distributors?status=PENDING" />
        <StatusCard label="موقوف" value={stats?.suspendedDistributors ?? 0} color="red" icon="🚫" />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent distributors */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-semibold text-[var(--foreground)]">آخر الموزعين</h3>
            <Link href="/admin/distributors" className="text-xs text-[var(--primary)] hover:underline">عرض الكل ←</Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {activity?.recentDistributors.length === 0 && (
              <p className="p-5 text-sm text-[var(--muted-foreground)] text-center">لا يوجد</p>
            )}
            {activity?.recentDistributors.map((d) => {
              const st = DIST_STATUS[d.status] ?? { label: d.status, cls: 'bg-gray-100 text-gray-600' };
              return (
                <Link key={d.id} href={`/admin/distributors/${d.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--muted)]/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-sm font-bold text-[var(--primary)]">
                      {d.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{d.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {new Date(d.createdAt).toLocaleDateString('ar-SD')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent merchants */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-semibold text-[var(--foreground)]">آخر التجار</h3>
            <Link href="/admin/merchants" className="text-xs text-[var(--primary)] hover:underline">عرض الكل ←</Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {activity?.recentMerchants.length === 0 && (
              <p className="p-5 text-sm text-[var(--muted-foreground)] text-center">لا يوجد</p>
            )}
            {activity?.recentMerchants.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-sm">🏪</div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{m.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{m.businessType}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                  m.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>{m.status === 'ACTIVE' ? 'نشط' : 'معلق'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-semibold text-[var(--foreground)]">آخر الطلبات</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {activity?.recentOrders.length === 0 && (
              <p className="p-5 text-sm text-[var(--muted-foreground)] text-center">لا يوجد</p>
            )}
            {activity?.recentOrders.map((o) => {
              const st = ORDER_STATUS_LABELS[o.status] ?? { label: o.status, cls: 'bg-gray-100 text-gray-600' };
              return (
                <div key={o.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-mono font-bold text-[var(--foreground)]">#{o.orderNumber}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{o.merchant?.name ?? '—'}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[var(--foreground)]">{fmtMoney(Number(o.total))} SDG</p>
                    <span className={`text-xs rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QuickAction href="/admin/distributors" icon="🏢" label="إدارة الموزعين" />
        <QuickAction href="/admin/merchants" icon="🏪" label="إدارة التجار" />
        <QuickAction href="/admin/finance" icon="💰" label="المالية" />
        <QuickAction href="/admin/users" icon="👤" label="مستخدمو المنصة" />
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color, badge, badgeColor, href }: {
  icon: string; label: string; value: string; sub?: string;
  color: 'blue' | 'purple' | 'indigo' | 'emerald';
  badge?: string; badgeColor?: 'amber' | 'emerald'; href?: string;
}) {
  const colors = {
    blue: 'bg-blue-600', purple: 'bg-purple-600', indigo: 'bg-indigo-600', emerald: 'bg-emerald-600',
  };
  const badgeColors = {
    amber: 'bg-amber-100 text-amber-700', emerald: 'bg-emerald-100 text-emerald-700',
  };
  const inner = (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[color]} text-xl`}>{icon}</div>
        {badge && <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${badgeColors[badgeColor ?? 'amber']}`}>{badge}</span>}
      </div>
      <p className="text-xs text-[var(--muted-foreground)] mb-1">{label}</p>
      <p className="text-2xl font-black text-[var(--foreground)]">{value}</p>
      {sub && <p className="text-xs text-[var(--muted-foreground)] mt-1">{sub}</p>}
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

function StatusCard({ label, value, color, icon, href }: {
  label: string; value: number; color: 'emerald' | 'amber' | 'red'; icon: string; href?: string;
}) {
  const colors = {
    emerald: 'border-emerald-200 bg-emerald-50',
    amber: 'border-amber-200 bg-amber-50',
    red: 'border-red-200 bg-red-50',
  };
  const textColors = { emerald: 'text-emerald-700', amber: 'text-amber-700', red: 'text-red-700' };
  const inner = (
    <div className={`rounded-xl border ${colors[color]} p-4 text-center`}>
      <span className="text-2xl">{icon}</span>
      <p className={`text-3xl font-black mt-2 ${textColors[color]}`}>{value}</p>
      <p className={`text-xs font-medium mt-1 ${textColors[color]}`}>{label}</p>
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href}
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center hover:border-[var(--primary)]/40 hover:shadow-sm transition-all group">
      <span className="text-3xl block mb-2">{icon}</span>
      <p className="text-xs font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">{label}</p>
    </Link>
  );
}
