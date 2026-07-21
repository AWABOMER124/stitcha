import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { getCommissionPlansAction } from '@/modules/finance/actions';
import Link from 'next/link';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { CommissionPlansClient, type Plan } from './_client';

export default async function CommissionsPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const [plansRes, cookieStore] = await Promise.all([getCommissionPlansAction(), cookies()]);
  const plans = plansRes.success ? plansRes.data : [];
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const dict = dictionaries[locale];
  const t = dict.distributorCommissionsPage;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
          <Link href="/distributor/finance" className="hover:text-[var(--primary)]">{dict.distributorFinancePage.title}</Link>
          <span>/</span>
          <span>{t.breadcrumb}</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">{t.subtitle}</p>
      </div>

      <CommissionPlansClient initialPlans={plans as unknown as Plan[]} />
    </div>
  );
}
