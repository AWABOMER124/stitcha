"use client";

import { useLocale } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { isDeploymentError } from '@/lib/deployment-guard';

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
  if (isDeploymentError(error)) return <section dir="rtl" role="alert" className="mx-auto max-w-xl space-y-4 rounded-2xl border bg-amber-50 p-6 text-amber-950"><h2 className="text-lg font-bold">توجد نسخة أحدث من الموقع</h2><p>حدّث الصفحة ثم راجع البيانات قبل تنفيذ الإجراء مرة أخرى. لم نعد إرسال الطلب تلقائيًا.</p><Button onClick={() => window.location.reload()}>تحديث الصفحة</Button></section>;
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
