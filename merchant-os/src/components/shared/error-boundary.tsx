"use client";

import { useLocale } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';

/**
 * Error boundary component
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { dict } = useLocale();
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <span className="text-4xl">⚠️</span>
        <h2 className="mt-3 text-lg font-semibold text-[var(--foreground)]">{dict.common.somethingWrong}</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{error.message}</p>
        <Button onClick={reset} className="mt-4">
          {dict.common.tryAgain}
        </Button>
      </div>
    </div>
  );
}
