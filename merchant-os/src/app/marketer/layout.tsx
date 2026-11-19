import { cookies } from 'next/headers';
import { AppProviders } from '@/components/ui/app-providers';
import { LocaleProvider } from '@/lib/i18n/context';
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { auth } from '@/lib/auth/config';
import { InboxBell } from '@/components/communications/inbox-bell';

export default async function MarketerLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLocale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? 'ar';
  const session = await auth();
  return <LocaleProvider initialLocale={initialLocale}><AppProviders>{session?.user?.id && <div dir="rtl" className="flex justify-end bg-slate-50 px-5 pt-4"><InboxBell /></div>}{children}</AppProviders></LocaleProvider>;
}
