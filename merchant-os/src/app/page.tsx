import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowLeft, BadgeCheck, Bot, Check, CreditCard, FileSpreadsheet, Globe2, Megaphone, MessageCircle, PackageCheck, Palette, ShieldCheck, ShoppingBag, Sparkles, Store, Truck, Users, X } from 'lucide-react';
import { auth } from '@/lib/auth/config';
import { LocaleProvider } from '@/lib/i18n/context';
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { WaslaMark } from '@/components/brand/wasla-logo';
import { PublicFooter, PublicHeader } from '@/components/marketing/public-chrome';
import { listPublicPlans } from '@/modules/merchant-subscriptions';

export const metadata: Metadata = {
  title: 'أنشئ متجرك الإلكتروني مجاناً',
  description: 'متجر احترافي وطلبات ودفع وتوصيل وذكاء اصطناعي في منصة واحدة.',
};

const content = {
  ar: {
    features: 'المميزات', how: 'كيف تعمل', pricing: 'الأسعار', login: 'دخول', start: 'أنشئ متجرك مجاناً', dashboard: 'لوحة التحكم',
    eyebrow: 'ابدأ مجاناً — بدون بطاقة بنكية', title: 'ابدأ البيع أونلاين،', accent: 'وأدر تجارتك من مكان واحد.',
    lead: 'أنشئ متجرك مجاناً، ارفع منتجاتك وصورك، استقبل الطلبات والتحويلات، ونظّم التوصيل وخدمة العملاء من لوحة واضحة. عندما يكبر عملك، فعّل الأدوات الاحترافية التي تحتاجها فقط.',
    promises: ['الباقة الأساسية مجانية', 'لا تحتاج بطاقة بنكية', 'رابط متجر جاهز للمشاركة'],
    section: 'كل ما تحتاجه للتشغيل', sectionTitle: 'من أول منتج إلى أول مائة طلب', sectionLead: 'أدوات عملية تساعدك على البيع والمتابعة والنمو، بدون تعقيد تقني.',
    cards: [
      ['متجر بهويتك','خصص الألوان والبنرات والأقسام وارفع صورك مباشرة.'],
      ['إدارة الطلبات','تابع الطلب من الاستلام حتى التسليم بحالات واضحة.'],
      ['دفع مرن','بنكك وماي كاشي والدفع عند الاستلام مع مطابقة الإشعار.'],
      ['توصيل متصل','اطلب عروض شركات التوصيل وتابع الشحنة والمندوب.'],
      ['ذكاء اصطناعي عملي','اكتب المحتوى وحسّن الصور وشغّل مساعد واتساب.'],
      ['فواتير وتصدير','أنشئ فواتير الطلبات وصدّر بيانات التشغيل إلى Excel في Pro.'],
      ['هوية موثقة','ارفع مستندات نشاطك وتابع مراجعة الهوية من داخل المنصة.'],
      ['دومينك الخاص','اربط نطاق متجرك الخاص مع باقة Pro وحافظ على حضور علامتك.'],
    ],
    stepsTitle: 'ثلاث خطوات وتبدأ البيع', steps: [['أنشئ حسابك','أدخل بيانات نشاطك الأساسية.'],['جهّز متجرك','أضف المنتجات والصور وطرق الدفع.'],['شارك وابدأ البيع','انشر رابطك وتابع الطلبات من وصلة.']],
    aiKicker: 'شريك ذكي داخل عملك', aiTitle: 'ذكاء اصطناعي ينجز، لا يستعرض', aiLead: 'محتوى أسرع، صور منتجات أفضل، ومساعد واتساب يفهم كتالوجك ويساعد في إنشاء الطلبات.',
    affiliateKicker: 'دخل مبني على نتيجة حقيقية', affiliateTitle: 'سوّق لوصلة أو لمنتجات المتاجر', affiliateLead: 'برنامجان واضحان للمسوّقين: استقطب تجاراً واشترك في نمو وصلة، أو اختر متجراً وسوّق منتجاته مقابل عمولة يحددها التاجر.',
    acquireTitle: 'استقطاب التجار', acquireText: 'لا توجد عمولة على التسجيل المجاني؛ يبدأ الاستحقاق عند دفع التاجر لأول اشتراك مدفوع حسب سياسة البرنامج.',
    productsTitle: 'تسويق المنتجات', productsText: 'رابط خاص، إسناد للطلبات، عمولة بعد التسليم وفترة تعليق، وتوثيق هوية قبل السداد.', marketerCta: 'سجّل كمسوّق',
    free: 'الأساسية', freePrice: 'مجاناً دائماً', growth: 'النمو Growth', growthPrice: '5 دولار / شهرياً', pro: 'الاحترافية Pro', proPrice: '10 دولار / شهرياً', priceLead: 'ابدأ مجاناً مع 20 منتجاً ومسودة متجر ذكية واحدة، ثم اختر أدوات النمو التي تناسب نشاطك.',
    freeItems: ['متجر إلكتروني ورابط جاهز','حتى 20 منتجاً و10 تصنيفات','مسودة متجر ذكية واحدة مدى الحياة','الطلبات والعملاء والفواتير','فرع واحد وحساب فريق واحد','التحويلات وإدارة التوصيل الأساسية'],
    freeUnavailable: ['بدون AI متجدد أو وكيل واتساب','بدون تصدير Excel أو دومين خاص'],
    growthItems: ['حتى 300 منتجاً و50 تصنيفاً','3 حسابات فريق','5 عمليات توليد متجر شهرياً','100 تعديل ذكي و20 تحسين صورة','تصدير Excel','أدوات نمو وتقارير عملية'],
    proItems: ['كل ميزات Growth','حتى 2,000 منتج و10 حسابات فريق','حتى 3 فروع','20 توليداً و500 تعديل ذكي شهرياً','100 تحسين صورة و2,000 رد واتساب','تحليلات متقدمة ودومين خاص','إزالة علامة وصلة','API وأتمتة العملاء'],
    popular: 'الأفضل للنمو', freeCta: 'ابدأ مجاناً', growthCta: 'اختر Growth', proCta: 'طوّر إلى Pro', currencyNote: 'الأسعار مرجعية وقابلة للإدارة؛ يظهر مبلغ السداد المحلي المثبّت قبل التحصيل.',
    final: 'جاهز توصل تجارتك بالسوق؟', finalLead: 'ابدأ الآن مجاناً. لا تحتاج خبرة تقنية ولا بطاقة بنكية.',
  },
  en: {
    features: 'Features', how: 'How it works', pricing: 'Pricing', login: 'Sign in', start: 'Create your store free', dashboard: 'Dashboard',
    eyebrow: 'Start free — no bank card required', title: 'Start selling online,', accent: 'run everything in one place.',
    lead: 'Create your store for free, upload products and images, receive orders and transfers, and organize delivery and customer service from one clear dashboard. Upgrade only when you need professional tools.',
    promises: ['Basic plan is free', 'No bank card required', 'A shareable store link'],
    section: 'Everything you need', sectionTitle: 'From your first product to your first 100 orders', sectionLead: 'Practical tools to sell, operate and grow without technical complexity.',
    cards: [
      ['Your own storefront','Customize colors, banners and sections and upload images directly.'],
      ['Order operations','Track every order from acceptance through delivery.'],
      ['Flexible payments','Bankak, MyCashy and COD with receipt verification.'],
      ['Connected delivery','Request partner quotes and track shipments and couriers.'],
      ['Practical AI','Write copy, improve images and enable a WhatsApp agent.'],
      ['Invoices and exports','Create order invoices and export operational data to Excel on Pro.'],
      ['Verified identity','Submit business documents and track identity review inside Wasla.'],
      ['Your own domain','Connect a custom storefront domain on Pro and strengthen your brand.'],
    ],
    stepsTitle: 'Three steps to start selling', steps: [['Create your account','Add your essential business details.'],['Prepare your store','Add products, images and payments.'],['Share and sell','Publish your link and run orders in Wasla.']],
    aiKicker: 'An intelligent operating partner', aiTitle: 'AI that gets work done', aiLead: 'Faster content, better product photos, and a WhatsApp agent grounded in your catalog that can help create orders.',
    affiliateKicker: 'Income tied to verified results', affiliateTitle: 'Promote Wasla or store products', affiliateLead: 'Two clear paths: bring merchants into Wasla, or choose a store and promote its products under that merchant’s commission policy.',
    acquireTitle: 'Merchant acquisition', acquireText: 'Free signup earns nothing; eligibility starts after the merchant pays for their first paid plan under the program terms.',
    productsTitle: 'Product affiliate', productsText: 'A tracked link, order attribution, commission after delivery and hold, and identity verification before payout.', marketerCta: 'Apply as a marketer',
    free: 'Basic', freePrice: 'Free forever', growth: 'Growth', growthPrice: '$5 / month', pro: 'Professional Pro', proPrice: '$10 / month', priceLead: 'Start free with 20 products and one lifetime AI store draft, then add the growth tools your business needs.',
    freeItems: ['Online store with a shareable link','Up to 20 products and 10 categories','One lifetime AI store draft','Orders, customers and invoices','One branch and one staff seat','Transfers and basic delivery management'],
    freeUnavailable: ['No recurring AI or WhatsApp agent','No Excel export or custom domain'],
    growthItems: ['Up to 300 products and 50 categories','3 staff seats','5 store generations each month','100 AI edits and 20 image enhancements','Excel exports','Practical growth reports'],
    proItems: ['Everything in Growth','Up to 2,000 products and 10 staff seats','Up to 3 branches','20 generations and 500 AI edits monthly','100 image enhancements and 2,000 WhatsApp replies','Advanced analytics and custom domain','Wasla branding removal','API access and CRM automation'],
    popular: 'Best for growth', freeCta: 'Start free', growthCta: 'Choose Growth', proCta: 'Upgrade to Pro', currencyNote: 'Reference prices are admin-configurable; a locked local-currency amount is shown before collection.',
    final: 'Ready to connect your business to the market?', finalLead: 'Start free today. No technical experience or bank card required.',
  },
} as const;

