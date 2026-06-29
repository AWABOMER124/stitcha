import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getFinanceSummaryAction, getMerchantFinanceSummariesAction } from '@/modules/finance/actions';
import Link from 'next/link';

const COMMISSION_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: 'نسبة مئوية',
  FLAT_FEE: 'رسوم ثابتة',
  HYBRID: 'مختلط',
  SUBSCRIPTION: 'اشتراك شهري',
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'نشط', cls: 'bg-emerald-100 text-emerald-700' },
  PENDING: { label: 'معلق', cls: 'bg-amber-100 text-amber-700' },
  SUSPENDED: { label: 'موقوف', cls: 'bg-red-100 text-red-700' },
  CLOSED: { label: 'مغلق', cls: 'bg-stone-100 text-stone-600' },
};

type Summary = {
  totalMerchants: number;
  activeMerchants: number;
  totalRevenue: number;
  totalFees: number;
  totalCommissions: number;
  pendingSettlements: number;
  currency: string;
};

type MerchantRow = {
  merchantId: string;
  merchantName: string;
  status: string;
  totalOrders: number;
  totalRevenue: number;
  commission: number;
  netAmount: number;
  commissionPlan: { name: string; type: string; rate: number } | null;
  lastSettlement: string | null;
};

export default async function DistributorFinancePage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const [summaryRes, merchantsRes] = await Promise.all([
    getFinanceSummaryAction(),
    getMerchantFinanceSummariesAction(),
  ]);

  const summary = summaryRes.success ? (summaryRes.data as Summary) : null;
  const merchants = merchantsRes.success ? (merchantsRes.data as MerchantRow[]) : [];

  return (
    <div dir="rtl" className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">المالية</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">نظرة عامة على الأرباح والعمولات</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/distributor/finance/settlements"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            التسويات
          </Link>
          <Link
            href="/distributor/finance/commissions"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            خطط العمولات
          </Link>
        </div>
      </div>

      {/* ── تجاري ────────────────────────────────────────────────────────── */}
      <section>
        <SectionHeading label="تجاري" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FinanceCard
            icon={<IconBox bg="bg-blue-600">🏪</IconBox>}
            label="تجاري"
            value={summary?.totalMerchants ?? 0}
          />
          <FinanceCard
            icon={<IconBox bg="bg-emerald-600">✅</IconBox>}
            label="تجار نشطون"
            value={summary?.activeMerchants ?? 0}
          />
          <FinanceCard
            icon={<IconBox bg="bg-amber-500">⏳</IconBox>}
            label="تسويات معلقة"
            value={summary?.pendingSettlements ?? 0}
          />
        </div>
      </section>

      {/* ── المالية ──────────────────────────────────────────────────────── */}
      <section>
        <SectionHeading label="المالية" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FinanceCard
            icon={<IconBox bg="bg-emerald-600">💰</IconBox>}
            label="إجمالي الأرباح"
            value={fmt(summary?.totalRevenue ?? 0)}
            suffix={summary?.currency ?? 'SDG'}
          />
          <FinanceCard
            icon={<IconBox bg="bg-red-600">💳</IconBox>}
            label="إجمالي الرسوم"
            value={fmt(summary?.totalFees ?? 0)}
            suffix={summary?.currency ?? 'SDG'}
          />
          <FinanceCard
            icon={<IconBox bg="bg-purple-600">📊</IconBox>}
            label="إجمالي العمولات"
            value={fmt(summary?.totalCommissions ?? 0)}
            suffix={summary?.currency ?? 'SDG'}
          />
        </div>
      </section>

      {/* ── حساب التجار ──────────────────────────────────────────────────── */}
      <section>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <div>
              <h3 className="text-base font-semibold text-[var(--foreground)]">حساب التجار</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">العمولات والمستحقات لكل تاجر</p>
            </div>
            <Link
              href="/distributor/finance/settlements"
              className="text-sm font-medium text-[var(--primary)] hover:underline"
            >
              إنشاء تسوية ←
            </Link>
          </div>

          {merchants.length === 0 ? (
            <div className="p-12 text-center text-sm text-[var(--muted-foreground)]">
              لا يوجد تجار حتى الآن
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                    {['التاجر', 'خطة العمولة', 'الطلبات', 'إجمالي المبيعات', 'العمولة', 'صافي التاجر', 'الحالة', 'إجراء'].map((h) => (
                      <th key={h} className="py-3 px-4 text-right font-medium text-[var(--muted-foreground)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {merchants.map((m) => {
                    const statusInfo = STATUS_LABELS[m.status] ?? { label: m.status, cls: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={m.merchantId} className="hover:bg-[var(--muted)]/30 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-[var(--foreground)]">{m.merchantName}</td>
                        <td className="py-3.5 px-4 text-[var(--muted-foreground)]">
                          {m.commissionPlan ? (
                            <span className="text-xs leading-relaxed">
                              {m.commissionPlan.name}
                              <br />
                              <span className="text-[var(--muted-foreground)]/70">
                                {COMMISSION_TYPE_LABELS[m.commissionPlan.type]} — {m.commissionPlan.rate}
                                {m.commissionPlan.type === 'PERCENTAGE' ? '%' : ' SDG'}
                              </span>
                            </span>
                          ) : (
                            <span className="text-amber-500 text-xs">لا توجد خطة</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-[var(--foreground)]">{m.totalOrders}</td>
                        <td className="py-3.5 px-4 font-mono text-[var(--foreground)]">{fmt(m.totalRevenue)} SDG</td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-red-600">{fmt(m.commission)} SDG</td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-emerald-600">{fmt(m.netAmount)} SDG</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.cls}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/distributor/finance/settlements?merchant=${m.merchantId}`}
                            className="text-xs font-medium text-[var(--primary)] hover:underline"
                          >
                            تسوية
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Quick Links ───────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuickLinkCard href="/distributor/finance/commissions" icon="📋" title="خطط العمولات" desc="إدارة هياكل العمولة للتجار" />
        <QuickLinkCard href="/distributor/finance/settlements" icon="🧾" title="التسويات" desc="عرض وإنشاء تسويات مالية" />
        <QuickLinkCard href="/distributor/finance/price-lists" icon="🗺️" title="قوائم الأسعار" desc="إدارة مناطق التوصيل والرسوم" />
      </section>
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SectionHeading({ label }: { label: string }) {
  return (
    <h2 className="text-base font-bold text-amber-500 mb-4 pb-2 border-b border-[var(--border)] flex items-center gap-2">
      <span className="w-1.5 h-5 rounded-full bg-amber-500 inline-block" />
      {label}
    </h2>
  );
}

function IconBox({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${bg} text-2xl`}>
      {children}
    </div>
  );
}

function FinanceCard({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 flex items-center gap-5 shadow-sm">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--muted-foreground)] mb-1">{label}</p>
        <p className="text-2xl font-black text-[var(--foreground)] leading-tight">
          {value}
          {suffix && <span className="text-sm font-normal text-[var(--muted-foreground)] mr-1">{suffix}</span>}
        </p>
      </div>
    </div>
  );
}

function QuickLinkCard({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)]/40 hover:shadow-md transition-all group"
    >
      <span className="text-3xl block mb-3">{icon}</span>
      <p className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">{title}</p>
      <p className="text-xs text-[var(--muted-foreground)] mt-1">{desc}</p>
    </Link>
  );
}
