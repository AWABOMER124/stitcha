import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LocaleProvider } from '@/lib/i18n/context';
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { PublicFooter, PublicHeader } from '@/components/marketing/public-chrome';
import { getPublicPageContext } from '@/lib/marketing/public-context';
import { listPublicAffiliateStores } from '@/modules/marketer-applications/marketer-applications.service';
import { MarketerApplicationForm } from './application-form';

export const metadata: Metadata = {
  title: 'انضم كمسوّق بالعمولة',
  description: 'سوّق لوصلة أو لمنتجات متاجرها، وتتبع نتائجك ضمن برنامج واضح ومراجَع.',
};

export const dynamic = 'force-dynamic';

export default async function MarketersPage() {
  const [ctx, cookieStore, stores] = await Promise.all([getPublicPageContext(), cookies(), listPublicAffiliateStores()]);
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const publicStores = stores.map(store => ({
    id: store.merchantId,
    name: store.merchant.name,
    slug: store.merchant.slug,
    rate: Number(store.commissionRate),
    currency: store.currency,
    terms: store.terms,
  }));
  return <LocaleProvider initialLocale={locale}><div className="min-h-screen bg-[#f7faf9] text-[#07111f] dark:bg-[#07111f] dark:text-white">
    <PublicHeader {...ctx} />
    <main>
      <section className="border-b border-slate-200 bg-white py-16 dark:border-white/10 dark:bg-[#091522] lg:py-24">
        <div className="mx-auto max-w-5xl px-5 text-center lg:px-8">
          <p className="font-bold text-[#087d82]">{locale === 'ar' ? 'برنامج شركاء النمو' : 'Growth partners program'}</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{locale === 'ar' ? 'حوّل تسويقك إلى دخل واضح' : 'Turn your marketing into measurable income'}</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'اختر بين استقطاب تجار جدد إلى وصلة أو تسويق منتجات متجر محدد. كل طلب يخضع للمراجعة قبل إصدار الرابط، وتُحتسب العمولة حسب السياسة المنشورة والنتيجة الفعلية.' : 'Choose between bringing new merchants to Wasla or promoting products for a specific store. Every application is reviewed before links are issued, and commission follows the published program and verified results.'}</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-7 px-5 py-12 lg:grid-cols-[.8fr_1.2fr] lg:px-8 lg:py-16">
        <aside className="space-y-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5"><span className="text-3xl">🤝</span><h2 className="mt-4 text-xl font-black">{locale === 'ar' ? 'استقطاب التجار' : 'Merchant acquisition'}</h2><p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'عرّف أصحاب الأعمال على وصلة. الاستحقاق يبدأ بعد اشتراك التاجر في Pro ودفعه فعلياً، وليس عند التسجيل المجاني.' : 'Introduce businesses to Wasla. Eligibility starts after a referred merchant pays for Pro, not on free signup.'}</p></article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5"><span className="text-3xl">🛍️</span><h2 className="mt-4 text-xl font-black">{locale === 'ar' ? 'تسويق المنتجات' : 'Product affiliate'}</h2><p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'اختر متجراً مفعّلاً للبرنامج. يراجع التاجر طلبك، وبعد الموافقة تكمل توثيق الهوية وبيانات السداد قبل صرف أي عمولة.' : 'Choose a store with an active program. The merchant reviews your request, then you complete identity and payout verification before any commission is paid.'}</p></article>
          <div className="rounded-3xl bg-[#07111f] p-6 text-white"><h2 className="font-black">{locale === 'ar' ? 'كيف تتم العملية؟' : 'How it works'}</h2><ol className="mt-4 space-y-3 text-sm text-slate-300">{(locale === 'ar' ? ['قدّم بياناتك وقنواتك التسويقية','تراجع وصلة أو التاجر طلبك','تكمل KYC وبيانات السداد','تستلم رابطك وتبدأ التسويق','تُراجع العمولة بعد النتيجة وفترة التعليق'] : ['Submit your profile and channels','Wasla or the merchant reviews it','Complete KYC and payout setup','Receive your link and start','Commission is reviewed after the result and hold period']).map((step,index)=><li key={step} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#13C4A3] text-xs font-black text-white">{index+1}</span>{step}</li>)}</ol></div>
        </aside>
        <MarketerApplicationForm locale={locale} stores={publicStores}/>
      </section>
    </main>
    <PublicFooter locale={locale}/>
  </div></LocaleProvider>;
}
