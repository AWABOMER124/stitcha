'use client';

import { useLocale } from '@/lib/i18n/context';

/**
 * Shared loading component
 */
export default function Loading() {
  const { dict } = useLocale();
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-[var(--primary)]" />
        <p className="text-sm text-[var(--muted-foreground)]">{dict.common.loading}</p>
      </div>
    </div>
  );
}
