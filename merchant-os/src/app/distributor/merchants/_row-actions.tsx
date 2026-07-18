'use client';

import { useState, useTransition } from 'react';
import { assignDeliveryCompanyToMerchantAction } from '@/modules/delivery-companies/actions';
import { useLocale } from '@/lib/i18n/context';

interface DeliveryCompany {
  id: string;
  name: string;
}

export function DeliveryCompanySelect({
  merchantId,
  preferredDeliveryCompanyId,
  deliveryCompanies,
}: {
  merchantId: string;
  preferredDeliveryCompanyId: string | null;
  deliveryCompanies: DeliveryCompany[];
}) {
  const { dict } = useLocale();
  const t = dict.distributorMerchantsPage;
  const [value, setValue] = useState(preferredDeliveryCompanyId ?? '');
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    setValue(next);
    startTransition(async () => {
      await assignDeliveryCompanyToMerchantAction(merchantId, next || null);
    });
  }

  return (
    <select
      value={value}
      disabled={isPending}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs disabled:opacity-50"
    >
      <option value="">{t.none}</option>
      {deliveryCompanies.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}

const NEXT_STATUS: Record<string, string> = {
  ACTIVE: 'SUSPENDED',
  SUSPENDED: 'ACTIVE',
  PENDING: 'ACTIVE',
  CLOSED: 'ACTIVE',
};

export function StatusToggle({ merchantId, status }: { merchantId: string; status: string }) {
  const { dict } = useLocale();
  const t = dict.distributorMerchantsPage;
  const [current, setCurrent] = useState(status);
  const [isPending, startTransition] = useTransition();

  const ACTION_LABEL: Record<string, string> = {
    ACTIVE: t.suspend,
    SUSPENDED: t.activate,
    PENDING: t.approve,
    CLOSED: t.reactivate,
  };

  function handleToggle() {
    const next = NEXT_STATUS[current] ?? 'ACTIVE';
    if (next === 'SUSPENDED' && !confirm(t.confirmSuspend)) return;

    startTransition(async () => {
      const res = await fetch(`/api/distributor/merchants/${merchantId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) setCurrent(next);
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
    >
      {isPending ? '...' : ACTION_LABEL[current] ?? t.activate}
    </button>
  );
}
