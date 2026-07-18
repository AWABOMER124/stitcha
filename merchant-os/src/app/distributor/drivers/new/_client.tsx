'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createDriverAction } from '@/modules/drivers/actions';
import { useLocale } from '@/lib/i18n/context';

export function NewDriverClient() {
  const { dict } = useLocale();
  const t = dict.newDriverPage;
  const ds = dict.driverShared;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    nationalId: '',
    vehicleType: 'MOTORCYCLE',
    vehiclePlate: '',
    notes: '',
  });

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await createDriverAction({
        name: form.name,
        phone: form.phone,
        nationalId: form.nationalId || undefined,
        vehicleType: form.vehicleType as 'MOTORCYCLE' | 'CAR' | 'BICYCLE' | 'VAN',
        vehiclePlate: form.vehiclePlate || undefined,
        notes: form.notes || undefined,
      });
      if (res.success) {
        router.push('/distributor/drivers');
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      {error && (
        <div className="mb-5 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.fullNameLabel}</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              placeholder={t.fullNamePlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.phoneLabel}</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              placeholder="0912345678"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.nationalIdLabel}</label>
            <input
              type="text"
              value={form.nationalId}
              onChange={(e) => set('nationalId', e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              placeholder={t.nationalIdPlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.vehicleTypeLabel}</label>
            <select
              value={form.vehicleType}
              onChange={(e) => set('vehicleType', e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            >
              {Object.entries(ds.vehicles).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{dict.driverProfilePage.plateLabel}</label>
            <input
              type="text"
              value={form.vehiclePlate}
              onChange={(e) => set('vehiclePlate', e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              placeholder={t.platePlaceholder}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.notesLabel}</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none"
              placeholder={t.notesPlaceholder}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-lg bg-[var(--primary)] py-3 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? t.saving : t.submit}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-lg border border-[var(--border)] py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            {t.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
