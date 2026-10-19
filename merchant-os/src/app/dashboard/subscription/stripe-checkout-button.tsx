'use client';

import { useState } from 'react';

export function StripeCheckoutButton({ locale }: { locale: 'ar' | 'en' }) {
  const ar = locale === 'ar';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/subscriptions/stripe-checkout', { method: 'POST' });
      const payload = await response.json() as { checkoutUrl?: string; error?: string };
      if (!response.ok || !payload.checkoutUrl) throw new Error(payload.error || (ar ? 'تعذر بدء الدفع' : 'Could not start payment'));
      window.location.assign(payload.checkoutUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (ar ? 'تعذر بدء الدفع' : 'Could not start payment'));
      setBusy(false);
    }
  }

  return <div>
    <button type="button" onClick={start} disabled={busy} className="w-full rounded-xl bg-[#635bff] px-4 py-3 font-bold text-white disabled:opacity-50">
      {busy ? (ar ? 'جارٍ فتح Stripe…' : 'Opening Stripe…') : (ar ? 'الدفع الآمن عبر Stripe' : 'Pay securely with Stripe')}
    </button>
    {error && <p role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  </div>;
}
