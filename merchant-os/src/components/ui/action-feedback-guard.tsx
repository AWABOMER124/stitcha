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
      if (!window.confirm(`هل تريد المتابعة في إجراء: ${label}؟`)) return;

      form.dataset.actionGuardConfirmed = 'true';
      form.requestSubmit(submitter instanceof HTMLElement ? submitter : undefined);
    };

    document.addEventListener('submit', onSubmit, true);
    return () => document.removeEventListener('submit', onSubmit, true);
  }, []);

  return null;
}
