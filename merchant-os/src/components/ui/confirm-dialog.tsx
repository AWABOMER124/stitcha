'use client';

import { createContext, useCallback, useContext, useId, useRef, useState } from 'react';
import { useLocale } from '@/lib/i18n/context';
import { Modal } from './modal';

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
  const descriptionId = useId();

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
      <Modal
        open={state !== null}
        onClose={() => handle(false)}
        title={state?.title ?? dict.common.confirm}
        describedBy={descriptionId}
        className="max-w-sm"
      >
        {state && (
          <>
            <p id={descriptionId} className="text-sm text-[var(--muted-foreground)] leading-relaxed">{state.message}</p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => handle(true)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ${
                  state.danger ? 'bg-red-600' : 'bg-[var(--primary)]'
                }`}
              >
                {state.confirmLabel ?? dict.common.confirm}
              </button>
              <button
                data-autofocus
                onClick={() => handle(false)}
                className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                {state.cancelLabel ?? dict.common.cancel}
              </button>
            </div>
          </>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
