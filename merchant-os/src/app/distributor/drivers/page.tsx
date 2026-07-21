import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { getAllDriversAction, getDriverStatsAction } from '@/modules/drivers/actions';
import Link from 'next/link';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { DriversClient, type Driver } from './_client';

export const dynamic = 'force-dynamic';

export default async function DriversPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const [driversRes, statsRes, cookieStore] = await Promise.all([
    getAllDriversAction(),
    getDriverStatsAction(),
    cookies(),
  ]);

  const drivers = driversRes.success ? driversRes.data : [];
  const stats = statsRes.success
    ? (statsRes.data as { total: number; online: number; busy: number; offline: number; onBreak: number })
    : null;
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].driversPage;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{t.subtitle}</p>
        </div>
        <Link
          href="/distributor/drivers/new"
          className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary)]/90 transition-colors"
        >
          {t.addDriver}
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label={t.statTotal} value={stats.total} color="text-[var(--foreground)]" bg="bg-[var(--card)]" />
          <StatCard label={t.statOnline} value={stats.online} color="text-emerald-600" bg="bg-emerald-50" />
          <StatCard label={t.statBusy} value={stats.busy} color="text-amber-600" bg="bg-amber-50" />
          <StatCard label={t.statOffline} value={stats.offline} color="text-stone-500" bg="bg-stone-50" />
        </div>
      )}

      <DriversClient initialDrivers={drivers as unknown as Driver[]} />
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`rounded-xl border border-[var(--border)] ${bg} p-4`}>
      <p className="text-xs text-[var(--muted-foreground)] mb-1">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}
