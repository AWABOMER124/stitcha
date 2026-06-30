import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import Link from 'next/link';
import { getMerchantSettlementsAction } from '@/modules/finance/actions';

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: string }> = {
  PENDING: { label: 'معلقة', cls: 'bg-amber-100 text-amber-700', icon: '⏳' },
  PROCESSING: { label: 'قيد المعالجة', cls: 'bg-blue-100 text-blue-700', icon: '🔄' },
  COMPLETED: { label: 'مكتملة', cls: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  FAILED: { label: 'فشلت', cls: 'bg-red-100 text-red-700', icon: '❌' },
};

type Settlement = {
  id: string;
  status: string;
  totalOrders: number;
  grossAmount: number | string;
  commission: number | string;
  fees: number | string;
  netAmount: number | string;
  currency: string;
  periodFrom: string | Date;
  periodTo: string | Date;
  notes?: string | null;
  paidAt?: string | Date | null;
  createdAt: string | Date;
};

type PageData = {
  data: Settlement[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dateFmt(d: string | Date) {
  return new Date(d).toLocaleDateString('ar-SD', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function MerchantSettlementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const status = sp.status ?? '';

  const res = await getMerchantSettlementsAction({ page, limit: 20, status: status || undefined });
  const result = res.success
    ? (res.data as PageData)
    : { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };

  const settlements = result.data;

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
            <Link href="/dashboard/finance" className="hover:text-[var(--primary)]">المالية</Link>
            <span>/</span>
            <span>التسويات</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">سجل التسويات</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            مدفوعاتك الواردة من المشغّل — {result.pagination.total} تسوية
          </p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip href="/dashboard/finance/settlements" label="الكل" active={!status} />
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <FilterChip
            key={key}
            href={`/dashboard/finance/settlements?status=${key}`}
            label={`${cfg.icon} ${cfg.label}`}
            active={status === key}
          />
        ))}
      </div>

      {/* Settlement cards */}
      {settlements.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-16 text-center">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-sm font-medium text-[var(--foreground)]">لا توجد تسويات</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            ستظهر هنا التسويات التي ينشئها المشغّل لمتجرك
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {settlements.map((s) => {
            const statusCfg = STATUS_CONFIG[s.status] ?? { label: s.status, cls: 'bg-gray-100 text-gray-600', icon: '❓' };
            const gross = Number(s.grossAmount);
            const commission = Number(s.commission);
            const fees = Number(s.fees);
            const net = Number(s.netAmount);
            return (
              <div key={s.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${statusCfg.cls}`}>
                      <span>{statusCfg.icon}</span>
                      {statusCfg.label}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {dateFmt(s.periodFrom)} — {dateFmt(s.periodTo)}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {s.totalOrders} طلب مكتمل
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-[var(--muted-foreground)]">صافي المستحق</p>
                    <p className={`text-xl font-black ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmt(net)} <span className="text-xs font-normal">{s.currency}</span>
                    </p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="px-6 py-4 grid grid-cols-3 gap-6 text-sm">
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)] mb-1">إجمالي المبيعات</p>
                    <p className="font-bold text-[var(--foreground)] font-mono">{fmt(gross)} {s.currency}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)] mb-1">العمولة المحتسبة</p>
                    <p className="font-bold text-red-600 font-mono">− {fmt(commission)} {s.currency}</p>
                  </div>
                  {fees > 0 && (
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">رسوم أخرى</p>
                      <p className="font-bold text-amber-600 font-mono">− {fmt(fees)} {s.currency}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {(s.notes || s.paidAt) && (
                  <div className="px-6 py-3 bg-[var(--muted)]/30 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                    <span>{s.notes}</span>
                    {s.paidAt && (
                      <span className="font-medium text-emerald-600">
                        تم الدفع في {dateFmt(s.paidAt)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {result.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--muted-foreground)]">
            صفحة {result.pagination.page} من {result.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/dashboard/finance/settlements?page=${page - 1}${status ? `&status=${status}` : ''}`}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium hover:bg-[var(--muted)] transition-colors"
              >
                السابق
              </Link>
            )}
            {page < result.pagination.totalPages && (
              <Link
                href={`/dashboard/finance/settlements?page=${page + 1}${status ? `&status=${status}` : ''}`}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
              >
                التالي
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-[var(--primary)] text-white'
          : 'border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
      }`}
    >
      {label}
    </Link>
  );
}
