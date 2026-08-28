import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';

export async function getPublicPageContext() {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const accountHref = !session?.user
    ? '/register'
    : session.user.role.startsWith('PLATFORM_')
      ? '/admin'
      : session.user.role.startsWith('DISTRIBUTOR_')
        ? '/'
        : '/dashboard';
  return { locale, accountHref, signedIn: Boolean(session?.user) };
}
