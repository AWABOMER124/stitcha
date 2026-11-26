'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Globe2, MapPin, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/lib/i18n/translations';
import type { MerchantEntitlements } from '@/modules/merchant-subscriptions/entitlements';
import type { SubscriptionMarket } from '@/modules/merchant-subscriptions/market-pricing';
import type { PricingSelection } from '@/lib/pricing/visitor-market';

export interface PublicPricingPlan {
  code: string; name: string; monthlyPrice: number; yearlyPrice: number | null; currency: string;
  entitlements: MerchantEntitlements;
}

export function MarketPricing({ selection, plans, locale, href, hint }: {
  selection: PricingSelection; plans: PublicPricingPlan[]; locale: Locale; href: string; hint: SubscriptionMarket | null;
}) {
  const ar = locale === 'ar';
  const router = useRouter();
  const [country, setCountry] = useState<SubscriptionMarket | ''>(hint ?? '');
  const [yearly, setYearly] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const market = selection.market;
  async function choose(value: SubscriptionMarket | null) {
    setPending(true); setError(false);
    try {
      const response = await fetch('/api/pricing/market', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ market: value }),
      });
      if (!response.ok) throw new Error('Country selection failed');
      router.replace('/#pricing', { scroll: false });
      router.refresh();
      setPending(false);
    } catch { setError(true); setPending(false); }
  }
  const number = (value: number) => new Intl.NumberFormat(ar ? 'ar-SA' : 'en', { maximumFractionDigits: 2 }).format(value);
  const countries = { SA: ar ? 'المملكة العربية السعودية' : 'Saudi Arabia', SD: ar ? 'السودان' : 'Sudan' };
  const annualAvailable = plans.some(plan => plan.monthlyPrice > 0) && plans.filter(plan => plan.monthlyPrice > 0).every(plan => plan.yearlyPrice !== null);

  return <section id="pricing" className="scroll-mt-24 bg-[#f4f8f7] py-20 dark:bg-[#07111f] lg:py-28">
    <div className="mx-auto max-w-7xl px-5 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-extrabold tracking-wide text-[#087d82] dark:text-emerald-300">{ar ? 'باقات وصلة' : 'WASLA PLANS'}</span>
        <h2 className="mt-3 text-3xl font-black sm:text-4xl">{market ? (ar ? 'مساحة لطموحك، وباقة تناسبك' : 'Room to grow. A plan that fits.') : (ar ? 'أين يبدأ نشاطك؟' : 'Where is your business?')}</h2>
        <p className="mt-4 leading-7 text-slate-500 dark:text-slate-400">{market ? (ar ? 'ابدأ مجاناً، واختر أدواتك مع نمو تجارتك.' : 'Start free. Add the tools you need as your business grows.') : (ar ? 'اختر بلد نشاطك لعرض الباقات والأسعار المناسبة لك.' : 'Choose your business country to see your plans and prices.')}</p>
      </div>
      {!market ? <form onSubmit={event => { event.preventDefault(); if (country) void choose(country); }} className="mx-auto mt-10 max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-white/5">
        <Globe2 className="mb-6 h-9 w-9 text-[#087d82]"/>
        <label htmlFor="pricing-country" className="mb-3 block text-sm font-bold">{ar ? 'بلد النشاط' : 'Business country'}</label>
        <div className="relative"><select id="pricing-country" required value={country} onChange={event => setCountry(event.target.value as SubscriptionMarket)} className="w-full appearance-none rounded-xl border border-slate-300 bg-transparent p-4 pe-10 font-semibold dark:border-white/20">
          <option value="" disabled>{ar ? 'اختر البلد' : 'Choose a country'}</option>
          <option value="SA">{countries.SA}</option><option value="SD">{countries.SD}</option>
        </select><ChevronDown className="pointer-events-none absolute end-4 top-4 h-5 w-5 text-slate-400"/></div>
        <button disabled={!country || pending} className="mt-5 w-full rounded-xl bg-[#087d82] px-6 py-4 font-bold text-white disabled:opacity-50">{pending ? (ar ? 'جارٍ عرض الباقات…' : 'Loading plans…') : (ar ? 'عرض الباقات' : 'View plans')}</button>
      </form> : <>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold dark:border-white/15 dark:bg-white/5"><MapPin className="h-4 w-4 text-[#087d82]"/>{countries[market]}<span className="text-xs font-normal text-slate-500">{selection.source === 'location' ? (ar ? 'تلقائياً' : 'Auto') : selection.source === 'account' ? (ar ? 'بلد متجرك' : 'Store country') : ''}</span></span>
          {selection.source === 'choice' && <button disabled={pending} onClick={() => void choose(null)} className="text-sm font-bold text-[#087d82] underline underline-offset-4">{ar ? 'تغيير البلد' : 'Change country'}</button>}
        </div>
        {annualAvailable && <div className="mx-auto mt-7 flex w-fit gap-1 rounded-full border border-slate-200 bg-white p-1.5 dark:border-white/15 dark:bg-white/5" aria-label={ar ? 'دورة الاشتراك' : 'Billing period'}>
          {[false, true].map(annual => <button key={String(annual)} type="button" aria-pressed={yearly === annual} onClick={() => setYearly(annual)} className={`rounded-full px-6 py-2.5 text-sm font-bold transition ${yearly === annual ? 'bg-[#087d82] text-white shadow-sm' : 'text-slate-500'}`}>{annual ? (ar ? 'سنوي' : 'Yearly') : (ar ? 'شهري' : 'Monthly')}</button>)}
        </div>}
        <div className={`mt-12 grid items-stretch gap-5 md:grid-cols-2 ${plans.length > 3 ? 'xl:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {plans.map(plan => {
            const free = plan.monthlyPrice === 0;
            const featured = plan.code === (market === 'SA' ? 'SA_PRO' : 'GROWTH');
            const amount = yearly && plan.yearlyPrice !== null ? plan.yearlyPrice : plan.monthlyPrice;
            const saving = yearly && plan.yearlyPrice !== null ? plan.monthlyPrice * 12 - plan.yearlyPrice : 0;
            const currency = plan.currency === 'SAR' ? (ar ? 'ريال' : 'SAR') : plan.currency === 'USD' ? (ar ? 'دولار' : 'USD') : plan.currency;
            return <article key={plan.code} className={`relative flex flex-col rounded-3xl border p-6 lg:p-7 ${featured ? 'border-[#087d82] bg-[#071f2b] text-white shadow-xl shadow-emerald-950/10' : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'}`}>
              {featured && <span className="absolute -top-3 start-6 rounded-full bg-[#13C4A3] px-4 py-1 text-xs font-extrabold text-[#05252b]">{ar ? 'اختيار النمو' : 'Built for growth'}</span>}
              <h3 className={`text-lg font-extrabold ${featured ? 'text-emerald-300' : 'text-[#087d82] dark:text-emerald-300'}`}>{free ? (ar ? 'الأساسية' : 'Basic') : ar ? plan.name : plan.code.replace('SA_', '')}</h3>
              <div className="mt-6 min-h-24"><p className="flex flex-wrap items-baseline gap-2"><span className="text-4xl font-black tracking-tight">{free ? (ar ? 'مجاناً' : 'Free') : number(amount)}</span>{!free && <span className="text-sm opacity-70">{currency} / {yearly ? (ar ? 'سنة' : 'year') : (ar ? 'شهر' : 'month')}</span>}</p><p className="mt-3 text-xs opacity-65">{free ? (ar ? 'ابدأ بدون بطاقة بنكية' : 'No bank card required') : saving > 0 ? (ar ? `توفّر ${number(saving)} ${currency} سنوياً` : `Save ${number(saving)} ${currency} yearly`) : (ar ? 'اشتراك شهري مرن' : 'Flexible monthly billing')}</p></div>
              <Link href={href} className={`mt-3 rounded-xl px-4 py-3.5 text-center text-sm font-extrabold transition ${featured ? 'bg-[#13C4A3] text-[#05252b] hover:bg-emerald-300' : 'bg-[#eaf5f2] text-[#087d82] hover:bg-emerald-100 dark:bg-white/10 dark:text-emerald-300'}`}>{free ? (ar ? 'ابدأ مجاناً' : 'Start free') : (ar ? 'اختر الباقة' : 'Choose plan')}</Link>
              <ul className="mt-7 space-y-4 border-t border-current/10 pt-6">{features(plan.entitlements, ar).map(item => <li key={item} className="flex gap-2.5 text-sm leading-6"><Check className="mt-1 h-4 w-4 shrink-0 text-[#13C4A3]"/>{item}</li>)}</ul>
            </article>;
          })}
        </div>
        <p className="mt-7 flex items-center justify-center gap-2 text-center text-xs leading-6 text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0"/>{market === 'SA' ? (ar ? 'الاشتراك بالريال السعودي. رسوم الشحن والتحصيل تُحسب بشكل منفصل.' : 'Subscriptions in SAR. Shipping and COD fees are separate.') : (ar ? 'يظهر مبلغ السداد بالعملة المحلية قبل تأكيد الاشتراك.' : 'Your local payment amount is shown before confirming your subscription.')}</p>
      </>}
      {error && <p role="alert" className="mt-4 text-center text-sm text-red-600">{ar ? 'تعذّر حفظ البلد. حاول مرة أخرى.' : 'Unable to save your country. Please try again.'}</p>}
    </div>
  </section>;
}

