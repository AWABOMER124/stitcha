import { cookies } from 'next/headers';
import { getPlatformFinanceStatsAction, getAllDistributorsAction } from '@/modules/admin/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';

type FinanceStats = {
  totalRevenue: number;
  monthRevenue: number;
  totalSettlements: number;
  pendingSettlements: number;
  totalCommissionCollected: number;
  totalPaidOut: number;
};

type DistributorRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  commissionRate: number | string;
  _count: { merchants: number };
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function AdminFinancePage() {
  const [statsRes, distributorsRes, cookieStore] = await Promise.all([
    getPlatformFinanceStatsAction(),
    getAllDistributorsAction(1, 100),
    cookies(),
  ]);

  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const dict = dictionaries[locale];
  const t = dict.adminFinancePage;
  const dt = dict.adminDistributorsPage;

  const stats = statsRes.success ? (statsRes.data as FinanceStats) : null;
  const distributors = distributorsRes.success
    ? (distributorsRes.data as { data: DistributorRow[] }).data
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{t.subtitle}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <FinCard icon="💰" label={t.kpiTotalRevenue} value={fmt(stats?.totalRevenue ?? 0)} unit="SDG" color="emerald" />
        <FinCard icon="📅" label={t.kpiMonthRevenue} value={fmt(stats?.monthRevenue ?? 0)} unit="SDG" color="blue" />
        <FinCard icon="📊" label={t.kpiTotalCommission} value={fmt(stats?.totalCommissionCollected ?? 0)} unit="SDG" color="purple" />
        <FinCard icon="💸" label={t.kpiTotalPaidOut} value={fmt(stats?.totalPaidOut ?? 0)} unit="SDG" color="indigo" />
        <FinCard icon="🧾" label={t.kpiTotalSettlements} value={String(stats?.totalSettlements ?? 0)} color="gray" />
        <FinCard icon="⏳" label={t.kpiPendingSettlements} value={String(stats?.pendingSettlements ?? 0)} color="amber"
          highlight={Boolean(stats?.pendingSettlements)} />
      </div>

      {/* Distributors financial summary */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--foreground)]">{t.distributorsSummaryTitle}</h3>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{t.distributorsSummarySubtitle}</p>
        </div>
        {distributors.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--muted-foreground)]">{t.noDistributors}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                  {[t.colDistributor, t.colStatus, t.colMerchants, t.colCommissionRate].map((h) => (
                    <th key={h} className="py-3 px-5 text-right font-medium text-[var(--muted-foreground)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {distributors.map((d) => (
                  <tr key={d.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-sm font-bold text-[var(--primary)]">
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{d.name}</p>
                          <p className="text-xs font-mono text-[var(--muted-foreground)]">{d.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                        d.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                        d.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {dt.statuses[d.status as keyof typeof dt.statuses] ?? d.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center font-bold text-[var(--foreground)]">
                      {d._count.merchants}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="font-mono font-bold text-[var(--primary)]">{Number(d.commissionRate)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FinCard({ icon, label, value, unit, color, highlight }: {
  icon: string; label: string; value: string; unit?: string;
  color: 'emerald' | 'blue' | 'purple' | 'indigo' | 'gray' | 'amber';
  highlight?: boolean;
}) {
  const colors = {
    emerald: 'bg-emerald-600', blue: 'bg-blue-600', purple: 'bg-purple-600',
    indigo: 'bg-indigo-600', gray: 'bg-stone-500', amber: 'bg-amber-500',
  };
  return (
    <div className={`rounded-xl border bg-[var(--card)] p-5 shadow-sm ${highlight ? 'border-amber-300' : 'border-[var(--border)]'}`}>
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[color]} text-xl mb-3`}>{icon}</div>
      <p className="text-xs text-[var(--muted-foreground)] mb-1 leading-snug">{label}</p>
      <p className="text-2xl font-black text-[var(--foreground)]">
        {value}
        {unit && <span className="text-xs font-normal text-[var(--muted-foreground)] mr-1">{unit}</span>}
      </p>
    </div>
  );
}
