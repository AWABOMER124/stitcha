import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import Link from 'next/link';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { NewDriverClient } from './_client';

export default async function NewDriverPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].newDriverPage;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
          <Link href="/distributor/drivers" className="hover:text-[var(--primary)]">
            {t.breadcrumb}
          </Link>
          <span>/</span>
          <span>{t.title}</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
      </div>
      <NewDriverClient />
    </div>
  );
}
