'use client';

import { useLocale } from './context';
import { useRouter } from 'next/navigation';

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const router = useRouter();

  function switchLanguage() {
    setLocale(locale === 'ar' ? 'en' : 'ar');
    // Server-rendered marketing and dashboard pages read the locale cookie.
    // Refreshing preserves the current URL while making their copy switch too.
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      aria-label="Toggle language"
    >
      <span>🌐</span>
      <span>{locale === 'ar' ? 'English' : 'العربية'}</span>
    </button>
  );
}
