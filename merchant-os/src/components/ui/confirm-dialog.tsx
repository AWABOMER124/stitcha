'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useLocale } from '@/lib/i18n/context';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { dict } = useLocale();
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirmDialog = useCallback<ConfirmFn>((options) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    setState(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function handle(result: boolean) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirmDialog}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-2xl">
            {state.title && (
              <h2 className="text-base font-bold text-[var(--foreground)] mb-2">{state.title}</h2>
            )}
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{state.message}</p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => handle(true)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 ${
                  state.danger ? 'bg-red-600' : 'bg-[var(--primary)]'
                }`}
              >
                {state.confirmLabel ?? dict.common.confirm}
              </button>
              <button
                onClick={() => handle(false)}
                className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                {state.cancelLabel ?? dict.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
