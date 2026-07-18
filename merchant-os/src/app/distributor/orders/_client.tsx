'use client';

import { useState, useTransition } from 'react';
import { assignOrderDeliveryCompanyAction } from '@/modules/orders/actions';
import { useLocale } from '@/lib/i18n/context';

interface Company {
  id: string;
  name: string;
}

export function OrderDeliveryCompanySelect({
  orderId,
  currentDeliveryCompanyId,
  companies,
}: {
  orderId: string;
  currentDeliveryCompanyId: string | null;
  companies: Company[];
}) {
  const { dict } = useLocale();
  const t = dict.distributorOrdersPage;
  const [value, setValue] = useState(currentDeliveryCompanyId ?? '');
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    setValue(next);
    startTransition(async () => {
      await assignOrderDeliveryCompanyAction(orderId, next || null);
    });
  }

  return (
    <select
      value={value}
      disabled={isPending}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs disabled:opacity-50"
    >
      <option value="">{t.ownDriversOption}</option>
      {companies.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
