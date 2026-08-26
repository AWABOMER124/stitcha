import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { LOCALE_COOKIE } from '@/lib/i18n/translations';
import {
  getMerchantPlanSnapshot,
  getPendingPlanChangeRequest,
  listPublicPlans,
} from '@/modules/merchant-subscriptions';
import { UpgradeButton } from './upgrade-button';
import { ManualPaymentForm } from './manual-payment-form';
import { listActivePaymentAccounts, listMerchantPayments } from '@/modules/subscription-payments/subscription-payments.service';

export const dynamic = 'force-dynamic';

const FEATURES = [
  ['maxActiveProducts', 'المنتجات النشطة', 'Active products'],
  ['maxStaffUsers', 'حسابات الفريق', 'Staff seats'],
  ['maxBranches', 'الفروع', 'Branches'],
  ['advancedAnalytics', 'التحليلات المتقدمة', 'Advanced analytics'],
  ['crmAutomation', 'أتمتة العملاء', 'CRM automation'],
  ['customDomain', 'نطاق مخصص', 'Custom domain'],
  ['dataExport', 'تصدير البيانات', 'Data export'],
] as const;

export default async function SubscriptionPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');
  const locale = (await cookies()).get(LOCALE_COOKIE)?.value === 'en' ? 'en' : 'ar';
  const [current, plans, pending, paymentAccounts, payments] = await Promise.all([
    getMerchantPlanSnapshot(session.user.merchantId),
    listPublicPlans(),
    getPendingPlanChangeRequest(session.user.merchantId),
    listActivePaymentAccounts(),
    listMerchantPayments(session.user.merchantId),
  ]);
  const ar = locale === 'ar';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-black text-[var(--foreground)]">{ar ? 'الاشتراك والباقات' : 'Plan & billing'}</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {ar ? 'ابدأ مجاناً، وطوّر أدوات متجرك عندما يحتاج نشاطك.' : 'Start free and upgrade your tools when the business needs them.'}
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5" aria-labelledby="current-plan-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p id="current-plan-title" className="text-sm text-[var(--muted-foreground)]">{ar ? 'باقتك الحالية' : 'Current plan'}</p>
            <p className="mt-1 text-xl font-black text-[var(--foreground)]">{displayPlanName(current.code, current.name, ar)}</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">
            {current.isGrandfathered ? (ar ? 'محفوظة دون رسوم مؤقتاً' : 'Grandfathered at no charge') : (ar ? 'نشطة' : 'Active')}
          </span>
        </div>
        {pending && (
          <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            {ar
              ? `طلب الترقية إلى ${displayPlanName(pending.targetPlan.code, pending.targetPlan.name, ar)} قيد المراجعة.`
              : `Your ${displayPlanName(pending.targetPlan.code, pending.targetPlan.name, ar)} upgrade request is under review.`}
          </p>
        )}
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {plans.map((plan) => {
          const selected = plan.code === current.code;
          return (
            <section key={plan.code} className={`rounded-2xl border bg-[var(--card)] p-6 ${plan.code === 'PRO' ? 'border-[var(--primary)] shadow-sm' : 'border-[var(--border)]'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[var(--foreground)]">{displayPlanName(plan.code, plan.name, ar)}</h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{plan.description}</p>
                </div>
                {selected && <span className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-bold">{ar ? 'الحالية' : 'Current'}</span>}
              </div>
              <p className="my-5 text-3xl font-black text-[var(--foreground)]">
                {plan.monthlyPrice === 0 ? (ar ? 'مجانية' : 'Free') : `$${plan.monthlyPrice}`}
                {plan.monthlyPrice > 0 && <span className="text-sm font-medium text-[var(--muted-foreground)]">/{ar ? 'شهر' : 'month'}</span>}
              </p>
              <ul className="mb-6 space-y-3">
                {FEATURES.map(([key, arLabel, enLabel]) => (
                  <li key={key} className="flex items-center justify-between gap-3 text-sm">
                    <span>{ar ? arLabel : enLabel}</span>
                    <strong>{formatFeature(plan.entitlements[key], ar)}</strong>
                  </li>
                ))}
              </ul>
              {plan.code === 'PRO' && !selected && !pending && <UpgradeButton locale={locale} />}
            </section>
          );
        })}
      </div>

      {pending && !payments.some(payment => payment.status === 'PENDING' || payment.status === 'VERIFIED') && <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"><h2 className="mb-1 text-lg font-black">{ar ? 'سداد الاشتراك بالتحويل' : 'Pay by transfer'}</h2><p className="mb-5 text-sm text-[var(--muted-foreground)]">{ar ? 'اختر بنكك أو ماي كاشي وارفع إشعار التحويل للمراجعة.' : 'Choose an account and upload your transfer receipt for review.'}</p><ManualPaymentForm accounts={paymentAccounts} locale={locale}/></section>}

      {payments.length > 0 && <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"><h2 className="mb-4 text-lg font-black">{ar ? 'عمليات السداد' : 'Payment submissions'}</h2><div className="space-y-3">{payments.map(payment => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3"><div><strong>{payment.amount.toLocaleString()} {payment.currency}</strong><p className="text-xs text-[var(--muted-foreground)]">{payment.paymentAccount.label} · {payment.transactionRef}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${payment.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : payment.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>{payment.status}</span>{payment.rejectionReason && <p className="w-full text-sm text-red-700">{payment.rejectionReason}</p>}</div>)}</div></section>}

      <p className="text-xs leading-6 text-[var(--muted-foreground)]">
        {ar
          ? 'سعر Pro مرجعي بالدولار. سيعرض فريق وصلة مبلغ الجنيه السوداني المثبّت قبل أي تحصيل، ولن تتغير باقتك بمجرد إرسال الطلب.'
          : 'Pro uses a USD reference price. WASLA will confirm a locked local-currency amount before collection; submitting a request does not change your plan.'}
      </p>
    </div>
  );
}

function formatFeature(value: number | boolean, ar: boolean): string {
  if (typeof value === 'boolean') return value ? '✓' : '—';
  if (value === -1) return ar ? 'غير محدود' : 'Unlimited';
  return String(value);
}

function displayPlanName(code: string, fallback: string, ar: boolean): string {
  if (code === 'FREE') return ar ? 'مجاني' : 'Free';
  if (code === 'GROWTH') return ar ? 'نمو' : 'Growth';
  if (code === 'PRO') return ar ? 'احترافي' : 'Pro';
  if (code === 'BUSINESS') return ar ? 'أعمال' : 'Business';
  return fallback;
}
