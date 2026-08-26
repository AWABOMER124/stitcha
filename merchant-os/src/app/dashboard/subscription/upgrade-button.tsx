'use client';

import { useState, useTransition } from 'react';
import { requestPlanChangeAction } from '@/modules/merchant-subscriptions/actions';

export function UpgradeButton({ locale }: { locale: 'ar' | 'en' }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function requestUpgrade() {
    setMessage(null);
    startTransition(async () => {
      const result = await requestPlanChangeAction({ targetPlanCode: 'PRO' });
      setMessage(result.success
        ? (locale === 'ar' ? 'تم إرسال طلب الترقية. سيتواصل معك فريق وصلك.' : 'Upgrade request sent. The Waslak team will contact you.')
        : result.error);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={requestUpgrade}
        disabled={isPending}
        className="min-h-11 w-full rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? (locale === 'ar' ? 'جارٍ الإرسال…' : 'Sending…')
          : (locale === 'ar' ? 'اطلب الترقية إلى Pro' : 'Request Pro upgrade')}
      </button>
      {message && <p role="status" className="mt-3 text-sm text-[var(--muted-foreground)]">{message}</p>}
    </div>
  );
}
