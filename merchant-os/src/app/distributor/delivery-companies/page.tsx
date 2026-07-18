import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import Link from 'next/link';
import { getDeliveryCompaniesAction } from '@/modules/delivery-companies/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { DeliveryCompaniesClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function DeliveryCompaniesPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const [result, cookieStore] = await Promise.all([getDeliveryCompaniesAction(), cookies()]);
  const companies = result.success ? (result.data as any[]) : [];
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].deliveryCompaniesPage;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {t.subtitle}
          </p>
        </div>
        <Link
          href="/distributor/delivery-companies/drivers"
          className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          {t.assignDrivers}
        </Link>
      </div>
      <DeliveryCompaniesClient initialCompanies={companies} />
    </div>
  );
}
