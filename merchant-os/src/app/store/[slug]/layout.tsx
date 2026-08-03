import { cookies } from 'next/headers';
import { LocaleProvider } from '@/lib/i18n/context';
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLocale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? undefined;
  return <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>;
}
