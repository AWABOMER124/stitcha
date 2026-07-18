import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { getDistributorUsersAction } from '@/modules/users/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { DistributorUsersClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function DistributorUsersPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const [result, cookieStore] = await Promise.all([getDistributorUsersAction(), cookies()]);
  const users = result.success ? (result.data as unknown[]) : [];
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].distributorUsersPage;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          {t.subtitle}
        </p>
      </div>
      <DistributorUsersClient initialUsers={users as any[]} currentUserId={session.user.id} />
    </div>
  );
}
