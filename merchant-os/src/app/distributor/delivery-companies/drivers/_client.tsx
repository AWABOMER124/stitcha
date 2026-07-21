'use client';

import { useState, useTransition } from 'react';
import { assignDriverToDeliveryCompanyAction } from '@/modules/delivery-companies/actions';
import { useLocale } from '@/lib/i18n/context';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  deliveryCompanyId: string | null;
  deliveryCompany: { id: string; name: string } | null;
}

export interface Company {
  id: string;
  name: string;
}

export function DeliveryCompanyDriversClient({
  initialDrivers,
  companies,
}: {
  initialDrivers: Driver[];
  companies: Company[];
}) {
  const { dict } = useLocale();
  const t = dict.deliveryCompanyDriversPage;
  const [drivers, setDrivers] = useState(initialDrivers);
  const [isPending, startTransition] = useTransition();

  function handleAssign(driverId: string, deliveryCompanyId: string) {
    const value = deliveryCompanyId || null;
    startTransition(async () => {
      const res = await assignDriverToDeliveryCompanyAction(driverId, value);
      if (res.success) {
        const company = companies.find((c) => c.id === value) ?? null;
        setDrivers((prev) =>
          prev.map((d) => (d.id === driverId ? { ...d, deliveryCompanyId: value, deliveryCompany: company } : d)),
        );
      }
    });
  }

  if (drivers.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
        <p className="text-4xl mb-3">🏍️</p>
        <p className="font-semibold text-[var(--foreground)]">{t.empty}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
              <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colDriver}</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colPhone}</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-[var(--muted-foreground)]">{t.colCompany}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {drivers.map((d) => (
              <tr key={d.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-[var(--foreground)]">{d.name}</td>
                <td className="px-5 py-3.5 text-sm text-[var(--muted-foreground)]">{d.phone}</td>
                <td className="px-5 py-3.5">
                  <select
                    defaultValue={d.deliveryCompanyId ?? ''}
                    disabled={isPending}
                    onChange={(e) => handleAssign(d.id, e.target.value)}
                    className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs disabled:opacity-50"
                  >
                    <option value="">{t.internalOption}</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
