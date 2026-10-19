"use client";

import { useState } from 'react';
import { Check, Copy, KeyRound, Loader2, RotateCcw } from 'lucide-react';

type Credentials = { clientId: string; clientSecret: string; webhookSecret: string; warning: string };

export function PartnerAppCredentials({ clientId }: { clientId?: string | null }) {
  const [result, setResult] = useState<Credentials | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function generate() {
    if (clientId && !window.confirm('سيتم إلغاء المفاتيح السرية السابقة فوراً. هل تريد المتابعة؟')) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/partner/app-credentials', { method: 'POST' });
      if (!response.ok) throw new Error('تعذر إنشاء بيانات الاعتماد');
      setResult(await response.json());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر إنشاء بيانات الاعتماد'); }
    finally { setLoading(false); }
  }
  async function copy(label: string, value: string) { await navigator.clipboard.writeText(value); setCopied(label); window.setTimeout(() => setCopied(null), 1600); }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">مفاتيح تطبيق وصلة</p><p className="mt-1 text-xs leading-6 text-slate-500">تستخدم للحصول على Access Token قصير العمر. الأسرار لا تظهر مرة أخرى بعد مغادرة الصفحة.</p></div><button type="button" onClick={generate} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#07111f] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : clientId ? <RotateCcw className="size-4" /> : <KeyRound className="size-4" />}{clientId ? 'تدوير الأسرار' : 'إنشاء المفاتيح'}</button></div>
    {clientId && !result && <SecretRow label="Client ID" value={clientId} copy={copy} copied={copied} />}
    {result && <div role="status" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="text-sm font-black text-amber-950">انسخ القيم الآن — لن تظهر ثانية</p><SecretRow label="Client ID" value={result.clientId} copy={copy} copied={copied} /><SecretRow label="Client Secret" value={result.clientSecret} copy={copy} copied={copied} /><SecretRow label="Webhook Secret" value={result.webhookSecret} copy={copy} copied={copied} /></div>}
    {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
  </div>;
}

function SecretRow({ label, value, copy, copied }: { label: string; value: string; copy: (label: string, value: string) => void; copied: string | null }) {
  return <div><p className="mb-1 text-xs font-bold text-slate-600">{label}</p><div className="flex items-center gap-2 rounded-lg border bg-white p-2"><code dir="ltr" className="min-w-0 flex-1 break-all px-2 text-xs">{value}</code><button type="button" onClick={() => copy(label, value)} aria-label={`نسخ ${label}`} className="grid size-9 place-items-center rounded-lg border">{copied === label ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}</button></div></div>;
}
