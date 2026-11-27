'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionCheckoutStatus } from '@/modules/subscription-payments/checkout-status.service';
import { ManualPaymentForm, type ManualPaymentAccountOption, type ManualPaymentQuote } from '../manual-payment-form';
import { StripeCheckoutButton } from '../stripe-checkout-button';

export function CheckoutPaymentPanel({ requestId, initial, locale, onlineAvailable, accounts, quote, returned }: {
  requestId: string; initial: SubscriptionCheckoutStatus; locale: 'ar' | 'en'; onlineAvailable: boolean;
  accounts: ManualPaymentAccountOption[]; quote: ManualPaymentQuote | null; returned: boolean;
}) {
  const ar = locale === 'ar'; const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [method, setMethod] = useState<'online' | 'transfer'>(onlineAvailable ? 'online' : 'transfer');
  const [checking, setChecking] = useState(false); const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false); const active = useRef(false);
  const check = useCallback(async () => {
    if (active.current) return; active.current = true; setChecking(true);
    try {
      const response = await fetch('/api/subscriptions/payment-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId }), cache: 'no-store' });
      if (!response.ok) throw new Error();
      setStatus(await response.json() as SubscriptionCheckoutStatus); setError('');
    } catch { setError(ar ? 'تعذر تحديث الحالة الآن. طلبك محفوظ وسنواصل التحقق؛ لا يلزم دفع جديد.' : 'Status is temporarily unavailable. Your request is saved; do not pay again.'); }
    finally { active.current = false; setChecking(false); }
  }, [requestId, ar]);
  useEffect(() => {
    if (!['CHECKING', 'AWAITING_PAYMENT', 'MANUAL_REVIEW'].includes(status.state)) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void check(); }, 15000);
    return () => clearInterval(timer);
  }, [check, status.state]);
  useEffect(() => {
    if (!returned && initial.state !== 'CHECKING') return;
    const firstCheck = setTimeout(() => void check(), 0);
    return () => clearTimeout(firstCheck);
  }, [check, returned, initial.state]);
  async function retry() {
    if (retrying) return; setRetrying(true); setError('');
    try {
      const response = await fetch('/api/subscriptions/payment-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, action: 'retry' }) });
      const result = await response.json();
      if (!response.ok || !result.checkoutPath) throw new Error();
      router.replace(result.checkoutPath);
    } catch { setError(ar ? 'تعذر فتح محاولة جديدة. حدّث حالة العملية أولًا.' : 'Could not start a new attempt. Check the payment status first.'); setRetrying(false); }
  }
  const copy = {
    ACTIVE: ar ? ['تم الدفع وتفعيل باقتك', 'اشتراكك جاهز الآن. يمكنك البدء باستخدام مزايا باقتك.'] : ['Payment confirmed. Your plan is active.', 'Your subscription is ready to use.'],
    MANUAL_REVIEW: ar ? ['تم استلام إشعار التحويل', 'يراجع فريق وصلة وصول الحوالة. تُفعّل الباقة بعد الموافقة، وستتحدث الحالة هنا تلقائيًا. لا تحول المبلغ مرة أخرى.'] : ['Transfer receipt received', 'Our team will verify the transfer and activate your plan. This page updates automatically. Do not transfer again.'],
    NOT_COMPLETED: ar ? ['لم تكتمل عملية الاشتراك', 'لم تُفعّل الباقة. يمكنك إعادة المحاولة أو اختيار التحويل البنكي.'] : ['Subscription not completed', 'Your plan was not activated. Retry or choose bank transfer.'],
    CHECKING: ar ? ['نتحقق من نتيجة الدفع', 'نتابع التأكيد تلقائيًا. يمكنك متابعة عملك والعودة هنا؛ باقتك تتفعل فور تأكيد السداد. لا تدفع مرة ثانية أثناء التحقق.'] : ['Checking your payment', 'We are checking automatically. You can leave and return; your plan activates once payment is confirmed. Do not pay again.'],
    AWAITING_PAYMENT: ar ? ['بانتظار إتمام الدفع', 'أكمل السداد من صفحة الدفع الآمنة. بعد العودة، نتابع التأكيد ونفعّل الباقة تلقائيًا.'] : ['Awaiting payment', 'Complete secure checkout. We will confirm payment and activate your plan automatically.'],
    CHOOSE: ar ? ['اختر طريقة السداد', 'دفع إلكتروني بتفعيل تلقائي، أو تحويل بنكي يُراجع بواسطة فريق وصلة.'] : ['Choose a payment method', 'Automatic activation for online payment, or a bank transfer reviewed by our team.'],
  }[status.state];
  return <div className="space-y-5">
    <div role="status" aria-live="polite" className={`rounded-2xl p-5 ${status.state === 'ACTIVE' ? 'bg-emerald-50 text-emerald-900' : status.state === 'NOT_COMPLETED' ? 'bg-red-50 text-red-900' : 'bg-[var(--muted)]'}`}>
      <div className="flex items-center gap-3"><span aria-hidden className="text-2xl">{status.state === 'ACTIVE' ? '✓' : status.state === 'NOT_COMPLETED' ? '!' : status.state === 'CHOOSE' ? '◈' : '◷'}</span><h3 className="text-lg font-bold">{status.state === 'AWAITING_PAYMENT' && status.reason ? (ar ? 'لم تكتمل محاولة الدفع' : 'Payment was not completed') : copy[0]}</h3></div>
      <p className="mt-3 text-sm leading-7">{copy[1]}</p>
      {status.reason && <p className="mt-2 text-sm">{status.reason}</p>}
      {status.needsReview && <p className="mt-3 text-sm leading-7">{ar ? 'استغرق التأكيد وقتًا أطول من المعتاد. العملية ظاهرة لفريق المراجعة، واختيار الباقة محفوظ.' : 'Confirmation is taking longer than usual. Your payment is visible to our review team and your selection is saved.'}</p>}
    </div>
    {status.checkoutPath && <Link href={status.checkoutPath} className="block rounded-xl border border-[var(--primary)] p-3 text-center font-bold text-[var(--primary)]">{ar ? 'متابعة عملية الدفع القائمة' : 'View your existing payment'}</Link>}
    {status.state === 'ACTIVE' && <Link href="/dashboard" className="block rounded-xl bg-[var(--primary)] p-3 text-center font-bold text-white">{ar ? 'الانتقال إلى متجري' : 'Go to my dashboard'}</Link>}
    {['CHOOSE', 'NOT_COMPLETED'].includes(status.state) && <Link href="/dashboard/subscription" className="block rounded-xl border border-[var(--border)] p-3 text-center font-bold">{ar ? 'تغيير الباقة أو مدة الاشتراك' : 'Change plan or billing interval'}</Link>}
    {status.state === 'NOT_COMPLETED' && status.canRetry && <button disabled={retrying} onClick={retry} className="w-full rounded-xl bg-[var(--primary)] p-3 font-bold text-white disabled:opacity-50">{retrying ? (ar ? 'جارٍ التجهيز…' : 'Preparing…') : (ar ? 'إعادة المحاولة واختيار طريقة الدفع' : 'Retry and choose payment method')}</button>}
    {status.state === 'CHOOSE' && <>
      <div className="grid grid-cols-2 gap-3" aria-label={ar ? 'طريقة الدفع' : 'Payment method'}>{(['online', 'transfer'] as const).map(option => <button key={option} type="button" onClick={() => setMethod(option)} aria-pressed={method === option} className={`min-h-16 rounded-xl border p-3 text-sm font-bold ${method === option ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]' : 'border-[var(--border)]'}`}>{option === 'online' ? (ar ? 'الدفع الإلكتروني' : 'Online payment') : (ar ? 'التحويل البنكي' : 'Bank transfer')}</button>)}</div>
      {method === 'online' ? <div className="space-y-3"><p className="text-sm leading-7 text-[var(--muted-foreground)]">{ar ? 'تُفعّل الباقة تلقائيًا بعد تأكيد الدفع. لا تحتاج لرفع إيصال.' : 'Your plan activates after payment is confirmed. No receipt upload needed.'}</p>{onlineAvailable ? <StripeCheckoutButton locale={locale} planChangeRequestId={requestId} onUncertain={check}/> : <p role="status" className="text-sm">{ar ? 'الدفع الإلكتروني غير متاح حاليًا. اختر التحويل البنكي.' : 'Online payment is unavailable. Choose bank transfer.'}</p>}</div>
        : <div className="space-y-4"><p className="text-sm leading-7 text-[var(--muted-foreground)]">{ar ? 'حوّل المبلغ إلى الحساب الموضح، وأرفق إشعار العملية. يفعّل الأدمن الباقة بعد مطابقة وصول الحوالة.' : 'Transfer the amount to the account below and attach your receipt. Our team activates your plan after verifying receipt of funds.'}</p><ManualPaymentForm accounts={accounts} quote={quote} locale={locale} planChangeRequestId={requestId} onSubmitted={check}/></div>}
    </>}
    {status.state === 'AWAITING_PAYMENT' && <StripeCheckoutButton locale={locale} planChangeRequestId={requestId} onUncertain={check}/>}
    {['CHECKING', 'AWAITING_PAYMENT', 'MANUAL_REVIEW'].includes(status.state) && <button type="button" disabled={checking} onClick={check} className="min-h-11 w-full rounded-xl border border-[var(--border)] p-3 text-sm font-bold disabled:opacity-50">{checking ? (ar ? 'جارٍ تحديث الحالة…' : 'Updating…') : (ar ? 'تحديث حالة العملية' : 'Refresh payment status')}</button>}
    {status.needsReview && <Link href="/dashboard/complaints" className="inline-flex min-h-11 items-center text-sm font-bold text-[var(--primary)]">{ar ? 'التواصل مع الدعم' : 'Contact support'}</Link>}
    {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">{error}</p>}
  </div>;
}
