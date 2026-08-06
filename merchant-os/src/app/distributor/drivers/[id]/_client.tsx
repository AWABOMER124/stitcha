'use client';

import { useState, useTransition } from 'react';
import { updateDriverAction } from '@/modules/drivers/actions';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/toast';

export interface Assignment {
  id: string;
  orderId: string;
  assignedAt: string | Date;
  deliveredAt: string | Date | null;
}

export interface Earning {
  id: string;
  type: string;
  description: string | null;
  amount: number | string;
  currency: string;
  createdAt: string | Date;
}

export interface DriverProfile {
  id: string;
  isVerified: boolean;
  isActive: boolean;
  locationToken: string;
  assignments?: Assignment[];
  earnings?: Earning[];
}

export function DriverProfileClient({ driver }: { driver: DriverProfile }) {
  const { dict, locale } = useLocale();
  const t = dict.driverProfilePage;
  const dateLocale = locale === 'ar' ? 'ar-SD' : 'en-US';
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  function handleVerify() {
    startTransition(async () => {
      const res = await updateDriverAction(driver.id, { isVerified: !driver.isVerified });
      if (res.success) router.refresh();
      else toast.error(res.error);
    });
  }

  function handleToggleActive() {
    startTransition(async () => {
      const res = await updateDriverAction(driver.id, { isActive: !driver.isActive });
      if (res.success) router.refresh();
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <LocationTokenCard token={driver.locationToken} t={t} />

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
            {(driver.assignments ?? []).slice(0, 10).map((a) => (
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
            {(driver.earnings ?? []).map((e) => (
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

function LocationTokenCard({ token, t }: { token: string; t: ReturnType<typeof useLocale>['dict']['driverProfilePage'] }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the token is still visible in the input for manual copy.
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h3 className="font-bold text-[var(--foreground)] mb-1">{t.locationTokenTitle}</h3>
      <p className="text-xs text-[var(--muted-foreground)] mb-3">{t.locationTokenDesc}</p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={token}
          onFocus={(e) => e.target.select()}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs font-mono text-[var(--foreground)] outline-none"
          dir="ltr"
        />
        <button
          onClick={handleCopy}
          className="whitespace-nowrap rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--primary)]/90 transition-colors"
        >
          {copied ? t.locationTokenCopied : t.locationTokenCopy}
        </button>
      </div>
    </div>
  );
}
