'use client';
import { useState } from 'react';
export function PartnerLogoUpload({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setMessage('الحد الأقصى 5 ميجابايت');
    setPending(true); setMessage('');
    try {
      const body = new FormData(); body.set('image', file);
      const response = await fetch('/api/partner/logo', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'تعذر رفع الصورة');
      setUrl(data.url); setMessage('تم رفع الشعار وحفظه');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر رفع الصورة'); }
    finally { setPending(false); }
  }
  return <div className="flex flex-wrap items-center gap-5 rounded-xl bg-[var(--muted)] p-5">
    {/* Public image storage supports local and S3 URLs without an image proxy. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {url ? <img src={url} alt="شعار تطبيق الشحن" className="h-24 w-24 rounded-2xl border bg-white object-contain p-2" /> : <div className="flex h-24 w-24 items-center justify-center rounded-2xl border bg-white text-3xl" aria-label="لم يرفع شعار">📦</div>}
    <div className="min-w-0 flex-1"><label className="block font-bold">شعار التطبيق<input type="file" accept="image/png,image/jpeg,image/webp" disabled={pending} className="mt-3 block max-w-full text-sm" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} /></label><p className="mt-2 text-xs leading-6">PNG / JPEG / WebP حتى 5 ميجابايت. يُرفع ويُحفظ مباشرة؛ يفضل شعار مربع بخلفية شفافة.</p><p role="status" className="mt-2 text-sm">{pending ? 'جارٍ رفع الشعار…' : message}</p></div>
  </div>;
}
