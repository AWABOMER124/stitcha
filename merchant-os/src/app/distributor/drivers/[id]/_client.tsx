'use client';

import { useTransition } from 'react';
import { updateDriverAction } from '@/modules/drivers/actions';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/context';

export function DriverProfileClient({ driver }: { driver: any }) {
  const { dict, locale } = useLocale();
  const t = dict.driverProfilePage;
  const dateLocale = locale === 'ar' ? 'ar-SD' : 'en-US';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleVerify() {
    startTransition(async () => {
      const res = await updateDriverAction(driver.id, { isVerified: !driver.isVerified });
      if (res.success) router.refresh();
      else alert(res.error);
    });
  }

  function handleToggleActive() {
    startTransition(async () => {
      const res = await updateDriverAction(driver.id, { isActive: !driver.isActive });
      if (res.success) router.refresh();
      else alert(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h3 className="font-bold text-[var(--foreground)] mb-4">{t.quickActionsTitle}</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleVerify}
            disabled={isPending}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              driver.isVerified
                ? 'border-stone-200 text-stone-600 hover:bg-stone-50'
                : 'border-blue-200 text-blue-600 hover:bg-blue-50'
            }`}
          >
            {driver.isVerified ? t.unverify : t.verify}
          </button>
          <button
            onClick={handleToggleActive}
            disabled={isPending}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              driver.isActive
                ? 'border-red-200 text-red-600 hover:bg-red-50'
                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            {driver.isActive ? t.deactivate : t.activate}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="font-bold text-[var(--foreground)]">{t.recentDeliveriesTitle}</h3>
        </div>
        {!driver.assignments || driver.assignments.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">{t.noDeliveries}</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {(driver.assignments as any[]).slice(0, 10).map((a: any) => (
              <div key={a.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono font-bold text-[var(--foreground)]">{t.orderPrefix}{a.orderId.slice(-8)}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {new Date(a.assignedAt).toLocaleString(dateLocale, {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    a.deliveredAt ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {a.deliveredAt ? t.delivered : t.inProgress}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {driver.earnings && driver.earnings.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-bold text-[var(--foreground)]">{t.recentEarningsTitle}</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {(driver.earnings as any[]).map((e: any) => (
              <div key={e.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{e.description ?? e.type}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {new Date(e.createdAt).toLocaleDateString(dateLocale)}
                  </p>
                </div>
                <span
                  className={`font-mono font-bold text-sm ${
                    Number(e.amount) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {Number(e.amount) >= 0 ? '+' : ''}
                  {Number(e.amount).toFixed(2)} {e.currency}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
