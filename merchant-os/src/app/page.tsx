import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowLeft, BadgeCheck, BarChart3, Bot, Check, CreditCard, MessageCircle, PackageCheck, Palette, ShoppingBag, Sparkles, Truck } from 'lucide-react';
import { auth } from '@/lib/auth/config';
import { LocaleProvider } from '@/lib/i18n/context';
import { LanguageToggle } from '@/lib/i18n/language-toggle';
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { WaslaLogo, WaslaMark } from '@/components/brand/wasla-logo';

export const metadata: Metadata = {
  title: 'أنشئ متجرك الإلكتروني مجاناً',
  description: 'متجر احترافي وطلبات ودفع وتوصيل وذكاء اصطناعي في منصة واحدة.',
};

const content = {
  ar: {
    features: 'المميزات', how: 'كيف تعمل', pricing: 'الأسعار', login: 'دخول', start: 'أنشئ متجرك مجاناً', dashboard: 'لوحة التحكم',
    eyebrow: 'منصة تجارة مصممة للسوق السوداني', title: 'متجرك الإلكتروني،', accent: 'جاهز للبيع من اليوم.',
    lead: 'أنشئ متجراً احترافياً بلا تكلفة، استقبل الطلبات والتحويلات، وأدر التوصيل والعملاء من مكان واحد. ابدأ مجاناً وطوّر باقتك عندما يكبر عملك.',
    promises: ['لا تحتاج بطاقة بنكية', 'متجرك خلال دقائق', 'عربي ومناسب للسودان'],
    section: 'كل ما تحتاجه للتشغيل', sectionTitle: 'من أول منتج إلى أول مائة طلب', sectionLead: 'أدوات عملية تساعدك على البيع والمتابعة والنمو، بدون تعقيد تقني.',
    cards: [
      ['متجر بهويتك','خصص الألوان والبنرات والأقسام وارفع صورك مباشرة.'],
      ['إدارة الطلبات','تابع الطلب من الاستلام حتى التسليم بحالات واضحة.'],
      ['دفع مرن','بنكك وماي كاشي والدفع عند الاستلام مع مطابقة الإشعار.'],
      ['توصيل متصل','اطلب عروض شركات التوصيل وتابع الشحنة والمندوب.'],
      ['ذكاء اصطناعي عملي','اكتب المحتوى وحسّن الصور وشغّل مساعد واتساب.'],
      ['تقارير واضحة','افهم مبيعاتك ومنتجاتك وعملاءك من أرقام مفيدة.'],
    ],
    stepsTitle: 'ثلاث خطوات وتبدأ البيع', steps: [['أنشئ حسابك','أدخل بيانات نشاطك الأساسية.'],['جهّز متجرك','أضف المنتجات والصور وطرق الدفع.'],['شارك وابدأ البيع','انشر رابطك وتابع الطلبات من وصلة.']],
    aiKicker: 'شريك ذكي داخل عملك', aiTitle: 'ذكاء اصطناعي ينجز، لا يستعرض', aiLead: 'محتوى أسرع، صور منتجات أفضل، ومساعد واتساب يفهم كتالوجك ويساعد في إنشاء الطلبات.',
    free: 'الأساسية', freePrice: 'مجاناً دائماً', pro: 'الاحترافية', proPrice: 'اشتراك شهري', priceLead: 'ابدأ بلا مخاطرة وادفع فقط عندما تحتاج أدوات نمو وتشغيل متقدمة.',
    freeItems: ['متجر إلكتروني كامل','منتجات وطلبات وعملاء','تحويلات وإشعارات دفع','إدارة أساسية للتوصيل'], proItems: ['كل ميزات الأساسية','تخصيص وتقارير متقدمة','الذكاء الاصطناعي','واتساب وتشغيل احترافي'],
    final: 'جاهز توصل تجارتك بالسوق؟', finalLead: 'ابدأ الآن مجاناً. لا تحتاج خبرة تقنية ولا بطاقة بنكية.',
  },
  en: {
    features: 'Features', how: 'How it works', pricing: 'Pricing', login: 'Sign in', start: 'Create your store free', dashboard: 'Dashboard',
    eyebrow: 'Commerce built for the Sudanese market', title: 'Your online store,', accent: 'ready to sell today.',
    lead: 'Launch a professional store for free, accept orders and transfers, and manage delivery and customers in one place. Upgrade only when you grow.',
    promises: ['No bank card', 'Live in minutes', 'Arabic-first and local'],
    section: 'Everything you need', sectionTitle: 'From your first product to your first 100 orders', sectionLead: 'Practical tools to sell, operate and grow without technical complexity.',
    cards: [
      ['Your own storefront','Customize colors, banners and sections and upload images directly.'],
      ['Order operations','Track every order from acceptance through delivery.'],
      ['Flexible payments','Bankak, MyCashy and COD with receipt verification.'],
      ['Connected delivery','Request partner quotes and track shipments and couriers.'],
      ['Practical AI','Write copy, improve images and enable a WhatsApp agent.'],
      ['Clear reporting','Understand your sales, products and customers.'],
    ],
    stepsTitle: 'Three steps to start selling', steps: [['Create your account','Add your essential business details.'],['Prepare your store','Add products, images and payments.'],['Share and sell','Publish your link and run orders in Wasla.']],
    aiKicker: 'An intelligent operating partner', aiTitle: 'AI that gets work done', aiLead: 'Faster content, better product photos, and a WhatsApp agent grounded in your catalog that can help create orders.',
    free: 'Basic', freePrice: 'Free forever', pro: 'Professional', proPrice: 'Monthly plan', priceLead: 'Start without risk and pay only when you need advanced growth and operations tools.',
    freeItems: ['Complete online store','Products, orders and customers','Transfers and receipts','Basic delivery management'], proItems: ['Everything in Basic','Advanced design and reports','AI tools','WhatsApp and pro operations'],
    final: 'Ready to connect your business to the market?', finalLead: 'Start free today. No technical experience or bank card required.',
  },
} as const;

