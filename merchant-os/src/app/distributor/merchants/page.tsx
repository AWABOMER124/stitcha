import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';
import Link from 'next/link';
import { getDeliveryCompaniesAction } from '@/modules/delivery-companies/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { DeliveryCompanySelect, StatusToggle, type DeliveryCompany } from './_row-actions';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default async function DistributorMerchantsPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const [merchants, companiesRes, cookieStore] = await Promise.all([
    prisma.merchant.findMany({
      where: { distributorId: session.user.distributorId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        storeType: true,
        status: true,
        email: true,
        phone: true,
        createdAt: true,
        preferredDeliveryCompanyId: true,
        _count: { select: { orders: true, products: true, branches: true, users: true } },
      },
    }),
    getDeliveryCompaniesAction(),
    cookies(),
  ]);

  const deliveryCompanies = companiesRes.success ? (companiesRes.data as unknown as DeliveryCompany[]) : [];
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].distributorMerchantsPage;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t.subtitle}
          </p>
        </div>
        <Link
          href="/distributor/merchants/new"
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary)]/90"
        >
          {t.addMerchant}
        </Link>
      </div>

      {merchants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center">
          <p className="text-[var(--muted-foreground)]">{t.empty}</p>
          <Link
            href="/distributor/merchants/new"
            className="mt-3 inline-block text-sm font-medium text-[var(--primary)] hover:underline"
          >
            {t.addFirst}
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                  <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">{t.colMerchant}</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">{t.colStoreType}</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">{t.colStatus}</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">{t.colBranches}</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">{t.colUsers}</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">{t.colOrders}</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">{t.colDeliveryCo}</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {merchants.map((m) => {
                  const statusLabel = t.statuses[m.status as keyof typeof t.statuses] ?? m.status;
                  return (
                  <tr key={m.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--foreground)]">{m.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{m.email ?? m.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {t.storeTypes[m.storeType as keyof typeof t.storeTypes] ?? m.storeType}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[m.status] ?? ''}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--foreground)]">{m._count.branches}</td>
                    <td className="px-4 py-3 text-right text-[var(--foreground)]">{m._count.users}</td>
                    <td className="px-4 py-3 text-right text-[var(--foreground)]">{m._count.orders}</td>
                    <td className="px-4 py-3">
                      <DeliveryCompanySelect
                        merchantId={m.id}
                        preferredDeliveryCompanyId={m.preferredDeliveryCompanyId}
                        deliveryCompanies={deliveryCompanies}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/distributor/merchants/${m.id}`}
                          className="text-xs font-medium text-[var(--primary)] hover:underline"
                        >
                          {t.manage}
                        </Link>
                        <StatusToggle merchantId={m.id} status={m.status} />
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
