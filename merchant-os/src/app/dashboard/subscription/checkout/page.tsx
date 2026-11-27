import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';
import { LOCALE_COOKIE } from '@/lib/i18n/translations';
import { planBelongsToMarket, planRequestQuote, resolveMarket } from '@/modules/merchant-subscriptions/market-pricing';
import { getMerchantPaymentGatewayStatus } from '@/modules/paymob-payments/market-payments.service';
import { getManualPaymentQuote, listActivePaymentAccounts } from '@/modules/subscription-payments/subscription-payments.service';
import { StripeCheckoutButton } from '../stripe-checkout-button';
import { ManualPaymentForm } from '../manual-payment-form';

export const dynamic = 'force-dynamic';

export default async function SubscriptionCheckoutPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');
  if (!['MERCHANT_OWNER', 'MERCHANT_ADMIN'].includes(session.user.role)) redirect('/dashboard/subscription');
  const merchantId = session.user.merchantId;
  const { request: requestId } = await searchParams;
  if (!requestId || requestId.length > 180) notFound();
  const ar = (await cookies()).get(LOCALE_COOKIE)?.value !== 'en';
  const [request, merchant, gateway, payment, attempt] = await Promise.all([
    prisma.merchantPlanChangeRequest.findFirst({ where: { id: requestId, merchantId }, include: { targetPlan: true } }),
    prisma.merchant.findUniqueOrThrow({ where: { id: merchantId }, select: { subscriptionMarket: true } }),
    getMerchantPaymentGatewayStatus(merchantId),
    prisma.merchantSubscriptionPayment.findFirst({ where: { merchantId, OR: [{ planChangeRequestId: requestId, status: 'VERIFIED' }, { provider: 'manual', status: 'PENDING' }] }, select: { status: true } }),
    prisma.onlineCheckoutAttempt.findUnique({ where: { provider_purpose_referenceId: { provider: 'paymob', purpose: 'SUBSCRIPTION', referenceId: requestId } }, select: { merchantId: true, status: true } }),
  ]);
  if (!request || !planBelongsToMarket(request.targetPlan.code, resolveMarket(merchant.subscriptionMarket))) notFound();
  if (!['PENDING', 'CONTACTED'].includes(request.status)) redirect('/dashboard/subscription');
  const quote = planRequestQuote(request);
  const paymentUnconfirmed = attempt?.merchantId === merchantId && ['CREATING', 'UNKNOWN'].includes(attempt.status);
  const [manualQuote, accounts] = payment || paymentUnconfirmed ? [null, []] : await Promise.all([getManualPaymentQuote(merchantId, request.id), listActivePaymentAccounts()]);
  const names: Record<string, string> = { GROWTH: 'نمو', PRO: 'احترافي', BUSINESS: 'أعمال' };
  const name = ar ? names[request.targetPlan.code.replace(/^SA_/, '')] ?? request.targetPlan.name : request.targetPlan.name;

  return <div className="mx-auto max-w-4xl space-y-6">
    <Link href="/dashboard/subscription" className="inline-flex min-h-11 items-center text-sm font-bold text-[var(--primary)]">{ar ? '← العودة إلى الباقات' : '← Back to plans'}</Link>
    <header><p className="text-sm font-semibold text-[var(--primary)]">{ar ? 'اشتراك وصلة' : 'WASLA subscription'}</p><h1 className="mt-2 text-3xl font-black">{ar ? 'إتمام الاشتراك' : 'Complete your subscription'}</h1></header>
    <div className="grid items-start gap-6 md:grid-cols-[1fr_1.2fr]">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6" aria-labelledby="checkout-summary">
        <h2 id="checkout-summary" className="text-lg font-bold">{ar ? 'ملخص اشتراكك' : 'Your subscription'}</h2>
        <p className="mt-5 text-2xl font-black">{name}</p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{quote.billingInterval === 'YEARLY' ? (ar ? 'اشتراك سنوي · 12 شهرًا' : 'Annual subscription · 12 months') : (ar ? 'اشتراك شهري' : 'Monthly subscription')}</p>
        <dl className="mt-6 border-t border-[var(--border)] pt-5"><div className="flex items-center justify-between gap-3"><dt className="font-semibold">{ar ? 'المبلغ المستحق' : 'Total due'}</dt><dd className="text-2xl font-black" dir="ltr">{quote.amount.toLocaleString(ar ? 'ar-SA' : 'en-GB')} {quote.currency}</dd></div></dl>
        <p className="mt-5 text-sm leading-6 text-[var(--muted-foreground)]">{ar ? 'رسوم الشحن والتحصيل منفصلة عن اشتراك المنصة.' : 'Shipping and collection fees are separate from your subscription.'}</p>
        {gateway.provider === 'PAYMOB' && <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{ar ? 'تدفع للفترة المختارة، دون خصم تجديد تلقائي.' : 'Prepaid for the selected period, with no automatic renewal charge.'}</p>}
      </section>
      <section className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6" aria-labelledby="checkout-payment">
        <h2 id="checkout-payment" className="text-lg font-bold">{ar ? 'طريقة الدفع' : 'Payment method'}</h2>
        {payment || paymentUnconfirmed ? <div role="status" className="space-y-3 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-900"><p>{payment?.status === 'VERIFIED'
          ? (ar ? 'تم تأكيد السداد. راجع صفحة الاشتراك للاطلاع على حالة التفعيل.' : 'Payment is confirmed. View your subscription for activation status.')
          : payment ? (ar ? 'إيصال التحويل مسجّل وقيد المراجعة. تظهر باقتك بعد تأكيد السداد.' : 'Your transfer receipt is under review. Your plan activates after payment confirmation.')
          : (ar ? 'نتيجة محاولة الدفع السابقة قيد التحقق. اختيارك محفوظ، ولن نبدأ محاولة أخرى أو تحويلاً إضافيًا حتى تتأكد النتيجة.' : 'Your previous payment attempt is being checked. Your selection is saved; no additional checkout or transfer will start until the result is confirmed.')}</p><Link href="/dashboard/subscription" className="inline-flex min-h-11 items-center font-bold underline">{ar ? 'عرض حالة الاشتراك' : 'View subscription status'}</Link>{paymentUnconfirmed && <Link href="/dashboard/complaints" className="ms-4 inline-flex min-h-11 items-center font-bold underline">{ar ? 'طلب المساعدة' : 'Get help'}</Link>}</div> : <>
          <div className="rounded-xl border border-[var(--border)] p-4"><h3 className="font-bold">{ar ? 'الدفع الإلكتروني الآمن' : 'Secure online payment'}</h3><p className="my-3 text-sm leading-6 text-[var(--muted-foreground)]">{ar ? 'تُفعّل باقتك تلقائيًا بعد تأكيد السداد. ستنتقل إلى صفحة دفع آمنة لإتمام العملية.' : 'Your plan activates after payment confirmation. Continue to a secure checkout to complete payment.'}</p>
            {gateway.enabled && gateway.configured ? <StripeCheckoutButton locale={ar ? 'ar' : 'en'} planChangeRequestId={request.id}/> : <p role="status" className="rounded-xl bg-[var(--muted)] p-4 text-sm leading-6">{ar ? (gateway.provider === 'PAYMOB' ? 'الدفع الإلكتروني غير متاح مؤقتًا. يرجى المحاولة لاحقًا.' : 'الدفع الإلكتروني غير متاح حاليًا. يمكنك استخدام التحويل البنكي أدناه.') : 'Online payment is currently unavailable.'}</p>}
          </div>
          {manualQuote && <details className="rounded-xl border border-[var(--border)] p-4" open={!gateway.enabled || !gateway.configured}><summary className="cursor-pointer font-bold">{ar ? 'التحويل البنكي' : 'Bank transfer'}</summary><div className="mt-4"><ManualPaymentForm accounts={accounts} quote={manualQuote} locale={ar ? 'ar' : 'en'} planChangeRequestId={request.id}/></div></details>}
        </>}
      </section>
    </div>
  </div>;
}
