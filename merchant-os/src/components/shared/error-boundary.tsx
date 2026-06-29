"use client";

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
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <span className="text-4xl">⚠️</span>
        <h2 className="mt-3 text-lg font-semibold text-[var(--foreground)]">Something went wrong</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
