import { cookies } from "next/headers";
import Link from 'next/link';
import { LocaleProvider } from "@/lib/i18n/context";
import { LanguageToggle } from "@/lib/i18n/language-toggle";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/translations";
import { WaslaLogo } from '@/components/brand/wasla-logo';
import { BadgeCheck, LayoutDashboard, ShieldCheck, Sparkles } from 'lucide-react';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialLocale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? undefined;
  const isArabic = initialLocale !== 'en';

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <LocaleProvider initialLocale={initialLocale}>
        <div className="grid min-h-screen lg:grid-cols-[.88fr_1.12fr]">
          <aside className="relative hidden overflow-hidden bg-[#07111f] p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(19,196,163,.25),transparent_28%),radial-gradient(circle_at_90%_80%,rgba(59,130,246,.2),transparent_32%)]" />
            <div className="relative"><WaslaLogo inverse/><div className="mt-20 max-w-lg"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-300"><Sparkles className="h-4 w-4"/>{isArabic?'ابدأ تجارتك الإلكترونية اليوم':'Start selling online today'}</span><h2 className="mt-6 text-4xl font-black leading-tight">{isArabic?'كل ما يحتاجه متجرك':'Everything your store needs'}<br/><span className="text-[#13C4A3]">{isArabic?'في منصة واحدة.':'in one platform.'}</span></h2><p className="mt-5 leading-8 text-slate-400">{isArabic?'أنشئ متجرك مجاناً، أضف منتجاتك، واستقبل الطلبات والتحويلات بسهولة.':'Create your store free, add products, and accept orders and transfers with ease.'}</p></div></div>
            <div className="relative grid grid-cols-3 gap-3">
              <AuthBenefit icon={<LayoutDashboard className="h-5 w-5"/>} label={isArabic?'إدارة سهلة':'Easy operations'}/><AuthBenefit icon={<BadgeCheck className="h-5 w-5"/>} label={isArabic?'خطة مجانية':'Free plan'}/><AuthBenefit icon={<ShieldCheck className="h-5 w-5"/>} label={isArabic?'بيانات آمنة':'Secure data'}/>
            </div>
          </aside>
          <main className="flex min-h-screen items-center justify-center p-5 sm:p-8">
            <div className="w-full max-w-xl">
              <div className="mb-5 flex items-center justify-between lg:justify-end"><Link href="/" className="lg:hidden"><WaslaLogo compact/></Link><LanguageToggle /></div>
              {children}
            </div>
          </main>
        </div>
      </LocaleProvider>
    </div>
  );
}

function AuthBenefit({icon,label}:{icon:React.ReactNode;label:string}) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-[#13C4A3]">{icon}<p className="mt-3 text-xs font-bold text-white">{label}</p></div>;
}
