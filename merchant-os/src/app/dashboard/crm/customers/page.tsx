import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { getAllCustomersAction } from '@/modules/crm/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { CustomersClient } from './_client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const [result, cookieStore] = await Promise.all([getAllCustomersAction(), cookies()]);
  const customers = result.success ? (result.data as any[]) : [];
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].crmCustomersPage;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
          <Link href="/dashboard/crm" className="hover:text-[var(--primary)]">CRM</Link>
          <span>/</span>
          <span>{t.breadcrumb}</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
      </div>
      <CustomersClient initialCustomers={customers} />
    </div>
  );
}
