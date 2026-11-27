import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';
import { LOCALE_COOKIE } from '@/lib/i18n/translations';
import { planBelongsToMarket, planRequestQuote, resolveMarket } from '@/modules/merchant-subscriptions/market-pricing';
import { getMerchantPaymentGatewayStatus } from '@/modules/paymob-payments/market-payments.service';
import { getManualPaymentQuote, listActivePaymentAccounts } from '@/modules/subscription-payments/subscription-payments.service';
import { CheckoutPaymentPanel } from './checkout-payment-panel';
import { getSubscriptionCheckoutStatus } from '@/modules/subscription-payments/checkout-status.service';

export const dynamic = 'force-dynamic';

export default async function SubscriptionCheckoutPage({ searchParams }: { searchParams: Promise<{ request?: string; payment?: string }> }) {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');
  if (!['MERCHANT_OWNER', 'MERCHANT_ADMIN'].includes(session.user.role)) redirect('/dashboard/subscription');
  const merchantId = session.user.merchantId;
  const query = await searchParams;
  const requestId = query.request;
  if (!requestId || requestId.length > 180) notFound();
  const ar = (await cookies()).get(LOCALE_COOKIE)?.value !== 'en';
  const [request, merchant, gateway, status] = await Promise.all([
    prisma.merchantPlanChangeRequest.findFirst({ where: { id: requestId, merchantId }, include: { targetPlan: true } }),
    prisma.merchant.findUniqueOrThrow({ where: { id: merchantId }, select: { subscriptionMarket: true } }),
    getMerchantPaymentGatewayStatus(merchantId),
    getSubscriptionCheckoutStatus(merchantId, requestId),
  ]);
  if (!request || !planBelongsToMarket(request.targetPlan.code, resolveMarket(merchant.subscriptionMarket))) notFound();
  const quote = planRequestQuote(request);
  const manualQuote = await getManualPaymentQuote(merchantId, request.id);
  const accounts = manualQuote ? await listActivePaymentAccounts(manualQuote.currency) : [];
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
        <CheckoutPaymentPanel key={request.id} requestId={request.id} initial={status} locale={ar ? 'ar' : 'en'} onlineAvailable={gateway.enabled && gateway.configured} accounts={accounts} quote={manualQuote} returned={query.payment === 'returned'}/>
      </section>
    </div>
  </div>;
}
