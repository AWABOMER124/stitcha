import { cookies } from 'next/headers';
import { AppProviders } from '@/components/ui/app-providers';
import { LocaleProvider } from '@/lib/i18n/context';
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';

export default async function MarketerLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLocale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? 'ar';
  return <LocaleProvider initialLocale={initialLocale}><AppProviders>{children}</AppProviders></LocaleProvider>;
}
