import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import Link from 'next/link';
import { getDriversWithAssignmentAction } from '@/modules/delivery-companies/actions';
import { getDeliveryCompaniesAction } from '@/modules/delivery-companies/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { DeliveryCompanyDriversClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function DeliveryCompanyDriversPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const [driversRes, companiesRes, cookieStore] = await Promise.all([
    getDriversWithAssignmentAction(),
    getDeliveryCompaniesAction(),
    cookies(),
  ]);

  const drivers = driversRes.success ? (driversRes.data as any[]) : [];
  const companies = companiesRes.success ? (companiesRes.data as any[]) : [];
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const dict = dictionaries[locale];
  const t = dict.deliveryCompanyDriversPage;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
          <Link href="/distributor/delivery-companies" className="hover:text-[var(--primary)]">{dict.deliveryCompaniesPage.title}</Link>
          <span>/</span>
          <span>{t.breadcrumb}</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          {t.subtitle}
        </p>
      </div>
      <DeliveryCompanyDriversClient initialDrivers={drivers} companies={companies} />
    </div>
  );
}
