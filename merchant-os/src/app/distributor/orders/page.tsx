import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import Link from 'next/link';
import { getDistributorOrdersAction } from '@/modules/orders/actions';
import { getDeliveryCompaniesAction } from '@/modules/delivery-companies/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { OrderDeliveryCompanySelect } from './_client';

export const dynamic = 'force-dynamic';

const STATUS_CLS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-indigo-100 text-indigo-700',
  PREPARING: 'bg-amber-100 text-amber-700',
  READY: 'bg-purple-100 text-purple-700',
  OUT_FOR_DELIVERY: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-stone-100 text-stone-600',
};

export default async function DistributorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const [sp, cookieStore] = await Promise.all([searchParams, cookies()]);
  const tab = (['active', 'archived', 'all'].includes(sp.tab ?? '') ? sp.tab : 'active') as 'active' | 'archived' | 'all';
  const search = sp.q ?? '';
  const page = Number(sp.page ?? '1') || 1;
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].distributorOrdersPage;

  const TABS: { key: string; label: string }[] = [
    { key: 'active', label: t.tabActive },
    { key: 'archived', label: t.tabArchived },
    { key: 'all', label: t.tabAll },
  ];

  const [ordersRes, companiesRes] = await Promise.all([
    getDistributorOrdersAction(tab, search || undefined, page, 20),
    getDeliveryCompaniesAction(),
  ]);

  const result = ordersRes.success ? (ordersRes.data as any) : { data: [], pagination: { page: 1, totalPages: 1 } };
  const orders = result.data as any[];
  const companies = companiesRes.success ? (companiesRes.data as any[]) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          {t.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-1 border-b border-[var(--border)]">
        {TABS.map((tb) => (
          <Link
            key={tb.key}
            href={`/distributor/orders?tab=${tb.key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === tb.key
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {tb.label}
          </Link>
        ))}
      </div>

      <form action="/distributor/orders" method="get" className="flex items-center gap-2">
        <input type="hidden" name="tab" value={tab} />
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder={t.searchPlaceholder}
          className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
        <button
          type="submit"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          {t.search}
        </button>
      </form>

      {orders.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-semibold text-[var(--foreground)]">{t.empty}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colOrderNumber}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colSender}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colRecipient}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colStatus}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colDeliveryCompany}</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colAmount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {orders.map((o) => {
                  const statusLabel = t.statuses[o.status as keyof typeof t.statuses] ?? o.status;
                  const statusCls = STATUS_CLS[o.status] ?? 'bg-gray-100 text-gray-600';
                  return (
                    <tr key={o.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-mono font-bold text-[var(--foreground)]">{o.orderNumber}</td>
                      <td className="px-5 py-3.5 text-sm text-[var(--foreground)]">{o.merchant?.name ?? '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-[var(--muted-foreground)]">{o.customerName ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${statusCls}`}>{statusLabel}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <OrderDeliveryCompanySelect
                          orderId={o.id}
                          currentDeliveryCompanyId={o.delivery?.deliveryCompanyId ?? null}
                          companies={companies}
                        />
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-[var(--foreground)]">
                        {Number(o.total).toLocaleString()} SDG
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {result.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-[var(--border)] px-5 py-3">
              {Array.from({ length: result.pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/distributor/orders?tab=${tab}&q=${encodeURIComponent(search)}&page=${p}`}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${
                    p === page ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
