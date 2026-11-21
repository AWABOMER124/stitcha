'use client';

import { useState, useTransition } from 'react';
import { requestPlanChangeAction } from '@/modules/merchant-subscriptions/actions';

export function UpgradeButton({ locale, planCode, planName, yearlyPrice, renewal = false }: { locale: 'ar' | 'en'; planCode: string; planName: string; yearlyPrice?: number | null; renewal?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  function requestUpgrade() {
    setMessage(null);
    startTransition(async () => {
      const result = await requestPlanChangeAction({ targetPlanCode: planCode, billingInterval });
      setMessage(result.success
        ? (locale === 'ar' ? 'تم تجهيز طلب الباقة. أكمل السداد من قسم الدفع.' : 'Plan requested. Continue in the payment section.')
        : result.error);
    });
  }

  return (
    <div>
      {yearlyPrice != null && <select aria-label={locale === 'ar' ? 'مدة الاشتراك' : 'Billing interval'} value={billingInterval} disabled={isPending} onChange={e => setBillingInterval(e.target.value as 'MONTHLY' | 'YEARLY')} className="mb-3 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
        <option value="MONTHLY">{locale === 'ar' ? 'شهري' : 'Monthly'}</option>
        <option value="YEARLY">{locale === 'ar' ? 'سنوي' : 'Yearly'}</option>
      </select>}
      <button
        type="button"
        onClick={requestUpgrade}
        disabled={isPending}
        className="min-h-11 w-full rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? (locale === 'ar' ? 'جارٍ الإرسال…' : 'Sending…')
          : renewal ? (locale === 'ar' ? `تجديد ${planName}` : `Renew ${planName}`) : (locale === 'ar' ? `اطلب الترقية إلى ${planName}` : `Request ${planName} upgrade`)}
      </button>
      {message && <p role="status" className="mt-3 text-sm text-[var(--muted-foreground)]">{message}</p>}
    </div>
  );
}
