'use client';

import { ToastProvider } from '@/components/ui/toast';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { ActionFeedbackGuard } from '@/components/ui/action-feedback-guard';

/**
 * Combines the toast and confirm-dialog providers. Must be rendered
 * inside LocaleProvider since ConfirmProvider reads translated labels.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider><ActionFeedbackGuard />{children}</ConfirmProvider>
    </ToastProvider>
  );
}
