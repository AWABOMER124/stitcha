import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { getDriverAction } from '@/modules/drivers/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import Link from 'next/link';
import { DriverProfileClient, type DriverProfile } from './_client';

interface DriverDetail extends DriverProfile {
  name: string;
  phone: string | null;
  status: string;
  rating: number | string;
  vehicleType: string;
  vehiclePlate: string | null;
  nationalId: string | null;
  _count?: { assignments: number };
}

const STATUS_CLS: Record<string, string> = {
  OFFLINE: 'bg-stone-100 text-stone-600',
  ONLINE: 'bg-emerald-100 text-emerald-700',
  BUSY: 'bg-amber-100 text-amber-700',
  ON_BREAK: 'bg-blue-100 text-blue-600',
};

const STATUS_DOT: Record<string, string> = {
  OFFLINE: 'bg-stone-400',
  ONLINE: 'bg-emerald-500',
  BUSY: 'bg-amber-500',
  ON_BREAK: 'bg-blue-400',
};

export default async function DriverProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const [{ id }, cookieStore] = await Promise.all([params, cookies()]);
  const result = await getDriverAction(id);
  if (!result.success) notFound();

  const driver = result.data as DriverDetail;
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const dict = dictionaries[locale];
  const t = dict.driverProfilePage;
  const ds = dict.driverShared;
  const statusLabel = ds.statuses[driver.status as keyof typeof ds.statuses] ?? driver.status;
  const statusCls = STATUS_CLS[driver.status] ?? 'bg-stone-100 text-stone-600';
  const statusDot = STATUS_DOT[driver.status] ?? 'bg-stone-400';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/distributor/drivers" className="hover:text-[var(--primary)]">
          {t.breadcrumb}
        </Link>
        <span>/</span>
        <span>{driver.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-3xl font-black text-[var(--primary)] mx-auto">
              {driver.name.charAt(0)}
            </div>
            <div
              className={`absolute bottom-0 left-0 w-5 h-5 rounded-full border-2 border-[var(--card)] ${statusDot}`}
            />
          </div>
          <h2 className="text-xl font-black text-[var(--foreground)]">{driver.name}</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{driver.phone}</p>
          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusCls}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            {statusLabel}
          </span>

          <div className="mt-6 grid grid-cols-2 gap-3 text-center border-t border-[var(--border)] pt-5">
            <div>
              <p className="text-2xl font-black text-[var(--foreground)]">{driver._count?.assignments ?? 0}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{t.totalDeliveries}</p>
            </div>
            <div>
              <p className="text-2xl font-black text-amber-500">{Number(driver.rating).toFixed(1)}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{t.rating}</p>
            </div>
          </div>

          <div className="mt-5 space-y-2 text-sm text-right border-t border-[var(--border)] pt-5">
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">{t.vehicleLabel}</span>
              <span className="font-medium">
                {ds.vehicles[driver.vehicleType as keyof typeof ds.vehicles]}
              </span>
            </div>
            {driver.vehiclePlate && (
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">{t.plateLabel}</span>
                <span className="font-mono font-bold">{driver.vehiclePlate}</span>
              </div>
            )}
            {driver.nationalId && (
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">{t.nationalIdLabel}</span>
                <span className="font-mono">{driver.nationalId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">{t.statusLabel}</span>
              <span className={`font-medium ${driver.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                {driver.isActive ? t.active : t.suspended}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">{t.verificationLabel}</span>
              <span className={driver.isVerified ? 'text-blue-600 font-medium' : 'text-[var(--muted-foreground)]'}>
                {driver.isVerified ? t.verified : t.unverified}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <DriverProfileClient driver={driver} />

          {/* Finance quick link */}
          <Link
            href={`/distributor/drivers/${id}/earnings`}
            className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)]/40 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <p className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                  {t.earningsTitle}
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {t.earningsDesc}
                </p>
              </div>
            </div>
            <span className="text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors">←</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