function features(e: MerchantEntitlements, ar: boolean) {
  const limit = (value: number) => value === -1 ? (ar ? 'غير محدود' : 'Unlimited') : new Intl.NumberFormat(ar ? 'ar-SA' : 'en').format(value);
  return [
    ar ? `${limit(e.maxActiveProducts)} منتج و${limit(e.maxCategories)} تصنيف` : `${limit(e.maxActiveProducts)} products, ${limit(e.maxCategories)} categories`,
    ar ? `${limit(e.maxStaffUsers)} حساب فريق و${limit(e.maxBranches)} فرع` : `${limit(e.maxStaffUsers)} staff seats, ${limit(e.maxBranches)} branches`,
    ar ? 'الطلبات والعملاء والفواتير' : 'Orders, customers and invoices',
    ...(e.assistedSales ? [ar ? 'مبيعات الفريق بأسعار خاصة وروابط دفع' : 'Team sales, negotiated prices and payment links'] : []),
    ...(e.aiStoreGenerationsLifetime > 0 ? [ar ? `${e.aiStoreGenerationsLifetime} مسودة متجر ذكية عند البداية` : `${e.aiStoreGenerationsLifetime} starter AI store draft`] : []),
    ...(e.aiStoreGenerationsMonthly > 0 ? [ar ? `${limit(e.aiStoreGenerationsMonthly)} توليد متجر شهرياً` : `${limit(e.aiStoreGenerationsMonthly)} AI store generations / month`] : []),
    ...(e.aiStoreEditsMonthly > 0 ? [ar ? `${limit(e.aiStoreEditsMonthly)} تعديل ذكي شهرياً` : `${limit(e.aiStoreEditsMonthly)} AI edits / month`] : []),
    ...(e.aiImageEnhancementsMonthly > 0 ? [ar ? `${limit(e.aiImageEnhancementsMonthly)} تحسين صورة شهرياً` : `${limit(e.aiImageEnhancementsMonthly)} image enhancements / month`] : []),
    ...(e.whatsappAiAgent ? [ar ? `${limit(e.whatsappAiConversationsMonthly)} رد واتساب ذكي شهرياً` : `${limit(e.whatsappAiConversationsMonthly)} AI WhatsApp replies / month`] : []),
    ...(e.customDomain ? [ar ? 'دومين خاص' : 'Custom domain'] : []),
    ...(e.removeBranding ? [ar ? 'إزالة علامة وصلة' : 'Remove Wasla branding'] : []),
    ...(e.dataExport ? [ar ? 'تصدير البيانات' : 'Data exports'] : []),
  ];
}
