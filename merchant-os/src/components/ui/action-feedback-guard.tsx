'use client';

import { useEffect } from 'react';
import { useToast } from './toast';

const STORAGE_KEY = 'wasla-action-feedback';
const PROTECTED_ACTION = /حفظ|تحديث|إنشاء|إرسال|إصدار|اعتماد|قبول|رفض|تفعيل|إيقاف|حذف|تعطيل|سداد|مطابقة|تأكيد|تعيين/;

function messageFor(label: string) {
  if (/إرسال/.test(label)) return 'تم إرسال الإجراء للمراجعة.';
  if (/حذف/.test(label)) return 'تم تنفيذ طلب الحذف.';
  if (/رفض/.test(label)) return 'تم إرسال قرار الرفض.';
  if (/قبول|اعتماد|تفعيل|مطابقة|تأكيد/.test(label)) return 'تم إرسال القرار للتنفيذ.';
  if (/إيقاف|تعطيل/.test(label)) return 'تم إرسال طلب الإيقاف.';
  if (/إنشاء|إصدار/.test(label)) return 'تم إنشاء الطلب بنجاح.';
  return 'تم حفظ التغييرات.';
}

/**
 * A lightweight safety net for server-action forms across dashboards. It asks
 * for a simple confirmation before any state-changing form and displays a
 * clear post-navigation acknowledgement. Client pages can opt out with
 * data-action-guard="off" when they already use the richer confirm dialog.
 */
export function ActionFeedbackGuard() {
  const toast = useToast();

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      sessionStorage.removeItem(STORAGE_KEY);
      toast.success(saved);
    }

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
      sessionStorage.setItem(STORAGE_KEY, messageFor(label));
      form.dataset.actionGuardConfirmed = 'true';
      form.requestSubmit(submitter instanceof HTMLElement ? submitter : undefined);
    };

    document.addEventListener('submit', onSubmit, true);
    return () => document.removeEventListener('submit', onSubmit, true);
  }, [toast]);

  return null;
}
