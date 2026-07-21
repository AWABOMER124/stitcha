import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { getLoyaltyConfigAction, getLoyaltyLeaderboardAction } from '@/modules/crm/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { LoyaltyClient, type LoyaltyConfig, type LoyaltyLeaderboardEntry } from './_client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function LoyaltyPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const [configRes, leaderboardRes, cookieStore] = await Promise.all([
    getLoyaltyConfigAction(),
    getLoyaltyLeaderboardAction(),
    cookies(),
  ]);

  const config = configRes.success ? (configRes.data as unknown as LoyaltyConfig) : null;
  const leaderboard = leaderboardRes.success ? (leaderboardRes.data as unknown as LoyaltyLeaderboardEntry[]) : [];
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].loyaltyPage;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
          <Link href="/dashboard/crm" className="hover:text-[var(--primary)]">CRM</Link>
          <span>/</span>
          <span>{t.breadcrumb}</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{t.subtitle}</p>
      </div>
      <LoyaltyClient initialConfig={config} leaderboard={leaderboard} />
    </div>
  );
}
