import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { getPendingDispatchAction, getAllDriversAction } from '@/modules/drivers/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { DispatchClient, type Order, type Driver } from './_client';

export const dynamic = 'force-dynamic';

interface DispatchDriver extends Driver {
  isActive: boolean;
  rating: number | string;
  totalDeliveries: number;
}

export default async function DispatchPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const [ordersRes, driversRes, cookieStore] = await Promise.all([
    getPendingDispatchAction(),
    getAllDriversAction(),
    cookies(),
  ]);

  const orders = (ordersRes.success ? ordersRes.data : []) as Order[];
  const drivers = (driversRes.success ? driversRes.data : []) as DispatchDriver[];
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].dispatchPage;

  const availableDrivers = drivers.filter(
    (d) => d.isActive && (d.status === 'ONLINE' || d.status === 'OFFLINE'),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            {t.needsDriverTitle}
            <span className="text-sm font-normal text-[var(--muted-foreground)]">({orders.length})</span>
          </h2>
          <DispatchClient initialOrders={orders} initialDrivers={availableDrivers} />
        </div>

        <div>
          <h2 className="font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {t.availableDriversTitle}
            <span className="text-sm font-normal text-[var(--muted-foreground)]">({availableDrivers.length})</span>
          </h2>
          <div className="space-y-3">
            {availableDrivers.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted-foreground)]">
                {t.noAvailableDrivers}
              </div>
            ) : (
              availableDrivers.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center gap-4"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center font-bold text-[var(--primary)]">
                      {d.name.charAt(0)}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-[var(--card)] ${d.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-stone-400'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--foreground)] truncate">{d.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{d.phone}</p>
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400">★</span>
                      <span>{Number(d.rating).toFixed(1)}</span>
                    </div>
                    <p className="mt-0.5">{d.totalDeliveries} {t.deliveriesSuffix}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
