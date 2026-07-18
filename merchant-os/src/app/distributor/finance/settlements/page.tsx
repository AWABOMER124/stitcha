import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { getSettlementsAction } from '@/modules/finance/actions';
import Link from 'next/link';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { SettlementsClient } from './_client';
import prisma from '@/lib/db/prisma';

export default async function SettlementsPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const distributorId = session.user.distributorId;

  const [settlementsRes, merchants, cookieStore] = await Promise.all([
    getSettlementsAction({ page: 1, limit: 100 }),
    prisma.merchant.findMany({
      where: { distributorId },
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' },
    }),
    cookies(),
  ]);

  const settlements = settlementsRes.success
    ? (settlementsRes.data as { data: unknown[] }).data
    : [];
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const dict = dictionaries[locale];
  const t = dict.distributorSettlementsPage;

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

      <SettlementsClient initialSettlements={settlements as any[]} merchants={merchants} />
    </div>
  );
}
