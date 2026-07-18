import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import Link from 'next/link';
import { getMerchantSettlementsAction } from '@/modules/finance/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, type Dictionary } from '@/lib/i18n/translations';

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

const STATUS_ICONS: Record<string, string> = {
  PENDING: '⏳',
  PROCESSING: '🔄',
  COMPLETED: '✅',
  FAILED: '❌',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default async function MerchantSettlementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const [sp, cookieStore] = await Promise.all([searchParams, cookies()]);
  const page = Number(sp.page ?? 1);
  const status = sp.status ?? '';
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const dateLocale = locale === 'ar' ? 'ar-SD' : 'en-US';
  const dict: Dictionary = dictionaries[locale];
  const t = dict.financeSettlementsPage;

  function dateFmt(d: string | Date) {
    return new Date(d).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const res = await getMerchantSettlementsAction({ page, limit: 20, status: status || undefined });
  const result = res.success
    ? (res.data as PageData)
    : { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };

  const settlements = result.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
            <Link href="/dashboard/finance" className="hover:text-[var(--primary)]">{dict.financeHomePage.title}</Link>
            <span>/</span>
            <span>{t.breadcrumb}</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {t.subtitlePrefix} {result.pagination.total} {t.subtitleSuffix}
          </p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip href="/dashboard/finance/settlements" label={t.all} active={!status} />
        {Object.keys(STATUS_ICONS).map((key) => (
          <FilterChip
            key={key}
            href={`/dashboard/finance/settlements?status=${key}`}
            label={`${STATUS_ICONS[key]} ${t.statuses[key as keyof typeof t.statuses]}`}
            active={status === key}
          />
        ))}
      </div>

      {/* Settlement cards */}
      {settlements.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-16 text-center">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-sm font-medium text-[var(--foreground)]">{t.empty}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {t.emptySubtitle}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {settlements.map((s) => {
            const statusLabel = t.statuses[s.status as keyof typeof t.statuses] ?? s.status;
            const statusIcon = STATUS_ICONS[s.status] ?? '❓';
            const statusCls = STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600';
            const gross = Number(s.grossAmount);
            const commission = Number(s.commission);
            const fees = Number(s.fees);
            const net = Number(s.netAmount);
            return (
              <div key={s.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${statusCls}`}>
                      <span>{statusIcon}</span>
                      {statusLabel}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {dateFmt(s.periodFrom)} — {dateFmt(s.periodTo)}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {s.totalOrders} {t.completedOrdersSuffix}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-[var(--muted-foreground)]">{t.netDue}</p>
                    <p className={`text-xl font-black ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmt(net)} <span className="text-xs font-normal">{s.currency}</span>
                    </p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="px-6 py-4 grid grid-cols-3 gap-6 text-sm">
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)] mb-1">{t.totalSales}</p>
                    <p className="font-bold text-[var(--foreground)] font-mono">{fmt(gross)} {s.currency}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)] mb-1">{t.commissionCharged}</p>
                    <p className="font-bold text-red-600 font-mono">− {fmt(commission)} {s.currency}</p>
                  </div>
                  {fees > 0 && (
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">{t.otherFees}</p>
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
                        {t.paidOn} {dateFmt(s.paidAt)}
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
            {t.pageOf.replace('{page}', String(result.pagination.page)).replace('{total}', String(result.pagination.totalPages))}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/dashboard/finance/settlements?page=${page - 1}${status ? `&status=${status}` : ''}`}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium hover:bg-[var(--muted)] transition-colors"
              >
                {t.prev}
              </Link>
            )}
            {page < result.pagination.totalPages && (
              <Link
                href={`/dashboard/finance/settlements?page=${page + 1}${status ? `&status=${status}` : ''}`}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
              >
                {t.next}
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