const icons = [Palette, PackageCheck, CreditCard, Truck, Bot, BarChart3];

export default async function HomePage() {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = content[locale];
  const accountHref = !session?.user ? '/register' : session.user.role === 'PLATFORM_OWNER' ? '/admin' : session.user.role.startsWith('DISTRIBUTOR_') ? '/' : '/dashboard';

  return <LocaleProvider initialLocale={locale}><div className="min-h-screen overflow-hidden bg-white text-[#07111f] dark:bg-[#07111f] dark:text-white">
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#07111f]/90">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" aria-label="وصلة"><WaslaLogo /></Link>
        <nav className="hidden gap-8 text-sm font-semibold text-slate-600 md:flex dark:text-slate-300"><Link href="#features">{t.features}</Link><Link href="#how">{t.how}</Link><Link href="#pricing">{t.pricing}</Link></nav>
        <div className="flex items-center gap-2"><LanguageToggle />{!session?.user&&<Link href="/login" className="hidden rounded-xl px-4 py-2 text-sm font-bold sm:inline-flex">{t.login}</Link>}<Link href={accountHref} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20">{session?.user?t.dashboard:t.start}<ArrowLeft className="h-4 w-4 rtl:rotate-0 ltr:rotate-180"/></Link></div>
      </div>
    </header>

    <main>
      <section className="relative isolate"><div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(19,196,163,.16),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(59,130,246,.13),transparent_30%)]"/>
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div><span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"><Sparkles className="h-4 w-4"/>{t.eyebrow}</span><h1 className="mt-6 text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">{t.title}<br/><span className="bg-gradient-to-l from-[#13C4A3] to-[#3B82F6] bg-clip-text text-transparent">{t.accent}</span></h1><p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg dark:text-slate-300">{t.lead}</p><div className="mt-8"><Link href={accountHref} className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-7 py-4 font-bold text-white shadow-xl shadow-emerald-500/20 transition hover:-translate-y-1">{session?.user?t.dashboard:t.start}<ArrowLeft className="h-5 w-5 rtl:rotate-0 ltr:rotate-180"/></Link></div><div className="mt-7 flex flex-wrap gap-5 text-xs font-semibold text-slate-500">{t.promises.map(x=><span key={x} className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-[#13C4A3]"/>{x}</span>)}</div></div>
          <DashboardPreview locale={locale}/>
        </div>
      </section>

      <section id="features" className="bg-[#07111f] py-20 text-white lg:py-28"><div className="mx-auto max-w-7xl px-5 lg:px-8"><p className="text-sm font-bold text-[#13C4A3]">{t.section}</p><h2 className="mt-3 max-w-2xl text-3xl font-black sm:text-4xl">{t.sectionTitle}</h2><p className="mt-4 max-w-2xl leading-7 text-slate-400">{t.sectionLead}</p><div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{t.cards.map(([title,description],i)=>{const Icon=icons[i];return <article key={title} className="rounded-3xl border border-white/10 bg-white/[.04] p-6 transition hover:-translate-y-1 hover:border-emerald-400/30"><span className="inline-flex rounded-2xl bg-emerald-400/10 p-3 text-[#13C4A3]"><Icon className="h-6 w-6"/></span><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{description}</p></article>})}</div></div></section>

      <section id="how" className="py-20 lg:py-28 dark:bg-[#091522]"><div className="mx-auto max-w-7xl px-5 lg:px-8"><h2 className="text-center text-3xl font-black sm:text-4xl">{t.stepsTitle}</h2><div className="mt-12 grid gap-5 md:grid-cols-3">{t.steps.map(([title,description],i)=><article key={title} className="rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm dark:border-white/10 dark:bg-white/5"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#13C4A3] text-xl font-black text-white">{i+1}</span><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-500">{description}</p></article>)}</div></div></section>

      <section className="px-5 pb-20 lg:px-8 lg:pb-28 dark:bg-[#091522]"><div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#13C4A3] to-[#087d82] text-white lg:grid-cols-2"><div className="p-9 lg:p-16"><Bot className="h-9 w-9"/><p className="mt-6 text-sm font-bold text-emerald-100">{t.aiKicker}</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">{t.aiTitle}</h2><p className="mt-5 leading-8 text-emerald-50/90">{t.aiLead}</p></div><div className="grid content-center gap-4 bg-black/10 p-9 lg:p-16">{[t.cards[4][0],t.cards[2][0],t.cards[3][0]].map(x=><div key={x} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4"><Check className="h-5 w-5"/><span className="font-bold">{x}</span></div>)}</div></div></section>

      <section id="pricing" className="bg-slate-50 py-20 lg:py-28 dark:bg-[#07111f]"><div className="mx-auto max-w-5xl px-5 lg:px-8"><h2 className="text-center text-3xl font-black sm:text-4xl">{t.pricing}</h2><p className="mx-auto mt-4 max-w-xl text-center text-slate-500">{t.priceLead}</p><div className="mt-12 grid gap-5 md:grid-cols-2"><Plan title={t.free} price={t.freePrice} items={t.freeItems} href={accountHref} cta={t.start}/><Plan title={t.pro} price={t.proPrice} items={t.proItems} href={accountHref} cta={t.start} featured/></div></div></section>

      <section className="px-5 py-20"><div className="mx-auto max-w-5xl rounded-[2rem] bg-[#07111f] px-6 py-14 text-center text-white shadow-2xl"><ShoppingBag className="mx-auto h-10 w-10 text-[#13C4A3]"/><h2 className="mt-6 text-3xl font-black sm:text-4xl">{t.final}</h2><p className="mt-4 text-slate-400">{t.finalLead}</p><Link href={accountHref} className="mt-8 inline-flex rounded-2xl bg-[#13C4A3] px-7 py-4 font-bold">{session?.user?t.dashboard:t.start}</Link></div></section>
    </main>
    <footer className="border-t border-slate-200 py-8 dark:border-white/10"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 sm:flex-row lg:px-8"><WaslaLogo/><p className="text-xs text-slate-500">© {new Date().getFullYear()} WASLA · تجارتك... متصلة بكل طريق</p></div></footer>
  </div></LocaleProvider>;
}

function DashboardPreview({locale}:{locale:Locale}) { const ar=locale==='ar'; return <div className="relative mx-auto w-full max-w-xl"><div className="absolute -inset-7 -z-10 rounded-[3rem] bg-gradient-to-br from-emerald-400/20 to-blue-500/20 blur-2xl"/><div className="rounded-[2rem] border border-slate-200 bg-[#f3f5f7] p-3 shadow-2xl dark:border-white/10 dark:bg-[#0d1b2a]"><div className="rounded-[1.4rem] bg-white p-5 dark:bg-[#102235]"><div className="flex items-center gap-3"><WaslaMark/><div><p className="text-sm font-bold">{ar?'لوحة متجرك':'Your dashboard'}</p><p className="text-xs text-slate-400">wasla-sd.shop/store/your-store</p></div></div><div className="mt-6 grid grid-cols-3 gap-3">{[[ar?'مبيعات اليوم':'Sales today','48,500'],[ar?'طلبات':'Orders','12'],[ar?'منتجات':'Products','84']].map(([a,b])=><div key={a} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><p className="text-[10px] text-slate-500">{a}</p><p className="mt-2 text-lg font-black">{b}</p></div>)}</div><div className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_.6fr]"><div className="rounded-2xl border border-slate-100 p-4 dark:border-white/10"><div className="flex justify-between text-xs font-bold"><span>{ar?'طلب جديد #1048':'New order #1048'}</span><span className="text-amber-600">NEW</span></div><div className="mt-5 h-2 rounded-full bg-slate-100"><div className="h-2 w-4/5 rounded-full bg-[#13C4A3]"/></div><div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-[11px] font-bold text-emerald-700"><CreditCard className="h-4 w-4"/>{ar?'تم رفع إشعار التحويل':'Receipt uploaded'}</div></div><div className="flex flex-col justify-between rounded-2xl bg-[#07111f] p-4 text-white"><MessageCircle className="h-7 w-7 text-[#13C4A3]"/><div><p className="text-xs text-slate-400">WhatsApp AI</p><p className="font-bold">24/7</p></div></div></div></div></div></div> }

function Plan({title,price,items,href,cta,featured=false}:{title:string;price:string;items:readonly string[];href:string;cta:string;featured?:boolean}) { return <article className={`rounded-3xl border p-8 ${featured?'border-[#13C4A3] bg-[#07111f] text-white':'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'}`}><p className="font-bold text-[#13C4A3]">{title}</p><p className="mt-3 text-3xl font-black">{price}</p><ul className="mt-7 space-y-3">{items.map(x=><li key={x} className="flex gap-2 text-sm"><Check className="h-5 w-5 text-[#13C4A3]"/>{x}</li>)}</ul><Link href={href} className={`mt-8 flex justify-center rounded-xl px-5 py-3 text-sm font-bold ${featured?'bg-[#13C4A3] text-white':'bg-slate-100 dark:bg-white/10'}`}>{cta}</Link></article> }
