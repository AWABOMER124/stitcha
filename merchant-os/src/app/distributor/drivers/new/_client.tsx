'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createDriverAction } from '@/modules/drivers/actions';
import { VEHICLE_LABELS } from '@/modules/drivers/types';

export function NewDriverClient() {
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
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">الاسم الكامل *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              placeholder="محمد أحمد"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">رقم الهاتف *</label>
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
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">الرقم الوطني</label>
            <input
              type="text"
              value={form.nationalId}
              onChange={(e) => set('nationalId', e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              placeholder="اختياري"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">نوع المركبة *</label>
            <select
              value={form.vehicleType}
              onChange={(e) => set('vehicleType', e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            >
              {Object.entries(VEHICLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">رقم اللوحة</label>
            <input
              type="text"
              value={form.vehiclePlate}
              onChange={(e) => set('vehiclePlate', e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              placeholder="ABC 1234"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none"
              placeholder="أي ملاحظات اختيارية..."
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-lg bg-[var(--primary)] py-3 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'جاري الحفظ...' : 'إضافة السائق'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-lg border border-[var(--border)] py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
