import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LanguageToggle } from '@/lib/i18n/language-toggle';
import type { Locale } from '@/lib/i18n/translations';
import { WaslaLogo } from '@/components/brand/wasla-logo';

export function PublicHeader({ locale, accountHref, signedIn = false }: {
  locale: Locale;
  accountHref: string;
  signedIn?: boolean;
}) {
  const ar = locale === 'ar';
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-white/10 dark:bg-[#07111f]/95">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" aria-label="وصلة"><WaslaLogo /></Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex dark:text-slate-300">
          <Link href="/#features" className="hover:text-[#087d82]">{ar ? 'المميزات' : 'Features'}</Link>
          <Link href="/#how" className="hover:text-[#087d82]">{ar ? 'كيف تبدأ' : 'How it works'}</Link>
          <Link href="/#pricing" className="hover:text-[#087d82]">{ar ? 'الباقات' : 'Plans'}</Link>
          <Link href="/blog" className="hover:text-[#087d82]">{ar ? 'المدونة' : 'Blog'}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {!signedIn && <Link href="/login" className="hidden rounded-xl px-3 py-2 text-sm font-bold sm:inline-flex">{ar ? 'دخول' : 'Sign in'}</Link>}
          <Link href={accountHref} className="inline-flex items-center gap-2 rounded-xl bg-[#087d82] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#06666a]">
            {signedIn ? (ar ? 'لوحة التحكم' : 'Dashboard') : (ar ? 'ابدأ مجاناً' : 'Start free')}
            <ArrowLeft className="h-4 w-4 ltr:rotate-180" />
          </Link>
        </div>
      </div>
    </header>
  );
}
export function PublicFooter({ locale }: { locale: Locale }) {
  const ar = locale === 'ar';
  return (
    <footer className="border-t border-slate-200 bg-white py-10 dark:border-white/10 dark:bg-[#07111f]">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <WaslaLogo />
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">{ar ? 'منصة سودانية تساعد التجار على إنشاء متجر، إدارة الطلبات، واستقبال المدفوعات والتوصيل من مكان واحد.' : 'A Sudanese commerce platform for storefronts, orders, payments and delivery in one place.'}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Link href="/blog">{ar ? 'المدونة' : 'Blog'}</Link>
          <Link href="/privacy">{ar ? 'الخصوصية' : 'Privacy'}</Link>
          <Link href="/terms">{ar ? 'الشروط والأحكام' : 'Terms'}</Link>
          <Link href="/register">{ar ? 'إنشاء متجر' : 'Create a store'}</Link>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-slate-100 px-5 pt-6 text-xs text-slate-500 lg:px-8">© {new Date().getFullYear()} WASLA · {ar ? 'تجارتك... متصلة بكل طريق' : 'Your business, connected to every path'}</div>
    </footer>
  );
}
