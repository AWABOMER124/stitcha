'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, LOCALE_COOKIE, dictionaries, type Dictionary, type Locale } from './translations';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dict: Dictionary;
  dir: 'rtl' | 'ltr';
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=(ar|en)`));
  return (match?.[1] as Locale) ?? null;
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  // Lazy initializer: SSR-safe (readLocaleCookie returns null server-side)
  // and matches initialLocale from the server-read cookie, so no hydration
  // mismatch or extra re-render is needed to pick up a saved preference.
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? readLocaleCookie() ?? DEFAULT_LOCALE);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }, []);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
  }, [dir]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, dict: dictionaries[locale], dir }),
    [locale, setLocale, dir],
  );

  return (
    <LocaleContext.Provider value={value}>
      <div dir={dir}>{children}</div>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}
