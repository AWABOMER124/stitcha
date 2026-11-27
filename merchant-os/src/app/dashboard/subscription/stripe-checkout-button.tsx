'use client';

import { useRef, useState } from 'react';

export function StripeCheckoutButton({ locale, planChangeRequestId }: { planChangeRequestId?: string; locale: 'ar' | 'en' }) {
  const ar = locale === 'ar';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  async function start() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/subscriptions/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ planChangeRequestId }) });
      const payload = await response.json().catch(() => null) as { checkoutUrl?: string; error?: string } | null;
      if (!response.ok || !payload?.checkoutUrl) {
        setError(response.status === 429
          ? (ar ? 'محاولات كثيرة خلال وقت قصير. انتظر قليلًا ثم حاول مجددًا.' : 'Too many attempts. Please wait before trying again.')
          : (ar ? 'تعذر تجهيز صفحة الدفع الآن. اختيار الباقة محفوظ؛ راجع حالة الاشتراك قبل المحاولة مجددًا.' : 'Checkout is unavailable. Your plan selection is saved; check your subscription status before trying again.'));
        inFlight.current = false;
        setBusy(false);
        return;
      }
      window.location.assign(payload.checkoutUrl);
    } catch {
      // A dropped response is not proof that checkout creation failed. Never
      // retry this payment mutation automatically or expose transport errors.
      setError(ar ? 'انقطع الاتصال أثناء تجهيز الدفع. اختيارك محفوظ؛ راجع حالة الاشتراك قبل إعادة المحاولة.' : 'The connection was interrupted. Your selection is saved; check your subscription status before trying again.');
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <div>
    <button type="button" onClick={start} disabled={busy} aria-busy={busy} className="min-h-12 w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-bold text-white transition-opacity disabled:opacity-50">
      {busy ? (ar ? 'جارٍ تجهيز الدفع الآمن…' : 'Preparing secure checkout…') : (ar ? 'المتابعة إلى الدفع الآمن' : 'Continue to secure payment')}
    </button>
    {error && <p role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  </div>;
}
