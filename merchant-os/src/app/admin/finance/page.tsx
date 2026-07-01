import { getPlatformFinanceStatsAction, getAllDistributorsAction } from '@/modules/admin/actions';

type FinanceStats = {
  totalRevenue: number;
  monthRevenue: number;
  totalSettlements: number;
  pendingSettlements: number;
  totalCommissionCollected: number;
  totalPaidOut: number;
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function AdminFinancePage() {
  const [statsRes, distributorsRes] = await Promise.all([
    getPlatformFinanceStatsAction(),
    getAllDistributorsAction(1, 100),
  ]);

  const stats = statsRes.success ? (statsRes.data as FinanceStats) : null;
  const distributors = distributorsRes.success
    ? (distributorsRes.data as { data: any[] }).data
    : [];

  return (
    <div dir="rtl" className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">المالية</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">نظرة مالية شاملة على مستوى المنصة</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <FinCard icon="💰" label="إجمالي الإيرادات (كل الطلبات)" value={fmt(stats?.totalRevenue ?? 0)} unit="SDG" color="emerald" />
        <FinCard icon="📅" label="إيرادات الشهر الحالي" value={fmt(stats?.monthRevenue ?? 0)} unit="SDG" color="blue" />
        <FinCard icon="📊" label="إجمالي العمولات المحصّلة" value={fmt(stats?.totalCommissionCollected ?? 0)} unit="SDG" color="purple" />
        <FinCard icon="💸" label="إجمالي المدفوع للتجار" value={fmt(stats?.totalPaidOut ?? 0)} unit="SDG" color="indigo" />
        <FinCard icon="🧾" label="إجمالي التسويات" value={String(stats?.totalSettlements ?? 0)} color="gray" />
        <FinCard icon="⏳" label="تسويات معلقة" value={String(stats?.pendingSettlements ?? 0)} color="amber"
          highlight={Boolean(stats?.pendingSettlements)} />
      </div>

      {/* Distributors financial summary */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--foreground)]">ملخص مالي — الموزعون</h3>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">نسبة العمولة الأساسية لكل موزع</p>
        </div>
        {distributors.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--muted-foreground)]">لا يوجد موزعون</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                  {['الموزع', 'الحالة', 'التجار', 'نسبة العمولة'].map((h) => (
                    <th key={h} className="py-3 px-5 text-right font-medium text-[var(--muted-foreground)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {distributors.map((d: any) => (
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
                        {d.status === 'ACTIVE' ? 'نشط' : d.status === 'PENDING' ? 'معلق' : 'موقوف'}
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
