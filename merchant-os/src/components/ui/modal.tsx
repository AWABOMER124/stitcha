'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/** Generic modal shell — same overlay/visual language as ConfirmDialog, for anything richer than a yes/no prompt (forms, detail views). */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-w-lg rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-2xl focus:outline-none',
          className
        )}
      >
        {title && <h2 className="text-base font-bold text-[var(--foreground)] mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
