'use client';

import { useLocale } from '@/lib/i18n/context';

export function SkipLink() {
  const { dict } = useLocale();

  return (
    <a
      href="#main-content"
      className="fixed start-4 top-4 z-[200] -translate-y-24 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] shadow-lg transition-transform focus:translate-y-0"
    >
      {dict.common.skipToContent}
    </a>
  );
}
