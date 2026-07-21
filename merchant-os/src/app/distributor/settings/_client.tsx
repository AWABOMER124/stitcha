'use client';

import { useState, useTransition } from 'react';
import { updateDistributorSettingsAction } from '@/modules/distributor-settings/actions';
import { useLocale } from '@/lib/i18n/context';

export interface DistributorSettings {
  name: string;
  phone: string | null;
  email: string | null;
  slug: string;
  status: string;
  commissionRate: number;
}

export function SettingsClient({ initialSettings }: { initialSettings: DistributorSettings | null }) {
  const { dict } = useLocale();
  const t = dict.distributorSettings;
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: initialSettings?.name ?? '',
    phone: initialSettings?.phone ?? '',
    email: initialSettings?.email ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    startTransition(async () => {
      const res = await updateDistributorSettingsAction({
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
      });
      if (res.success) setSaved(true);
      else setError(res.error);
    });
  }

  const statusLine = t.slugStatusLine
    .replace('{slug}', initialSettings?.slug ?? '')
    .replace('{status}', initialSettings?.status ?? '')
    .replace('{rate}', String(initialSettings?.commissionRate ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>

      <div className="max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🏢</span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{t.profile}</h3>
            <p className="text-xs text-[var(--muted-foreground)]">{statusLine}</p>
          </div>
        </div>

        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
        {saved && <div className="mb-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{t.saved}</div>}

        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.name}</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.phone}</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.email}</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
          </div>
          <button type="submit" disabled={isPending}
            className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors">
            {isPending ? t.saving : t.save}
          </button>
        </form>
      </div>
    </div>
  );
}
