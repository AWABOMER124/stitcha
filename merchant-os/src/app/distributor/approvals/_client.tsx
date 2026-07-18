'use client';

import { useState, useTransition } from 'react';
import { useLocale } from '@/lib/i18n/context';

interface PendingMerchant {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  storeType: string;
  createdAt: string;
  isExpired: boolean;
}

const STORE_TYPE_LABELS: Record<string, string> = {
  FOOD_MENU: 'Food Menu',
  ONLINE_STORE: 'Online Store',
  SERVICES: 'Services',
  BOOKING: 'Booking',
  OTHER: 'Other',
};

export function ApprovalsClient({ initialMerchants }: { initialMerchants: PendingMerchant[] }) {
  const { dict, locale } = useLocale();
  const t = dict.approvals;
  const [merchants, setMerchants] = useState(initialMerchants);
  const [isPending, startTransition] = useTransition();
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  function resend(id: string) {
    setResendingId(id);
    setMessage(null);
    startTransition(async () => {
      const res = await fetch(`/api/distributor/merchants/${id}/resend-invite`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMerchants((list) => list.map((m) => (m.id === id ? { ...m, isExpired: false } : m)));
        setMessage({ id, text: t.resendSuccess, ok: true });
      } else {
        setMessage({ id, text: data.error ?? t.resendFailed, ok: false });
      }
      setResendingId(null);
    });
  }

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
    </div>
  );

  if (merchants.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-[var(--muted-foreground)]">{t.empty}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">{t.colMerchant}</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">{t.colStoreType}</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">{t.colContact}</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">{t.colInviteStatus}</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">{t.colApplied}</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">{t.colAction}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {merchants.map((m) => (
              <tr key={m.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--foreground)]">{m.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{m.slug}</p>
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)]">
                  {STORE_TYPE_LABELS[m.storeType] ?? m.storeType}
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)]">{m.phone ?? m.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.isExpired
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                  }`}>
                    {m.isExpired ? t.inviteExpired : t.inviteAwaiting}
                  </span>
                  {message?.id === m.id && (
                    <p className={`text-xs mt-1 ${message.ok ? 'text-emerald-600' : 'text-red-600'}`}>{message.text}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--muted-foreground)]">
                  {new Date(m.createdAt).toLocaleDateString(locale)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => resend(m.id)}
                    disabled={isPending && resendingId === m.id}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50 transition-colors"
                  >
                    {isPending && resendingId === m.id ? t.resending : t.resendInvite}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
