'use client';

import { useState, useTransition } from 'react';
import { updateDriverAction, deleteDriverAction } from '@/modules/drivers/actions';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

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

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string | null;
  status: string;
  isActive: boolean;
  isVerified: boolean;
  rating: number | string;
  totalDeliveries: number;
  lastSeenAt: string | Date | null;
  _count?: { assignments: number };
}

export function DriversClient({ initialDrivers }: { initialDrivers: Driver[] }) {
  const { dict, locale } = useLocale();
  const t = dict.driversPage;
  const ds = dict.driverShared;
  const dateLocale = locale === 'ar' ? 'ar-SD' : 'en-US';
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');

  const filtered = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search),
  );

  function handleToggleActive(id: string, current: boolean) {
    startTransition(async () => {
      const res = await updateDriverAction(id, { isActive: !current });
      if (res.success) {
        setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, isActive: !current } : d)));
      }
    });
  }

  async function handleDelete(id: string, name: string) {
    const ok = await confirmDialog({ message: t.confirmDelete.replace('{name}', name), confirmLabel: t.delete, danger: true });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteDriverAction(id);
      if (res.success) setDrivers((prev) => prev.filter((d) => d.id !== id));
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder={t.searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
      />

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-4">🏍️</p>
          <p className="font-semibold text-[var(--foreground)]">{t.empty}</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t.emptySubtitle}</p>
          <Link
            href="/distributor/drivers/new"
            className="mt-4 inline-block rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
          >
            {t.addDriver}
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                {[t.colDriver, t.colVehicle, t.colStatus, t.colRating, t.colDeliveries, t.colLastActive, t.colActions].map((h) => (
                  <th key={h} className="py-3 px-4 text-right text-xs font-semibold text-[var(--muted-foreground)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((driver) => {
                const statusLabel = ds.statuses[driver.status as keyof typeof ds.statuses] ?? driver.status;
                const statusCls = STATUS_CLS[driver.status] ?? 'bg-stone-100 text-stone-600';
                const statusDot = STATUS_DOT[driver.status] ?? 'bg-stone-400';
                const lastSeen = driver.lastSeenAt
                  ? new Date(driver.lastSeenAt).toLocaleString(dateLocale, {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: 'short',
                    })
                  : t.unknown;

                return (
                  <tr
                    key={driver.id}
                    className={`hover:bg-[var(--muted)]/30 transition-colors ${!driver.isActive ? 'opacity-50' : ''}`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-sm font-bold text-[var(--primary)]">
                            {driver.name.charAt(0)}
                          </div>
                          <div
                            className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-[var(--card)] ${statusDot}`}
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">{driver.name}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{driver.phone}</p>
                        </div>
                        {driver.isVerified && <span className="text-blue-500 text-sm">✓</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--muted-foreground)]">
                      <div>
                        <p>{ds.vehicles[driver.vehicleType as keyof typeof ds.vehicles]}</p>
                        {driver.vehiclePlate && <p className="text-xs font-mono">{driver.vehiclePlate}</p>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusCls}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                        {statusLabel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-amber-400">★</span>
                        <span className="font-semibold">{Number(driver.rating).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-[var(--foreground)]">
                      {driver._count?.assignments ?? driver.totalDeliveries}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[var(--muted-foreground)]">{lastSeen}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/distributor/drivers/${driver.id}`}
                          className="text-xs font-medium text-[var(--primary)] hover:underline"
                        >
                          {t.view}
                        </Link>
                        <button
                          onClick={() => handleToggleActive(driver.id, driver.isActive)}
                          disabled={isPending}
                          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
                        >
                          {driver.isActive ? t.deactivate : t.activate}
                        </button>
                        <button
                          onClick={() => handleDelete(driver.id, driver.name)}
                          disabled={isPending}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          {t.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
