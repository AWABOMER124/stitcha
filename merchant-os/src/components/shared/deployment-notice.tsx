'use client';
import { useEffect, useState } from 'react';

export function DeploymentNotice({ release }: { release: string }) {
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    let alive = true;
    const stale = () => { if (alive) setChanged(true); };
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      try { const response = await fetch('/api/deployment', { cache: 'no-store' }); const current = await response.json(); if (response.ok && current.release && current.release !== release) stale(); } catch { /* Keep the page usable while offline. Actions check separately. */ }
    };
    const timer = window.setInterval(check, 60000);
    window.addEventListener('focus', check); window.addEventListener('wasla:deployment-changed', stale);
    document.addEventListener('visibilitychange', check);
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener('focus', check); window.removeEventListener('wasla:deployment-changed', stale); document.removeEventListener('visibilitychange', check); };
  }, [release]);
  if (!changed) return null;
  return <aside role="alert" dir="rtl" className="fixed inset-x-3 bottom-3 z-[1000] mx-auto max-w-3xl rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-xl print:hidden"><p className="font-bold">تم تحديث الموقع. حدّث الصفحة قبل متابعة الحفظ أو إنشاء البوليصة.</p><p className="mt-2 text-sm">انسخ التعديلات غير المحفوظة قبل التحديث. لن نعيد إرسال أي إجراء تلقائيًا.</p><button onClick={() => window.location.reload()} className="mt-3 rounded-xl bg-amber-900 px-4 py-2 font-bold text-white">تحديث الصفحة</button></aside>;
}
