'use client';

import { useEffect } from 'react';


const STORAGE_KEY = 'wasla-action-feedback';
const PROTECTED_ACTION = /حفظ|تحديث|إنشاء|إرسال|إصدار|اعتماد|قبول|رفض|تفعيل|إيقاف|حذف|تعطيل|سداد|مطابقة|تأكيد|تعيين/;


/**
 * A lightweight safety net for server-action forms across dashboards. It asks
 * for a simple confirmation before any state-changing form and displays a
 * Confirmation is not proof that the server action succeeded. Client pages can opt out with
 * data-action-guard="off" when they already use the richer confirm dialog.
 */
export function ActionFeedbackGuard() {


  useEffect(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.dataset.actionGuard === 'off') return;
      const submitter = event.submitter;
      const label = submitter instanceof HTMLElement ? (submitter.innerText || submitter.getAttribute('value') || '').trim() : '';
      if (!PROTECTED_ACTION.test(label)) return;
      if (form.dataset.actionGuardConfirmed === 'true') {
        delete form.dataset.actionGuardConfirmed;
        return;
      }
      event.preventDefault();
      // Client submit handlers must not execute the cancelled original event.
      event.stopImmediatePropagation();
      if (!window.confirm(`هل تريد المتابعة في إجراء: ${label}؟`)) return;

      form.dataset.actionGuardConfirmed = 'true';
      // Browsers suppress a nested requestSubmit while the original submit
      // event is still dispatching. Submit in the next task, after that guard
      // has cleared, so accepting the confirmation works on the first click.
      window.setTimeout(() => {
        try {
          if (form.isConnected) form.requestSubmit(submitter instanceof HTMLElement ? submitter : undefined);
        } finally {
          delete form.dataset.actionGuardConfirmed;
        }
      }, 0);
    };

    document.addEventListener('submit', onSubmit, true);
    return () => document.removeEventListener('submit', onSubmit, true);
  }, []);

  return null;
}
