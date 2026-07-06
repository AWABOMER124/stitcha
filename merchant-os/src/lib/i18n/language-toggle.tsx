'use client';

import { useLocale } from './context';

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      aria-label="Toggle language"
    >
      <span>🌐</span>
      <span>{locale === 'ar' ? 'English' : 'العربية'}</span>
    </button>
  );
}
