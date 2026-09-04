'use client';

import { useState } from 'react';
import { askMerchantCopilotAction } from '@/modules/merchant-copilot/actions';

const suggestions = ['كيف أداء متجري خلال آخر 30 يوم؟', 'شنو المنتجات الأكثر مبيعاً؟', 'هل عندي طلبات متأخرة أو مخزون منخفض؟'];

export function MerchantCopilotClient({ remaining }: { remaining: number }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'merchant' | 'assistant'; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function ask(value = question) {
    const safe = value.trim(); if (!safe || loading) return;
    setLoading(true); setError(''); setMessages((current) => [...current, { role: 'merchant', text: safe }]); setQuestion('');
    const result = await askMerchantCopilotAction(safe, crypto.randomUUID()).catch(() => null);
    setLoading(false);
    if (result?.success) setMessages((current) => [...current, { role: 'assistant', text: result.data.answer }]);
    else setError((result && !result.success ? result.error : null) || 'تعذر الاتصال بمساعد وصلة');
  }
  return (
    <div className="mx-auto max-w-3xl space-y-5" dir="rtl">
      <header><h1 className="text-2xl font-black">مساعد وصلة</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">محلل قراءة فقط لبيانات آخر 30 يوماً. لا يغيّر الطلبات أو الأسعار أو المخزون.</p></header>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-xs text-[var(--muted-foreground)]">المتبقي هذا الشهر: <strong className="text-[var(--foreground)]">{remaining === -1 ? 'غير محدود' : remaining}</strong> سؤال</div>
      {messages.length === 0 && <div className="grid gap-2 sm:grid-cols-3">{suggestions.map((item) => <button key={item} onClick={() => ask(item)} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-start text-sm font-semibold hover:border-[var(--primary)]">{item}</button>)}</div>}
      {messages.length > 0 && <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">{messages.map((message, index) => <div key={index} className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-7 ${message.role === 'merchant' ? 'me-auto bg-[var(--primary)] text-white' : 'ms-auto bg-[var(--muted)] text-[var(--foreground)]'}`}>{message.text}</div>)}{loading && <p className="text-xs text-[var(--muted-foreground)]">يحلل بيانات متجرك الفعلية…</p>}</section>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} <a href="/dashboard/subscription" className="font-bold underline">عرض الباقات</a></div>}
      <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:flex-row"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} rows={2} placeholder="اسأل عن المبيعات أو الطلبات أو المخزون…" className="min-w-0 flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" /><button onClick={() => ask()} disabled={loading || !question.trim()} className="rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white disabled:opacity-50">{loading ? 'جارٍ التحليل…' : 'اسأل'}</button></div>
    </div>
  );
}