const icons = [Palette, PackageCheck, CreditCard, Truck, Bot, FileSpreadsheet, ShieldCheck, Globe2];

export default async function HomePage() {
  const [session, cookieStore, plans] = await Promise.all([auth(), cookies(), listPublicPlans().catch(() => [])]);
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = content[locale];
  const accountHref = !session?.user ? '/register' : session.user.role.startsWith('PLATFORM_') ? '/admin' : session.user.role.startsWith('DELIVERY_PARTNER_') ? '/partner' : session.user.role.startsWith('DISTRIBUTOR_') ? '/' : '/dashboard';
  const upgradeHref = session?.user?.merchantId ? '/dashboard/subscription' : '/register';
  const freePlan = plans.find((plan) => plan.code === 'FREE');
  const growthPlan = plans.find((plan) => plan.code === 'GROWTH');
  const proPlan = plans.find((plan) => plan.code === 'PRO');
  const freePrice = freePlan ? formatPlanPrice(freePlan.monthlyPrice, freePlan.currency, locale) : t.freePrice;
  const growthPrice = growthPlan ? formatPlanPrice(growthPlan.monthlyPrice, growthPlan.currency, locale) : t.growthPrice;
  const proPrice = proPlan ? formatPlanPrice(proPlan.monthlyPrice, proPlan.currency, locale) : t.proPrice;

  return <LocaleProvider initialLocale={locale}><div className="min-h-screen overflow-hidden bg-white text-[#07111f] dark:bg-[#07111f] dark:text-white">
    <PublicHeader locale={locale} accountHref={accountHref} signedIn={Boolean(session?.user)} />

    <main>
      <section className="border-b border-slate-200 bg-[#f7faf9] dark:border-white/10 dark:bg-[#091522]">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div><span className="inline-flex items-center gap-2 rounded-full border border-[#b9e4da] bg-white px-4 py-2 text-xs font-bold text-[#087d82] dark:border-emerald-400/20 dark:bg-white/5 dark:text-emerald-300"><Sparkles className="h-4 w-4"/>{t.eyebrow}</span><h1 className="mt-6 text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">{t.title}<br/><span className="text-[#087d82] dark:text-[#37d6b6]">{t.accent}</span></h1><p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg dark:text-slate-300">{t.lead}</p><div className="mt-8 flex flex-wrap items-center gap-4"><Link href={accountHref} className="inline-flex items-center gap-2 rounded-2xl bg-[#087d82] px-7 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#06666a]">{session?.user?t.dashboard:t.start}<ArrowLeft className="h-5 w-5 rtl:rotate-0 ltr:rotate-180"/></Link><Link href="#how" className="rounded-2xl border border-slate-300 bg-white px-6 py-4 font-bold text-slate-700 hover:border-[#087d82] dark:border-white/15 dark:bg-white/5 dark:text-white">{t.how}</Link></div><div className="mt-7 flex flex-wrap gap-5 text-xs font-semibold text-slate-500">{t.promises.map(x=><span key={x} className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-[#13C4A3]"/>{x}</span>)}</div></div>
          <DashboardPreview locale={locale}/>
        </div>
      </section>

      <section id="features" className="bg-[#07111f] py-20 text-white lg:py-28"><div className="mx-auto max-w-7xl px-5 lg:px-8"><p className="text-sm font-bold text-[#13C4A3]">{t.section}</p><h2 className="mt-3 max-w-2xl text-3xl font-black sm:text-4xl">{t.sectionTitle}</h2><p className="mt-4 max-w-2xl leading-7 text-slate-400">{t.sectionLead}</p><div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{t.cards.map(([title,description],i)=>{const Icon=icons[i];return <article key={title} className="rounded-3xl border border-white/10 bg-white/[.04] p-6 transition hover:-translate-y-1 hover:border-emerald-400/30"><span className="inline-flex rounded-2xl bg-emerald-400/10 p-3 text-[#13C4A3]"><Icon className="h-6 w-6"/></span><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{description}</p></article>})}</div></div></section>

      <section id="how" className="py-20 lg:py-28 dark:bg-[#091522]"><div className="mx-auto max-w-7xl px-5 lg:px-8"><h2 className="text-center text-3xl font-black sm:text-4xl">{t.stepsTitle}</h2><div className="mt-12 grid gap-5 md:grid-cols-3">{t.steps.map(([title,description],i)=><article key={title} className="rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm dark:border-white/10 dark:bg-white/5"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#13C4A3] text-xl font-black text-white">{i+1}</span><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-500">{description}</p></article>)}</div></div></section>

      <section id="affiliates" className="border-y border-slate-200 bg-[#f7faf9] py-20 dark:border-white/10 dark:bg-[#091522] lg:py-28"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="grid items-center gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><span className="inline-flex rounded-2xl bg-[#e9f7f4] p-3 text-[#087d82]"><Megaphone className="h-7 w-7"/></span><p className="mt-6 text-sm font-bold text-[#087d82]">{t.affiliateKicker}</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">{t.affiliateTitle}</h2><p className="mt-5 leading-8 text-slate-600 dark:text-slate-300">{t.affiliateLead}</p><Link href="/marketers" className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#087d82] px-6 py-3.5 font-bold text-white">{t.marketerCta}<ArrowLeft className="h-5 w-5 ltr:rotate-180"/></Link></div><div className="grid gap-4 sm:grid-cols-2"><article className="rounded-3xl border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-white/5"><Users className="h-8 w-8 text-[#087d82]"/><h3 className="mt-5 text-xl font-black">{t.acquireTitle}</h3><p className="mt-3 text-sm leading-7 text-slate-500">{t.acquireText}</p></article><article className="rounded-3xl border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-white/5"><Store className="h-8 w-8 text-[#087d82]"/><h3 className="mt-5 text-xl font-black">{t.productsTitle}</h3><p className="mt-3 text-sm leading-7 text-slate-500">{t.productsText}</p></article></div></div></div></section>

      <section className="px-5 pb-20 lg:px-8 lg:pb-28 dark:bg-[#091522]"><div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] bg-[#087d82] text-white lg:grid-cols-2"><div className="p-9 lg:p-16"><Bot className="h-9 w-9"/><p className="mt-6 text-sm font-bold text-emerald-100">{t.aiKicker}</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">{t.aiTitle}</h2><p className="mt-5 leading-8 text-emerald-50/90">{t.aiLead}</p></div><div className="grid content-center gap-4 bg-[#06666a] p-9 lg:p-16">{[t.cards[4][0],t.cards[2][0],t.cards[3][0]].map(x=><div key={x} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-4"><Check className="h-5 w-5"/><span className="font-bold">{x}</span></div>)}</div></div></section>

      <section id="pricing" className="bg-slate-50 py-20 lg:py-28 dark:bg-[#07111f]"><div className="mx-auto max-w-7xl px-5 lg:px-8"><h2 className="text-center text-3xl font-black sm:text-4xl">{t.pricing}</h2><p className="mx-auto mt-4 max-w-2xl text-center leading-7 text-slate-500">{t.priceLead}</p><div className="mt-12 grid items-stretch gap-5 md:grid-cols-3"><Plan title={t.free} price={freePrice} items={t.freeItems} unavailable={t.freeUnavailable} href={accountHref} cta={t.freeCta}/><Plan title={t.growth} price={growthPrice} items={t.growthItems} href={upgradeHref} cta={t.growthCta} badge={t.popular} featured/><Plan title={t.pro} price={proPrice} items={t.proItems} href={upgradeHref} cta={t.proCta}/></div><p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-6 text-slate-500">{t.currencyNote}</p></div></section>

      <section className="px-5 py-20"><div className="mx-auto max-w-5xl rounded-[2rem] bg-[#07111f] px-6 py-14 text-center text-white shadow-2xl"><ShoppingBag className="mx-auto h-10 w-10 text-[#13C4A3]"/><h2 className="mt-6 text-3xl font-black sm:text-4xl">{t.final}</h2><p className="mt-4 text-slate-400">{t.finalLead}</p><Link href={accountHref} className="mt-8 inline-flex rounded-2xl bg-[#13C4A3] px-7 py-4 font-bold">{session?.user?t.dashboard:t.start}</Link></div></section>
    </main>
    <PublicFooter locale={locale} />
  </div></LocaleProvider>;
}

function DashboardPreview({locale}:{locale:Locale}) { const ar=locale==='ar'; return <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-300 bg-white p-3 shadow-[0_18px_50px_rgba(7,17,31,0.12)] dark:border-white/15 dark:bg-[#0d1b2a]"><div className="rounded-[1.4rem] border border-slate-100 bg-white p-5 dark:border-white/10 dark:bg-[#102235]"><div className="flex items-center gap-3"><WaslaMark/><div><p className="text-sm font-bold">{ar?'لوحة متجرك':'Your dashboard'}</p><p className="text-xs text-slate-400">wassla-sd.shop/store/your-store</p></div></div><div className="mt-6 grid grid-cols-3 gap-3">{[[ar?'مبيعات اليوم':'Sales today','48,500'],[ar?'طلبات':'Orders','12'],[ar?'منتجات':'Products','84']].map(([a,b])=><div key={a} className="rounded-2xl border border-slate-100 bg-[#f8faf9] p-4 dark:border-white/10 dark:bg-white/5"><p className="text-[10px] text-slate-500">{a}</p><p className="mt-2 text-lg font-black">{b}</p></div>)}</div><div className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_.6fr]"><div className="rounded-2xl border border-slate-100 p-4 dark:border-white/10"><div className="flex justify-between text-xs font-bold"><span>{ar?'طلب جديد #1048':'New order #1048'}</span><span className="text-amber-600">NEW</span></div><div className="mt-5 h-2 rounded-full bg-slate-100"><div className="h-2 w-4/5 rounded-full bg-[#13C4A3]"/></div><div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[11px] font-bold text-emerald-700"><CreditCard className="h-4 w-4"/>{ar?'تم رفع إشعار التحويل':'Receipt uploaded'}</div></div><div className="flex flex-col justify-between rounded-2xl bg-[#07111f] p-4 text-white"><MessageCircle className="h-7 w-7 text-[#13C4A3]"/><div><p className="text-xs text-slate-400">WhatsApp AI</p><p className="font-bold">24/7</p></div></div></div></div></div> }

function Plan({title,price,items,unavailable=[],href,cta,badge,featured=false}:{title:string;price:string;items:readonly string[];unavailable?:readonly string[];href:string;cta:string;badge?:string;featured?:boolean}) { return <article className={`relative flex h-full flex-col rounded-3xl border p-8 ${featured?'border-[#13C4A3] bg-[#07111f] text-white shadow-xl shadow-emerald-950/10':'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'}`}>{badge&&<span className="absolute -top-3 end-6 rounded-full bg-[#13C4A3] px-3 py-1 text-xs font-black text-white">{badge}</span>}<p className="font-bold text-[#13C4A3]">{title}</p><p className="mt-3 text-3xl font-black">{price}</p><ul className="mt-7 space-y-3">{items.map(x=><li key={x} className="flex gap-2 text-sm leading-6"><Check className="mt-0.5 h-5 w-5 shrink-0 text-[#13C4A3]"/>{x}</li>)}{unavailable.map(x=><li key={x} className="flex gap-2 text-sm leading-6 text-slate-400"><X className="mt-0.5 h-5 w-5 shrink-0"/>{x}</li>)}</ul><Link href={href} className={`mt-auto flex justify-center rounded-xl px-5 py-3 text-sm font-bold ${featured?'bg-[#13C4A3] text-white hover:bg-[#10ad91]':'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15'}`}>{cta}</Link></article> }

function formatPlanPrice(amount:number, currency:string, locale:Locale):string {
  if (amount === 0) return locale === 'ar' ? 'مجاناً دائماً' : 'Free forever';
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-SD' : 'en-US', { maximumFractionDigits: 2 }).format(amount);
  return locale === 'ar' ? `${formatted} ${currency} / شهرياً` : `${currency} ${formatted} / month`;
}
