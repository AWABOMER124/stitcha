import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import Link from 'next/link';
import { getMerchantFinanceOverviewAction } from '@/modules/finance/actions';

const COMMISSION_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: 'نسبة مئوية',
  FLAT_FEE: 'رسوم ثابتة',
  HYBRID: 'مختلط',
  SUBSCRIPTION: 'اشتراك شهري',
};

const COMMISSION_TYPE_COLORS: Record<string, string> = {
  PERCENTAGE: 'bg-blue-100 text-blue-700',
  FLAT_FEE: 'bg-purple-100 text-purple-700',
  HYBRID: 'bg-amber-100 text-amber-700',
  SUBSCRIPTION: 'bg-emerald-100 text-emerald-700',
};

type Overview = {
  currency: string;
  commissionPlan: { name: string; type: string; rate: number; minFee: number } | null;
  totalRevenue: number;
  totalOrders: number;
  monthRevenue: number;
  monthOrders: number;
  estimatedCommission: number;
  estimatedNet: number;
  pendingSettlements: number;
  lastSettlement: { paidAt: string | null; netAmount: number; currency: string } | null;
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function MerchantFinancePage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const res = await getMerchantFinanceOverviewAction();
  const data = res.success ? (res.data as Overview) : null;

  const cur = data?.currency ?? 'SDG';

  return (
    <div dir="rtl" className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">المالية</h1>
        <p className="text-sm text-[var(--muted-foreground)]">نظرة شاملة على أرباحك وعمولاتك ومستحقاتك</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label="إجمالي المبيعات"
          value={fmt(data?.totalRevenue ?? 0)}
          unit={cur}
          icon="💰"
          color="emerald"
          sub={`${data?.totalOrders ?? 0} طلب مكتمل`}
        />
        <KpiCard
          label="مبيعات الشهر الحالي"
          value={fmt(data?.monthRevenue ?? 0)}
          unit={cur}
          icon="📅"
          color="blue"
          sub={`${data?.monthOrders ?? 0} طلب`}
        />
        <KpiCard
          label="العمولة المقدرة (الشهر)"
          value={fmt(data?.estimatedCommission ?? 0)}
          unit={cur}
          icon="📊"
          color="amber"
          sub="بناءً على خطة العمولة"
        />
        <KpiCard
          label="الصافي المتوقع (الشهر)"
          value={fmt(data?.estimatedNet ?? 0)}
          unit={cur}
          icon="✅"
          color="purple"
          sub="بعد خصم العمولة"
        />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commission plan card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--foreground)]">خطة العمولة</h3>
            <span className="text-2xl">📋</span>
          </div>

          {data?.commissionPlan ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    COMMISSION_TYPE_COLORS[data.commissionPlan.type] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {COMMISSION_TYPE_LABELS[data.commissionPlan.type] ?? data.commissionPlan.type}
                </span>
                <span className="font-semibold text-[var(--foreground)]">{data.commissionPlan.name}</span>
              </div>

              <div className="rounded-lg bg-[var(--muted)]/40 p-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--muted-foreground)] text-xs mb-1">النسبة / المبلغ</p>
                  <p className="font-bold text-lg text-[var(--foreground)]">
                    {data.commissionPlan.rate}
                    {data.commissionPlan.type === 'PERCENTAGE' ? '%' : ` ${cur}`}
                  </p>
                </div>
                {data.commissionPlan.minFee > 0 && (
                  <div>
                    <p className="text-[var(--muted-foreground)] text-xs mb-1">الحد الأدنى للعمولة</p>
                    <p className="font-bold text-lg text-[var(--foreground)]">
                      {data.commissionPlan.minFee} {cur}
                    </p>
                  </div>
                )}
              </div>

              <div className="text-xs text-[var(--muted-foreground)] leading-relaxed border-t border-[var(--border)] pt-3">
                {data.commissionPlan.type === 'PERCENTAGE' &&
                  `يُحتسب ${data.commissionPlan.rate}% من إجمالي قيمة كل طلب مكتمل.`}
                {data.commissionPlan.type === 'FLAT_FEE' &&
                  `رسوم ثابتة ${data.commissionPlan.rate} ${cur} على كل طلب مكتمل.`}
                {data.commissionPlan.type === 'HYBRID' &&
                  `الأعلى بين ${data.commissionPlan.rate}% من المبيعات أو ${data.commissionPlan.minFee} ${cur} لكل طلب.`}
                {data.commissionPlan.type === 'SUBSCRIPTION' &&
                  `رسوم اشتراك ثابتة شهرية بمقدار ${data.commissionPlan.rate} ${cur}.`}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-center">
              <p className="text-sm font-medium text-amber-700">لم يتم تعيين خطة عمولة بعد</p>
              <p className="text-xs text-amber-600 mt-1">تواصل مع المشغّل لتعيين خطة عمولة مناسبة</p>
            </div>
          )}
        </div>

        {/* Settlement summary */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--foreground)]">التسويات</h3>
            <Link
              href="/dashboard/finance/settlements"
              className="text-xs font-medium text-[var(--primary)] hover:underline"
            >
              عرض الكل ←
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
              <p className="text-3xl font-black text-amber-600">{data?.pendingSettlements ?? 0}</p>
              <p className="text-xs text-amber-700 mt-1 font-medium">تسوية معلقة</p>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
              {data?.lastSettlement ? (
                <>
                  <p className="text-xl font-black text-emerald-600">
                    {fmt(data.lastSettlement.netAmount)}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1 font-medium">{data.lastSettlement.currency}</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    {data.lastSettlement.paidAt
                      ? new Date(data.lastSettlement.paidAt).toLocaleDateString('ar-SD')
                      : '—'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-black text-emerald-600">—</p>
                  <p className="text-xs text-emerald-700 mt-1 font-medium">لا توجد تسوية سابقة</p>
                </>
              )}
            </div>
          </div>

          <Link
            href="/dashboard/finance/settlements"
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <span>🧾</span>
            عرض سجل التسويات
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuickCard
          href="/dashboard/finance/transactions"
          icon="💳"
          title="سجل المعاملات"
          desc="عرض جميع الحركات المالية"
        />
        <QuickCard
          href="/dashboard/finance/settlements"
          icon="🧾"
          title="التسويات المالية"
          desc="تتبع حالة التسويات والمدفوعات"
        />
        <QuickCard
          href="/dashboard/reports"
          icon="📈"
          title="التقارير المالية"
          desc="تقارير تفصيلية حسب الفترة"
        />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  unit,
  icon,
  color,
  sub,
}: {
  label: string;
  value: string;
  unit: string;
  icon: string;
  color: 'emerald' | 'blue' | 'amber' | 'purple';
  sub?: string;
}) {
  const colors = {
    emerald: 'bg-emerald-600',
    blue: 'bg-blue-600',
    amber: 'bg-amber-500',
    purple: 'bg-purple-600',
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-[var(--muted-foreground)] leading-snug">{label}</p>
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${colors[color]} text-lg`}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-black text-[var(--foreground)] leading-tight">
        {value}
        <span className="text-xs font-normal text-[var(--muted-foreground)] mr-1">{unit}</span>
      </p>
      {sub && <p className="text-[10px] text-[var(--muted-foreground)] mt-1">{sub}</p>}
    </div>
  );
}

function QuickCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)]/40 hover:shadow-md transition-all group"
    >
      <span className="text-3xl block mb-3">{icon}</span>
      <p className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
        {title}
      </p>
      <p className="text-xs text-[var(--muted-foreground)] mt-1">{desc}</p>
    </Link>
  );
}
