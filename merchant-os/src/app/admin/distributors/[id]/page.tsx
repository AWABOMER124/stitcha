import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDistributorByIdAction } from '@/modules/admin/actions';
import Link from 'next/link';
import { DistributorDetailClient } from './_client';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';

const STATUS_CLS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
};

const MERCHANT_STATUS_CLS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  CLOSED: 'bg-stone-100 text-stone-600',
};

interface DistributorDetail {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  status: string;
  commissionRate: number | string;
  _count: { merchants: number; drivers: number };
  users: { id: string; isOwner: boolean; user: { name: string | null; email: string } }[];
  merchants: { id: string; name: string; slug: string; status: string; createdAt: string | Date; _count: { orders: number } }[];
}

export default async function DistributorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, cookieStore] = await Promise.all([params, cookies()]);
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const dateLocale = locale === 'ar' ? 'ar-SD' : 'en-US';
  const dict = dictionaries[locale];
  const t = dict.adminDistributorDetailPage;
  const dt = dict.adminDistributorsPage;

  const res = await getDistributorByIdAction(id);
  if (!res.success) notFound();

  const d = res.data as unknown as DistributorDetail;
  const statusLabel = dt.statuses[d.status as keyof typeof dt.statuses] ?? d.status;
  const statusCls = STATUS_CLS[d.status] ?? STATUS_CLS.PENDING;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/admin" className="hover:text-[var(--primary)]">{t.breadcrumbAdmin}</Link>
        <span>/</span>
        <Link href="/admin/distributors" className="hover:text-[var(--primary)]">{t.breadcrumbDistributors}</Link>
        <span>/</span>
        <span>{d.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-3xl font-black text-[var(--primary)]">
            {d.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{d.name}</h1>
            <p className="text-sm font-mono text-[var(--muted-foreground)] mt-0.5">{d.slug}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusCls}`}>{statusLabel}</span>
              {d.email && <span className="text-xs text-[var(--muted-foreground)]">{d.email}</span>}
            </div>
          </div>
        </div>
        <DistributorDetailClient distributorId={d.id} currentStatus={d.status} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-center">
          <p className="text-3xl font-black text-[var(--foreground)]">{d._count.merchants}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{t.merchantsUnit}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-center">
          <p className="text-3xl font-black text-[var(--foreground)]">{d._count.drivers}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{t.driversUnit}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-center">
          <p className="text-3xl font-black text-[var(--foreground)]">{Number(d.commissionRate)}%</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{t.commissionRateLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-semibold text-[var(--foreground)]">{t.usersTitle}</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {d.users.length === 0 ? (
              <p className="p-5 text-sm text-[var(--muted-foreground)] text-center">{t.noUsers}</p>
            ) : (
              d.users.map((u) => (
                <div key={u.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{u.user.name ?? '—'}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{u.user.email}</p>
                  </div>
                  <div className="text-left">
                    <span className="text-xs rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] px-2 py-0.5">
                      {u.isOwner ? t.owner : t.admin}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Merchants */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-semibold text-[var(--foreground)]">{t.merchantsTitlePrefix} ({d.merchants.length})</h3>
          </div>
          {d.merchants.length === 0 ? (
            <div className="p-10 text-center text-sm text-[var(--muted-foreground)]">{t.noMerchants}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                    {[t.colMerchant, t.colStatus, t.colOrders, t.colJoined].map((h) => (
                      <th key={h} className="py-2.5 px-4 text-right font-medium text-[var(--muted-foreground)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {d.merchants.map((m) => {
                    const mLabel = t.merchantStatuses[m.status as keyof typeof t.merchantStatuses] ?? m.status;
                    const mCls = MERCHANT_STATUS_CLS[m.status] ?? MERCHANT_STATUS_CLS.PENDING;
                    return (
                      <tr key={m.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium text-[var(--foreground)]">{m.name}</p>
                          <p className="text-xs font-mono text-[var(--muted-foreground)]">{m.slug}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${mCls}`}>{mLabel}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">{m._count.orders}</td>
                        <td className="py-3 px-4 text-xs text-[var(--muted-foreground)]">
                          {new Date(m.createdAt).toLocaleDateString(dateLocale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
