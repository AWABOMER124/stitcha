'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Locale } from '@/lib/i18n/translations';

type StoreOption = { id: string; name: string; slug: string; rate: number; currency: string; terms: string | null };
type ProgramType = 'MERCHANT_ACQUISITION' | 'STOREFRONT_PRODUCTS';

const channels = ['WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'FIELD_SALES', 'OTHER'] as const;
const channelNames: Record<typeof channels[number], [string,string]> = {
  WHATSAPP: ['واتساب','WhatsApp'], FACEBOOK: ['فيسبوك','Facebook'], INSTAGRAM: ['إنستغرام','Instagram'],
  TIKTOK: ['تيك توك','TikTok'], FIELD_SALES: ['تسويق ميداني','Field sales'], OTHER: ['أخرى','Other'],
};

export function MarketerApplicationForm({ locale, stores }: { locale: Locale; stores: StoreOption[] }) {
  const ar = locale === 'ar';
  const [type, setType] = useState<ProgramType>('MERCHANT_ACQUISITION');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true);
    const form = new FormData(event.currentTarget);
    const audienceRaw = String(form.get('audienceSize') ?? '').trim();
    const payload = {
      type,
      merchantId: type === 'STOREFRONT_PRODUCTS' ? String(form.get('merchantId') ?? '') : undefined,
      name: form.get('name'), phone: form.get('phone'), email: form.get('email'), city: form.get('city'),
      channels: selectedChannels, experience: form.get('experience'),
      audienceSize: audienceRaw ? Number(audienceRaw) : undefined,
      portfolioUrl: form.get('portfolioUrl'), notes: form.get('notes'), acceptTerms: form.get('acceptTerms') === 'on',
    };
    try {
      const response = await fetch('/api/marketers/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) setError(data.error || (ar ? 'تعذر إرسال الطلب' : 'Could not submit application'));
      else setReference(data.applicationId);
    } catch { setError(ar ? 'تعذر الاتصال. حاول مرة أخرى.' : 'Connection failed. Try again.'); }
    finally { setLoading(false); }
  }

  if (reference) return <section className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm dark:border-emerald-400/20 dark:bg-white/5"><div className="text-5xl">✅</div><h2 className="mt-5 text-2xl font-black">{ar ? 'تم استلام طلبك' : 'Application received'}</h2><p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{ar ? 'سنراجع البيانات ثم نتواصل معك عبر واتساب أو البريد. لا تبدأ الترويج قبل استلام رابطك المعتمد.' : 'We will review your details and contact you by WhatsApp or email. Do not promote before receiving your approved link.'}</p><p className="mt-4 text-xs text-slate-400">{ar ? 'رقم المرجع' : 'Reference'}: <b dir="ltr">{reference}</b></p><Link href="/" className="mt-7 inline-flex rounded-xl bg-[#087d82] px-6 py-3 font-bold text-white">{ar ? 'العودة للرئيسية' : 'Back home'}</Link></section>;

  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-8" dir={ar?'rtl':'ltr'}><h2 className="text-2xl font-black">{ar ? 'طلب الانضمام' : 'Apply to join'}</h2><p className="mt-2 text-sm text-slate-500">{ar ? 'اختر البرنامج المناسب وأرسل معلومات حقيقية قابلة للتحقق.' : 'Choose the right program and submit verifiable details.'}</p>
    <div className="mt-6 grid gap-3 sm:grid-cols-2">{([['MERCHANT_ACQUISITION',ar?'استقطاب تجار':'Merchant acquisition'],['STOREFRONT_PRODUCTS',ar?'تسويق منتجات':'Product marketing']] as const).map(([value,label])=><button key={value} type="button" onClick={()=>setType(value)} className={`rounded-2xl border p-4 text-start font-bold transition ${type===value?'border-[#087d82] bg-[#e9f7f4] text-[#075f63]':'border-slate-200 dark:border-white/10'}`}>{label}</button>)}</div>
    <form onSubmit={submit} className="mt-6 space-y-5">
      {type==='STOREFRONT_PRODUCTS' && <label className="block text-sm font-bold">{ar?'المتجر':'Store'}<select name="merchantId" required className="mt-2 w-full rounded-xl border bg-transparent p-3"><option value="">{ar?'اختر متجراً':'Select a store'}</option>{stores.map(store=><option key={store.id} value={store.id}>{store.name} — {store.rate}% {store.currency}</option>)}</select>{!stores.length&&<span className="mt-2 block text-xs text-amber-700">{ar?'لا توجد برامج متاجر مفتوحة حالياً. يمكنك العودة لاحقاً.':'No store programs are currently open.'}</span>}</label>}
      <div className="grid gap-4 sm:grid-cols-2"><Field name="name" label={ar?'الاسم الكامل':'Full name'} required/><Field name="phone" label={ar?'رقم واتساب السوداني':'Sudanese WhatsApp number'} type="tel" placeholder="+249..." required/><Field name="email" label={ar?'البريد الإلكتروني':'Email'} type="email" required/><Field name="city" label={ar?'المدينة':'City'} required/></div>
      <fieldset><legend className="text-sm font-bold">{ar?'قنوات التسويق':'Marketing channels'}</legend><div className="mt-3 flex flex-wrap gap-2">{channels.map(channel=>{const active=selectedChannels.includes(channel);return <button key={channel} type="button" onClick={()=>setSelectedChannels(current=>active?current.filter(x=>x!==channel):[...current,channel])} className={`rounded-full border px-4 py-2 text-sm ${active?'border-[#087d82] bg-[#087d82] text-white':'border-slate-200 dark:border-white/10'}`}>{channelNames[channel][ar?0:1]}</button>})}</div>{!selectedChannels.length&&<p className="mt-2 text-xs text-slate-400">{ar?'اختر قناة واحدة على الأقل.':'Choose at least one channel.'}</p>}</fieldset>
      <label className="block text-sm font-bold">{ar?'خبرتك وطريقة عملك':'Experience and approach'}<textarea name="experience" rows={4} maxLength={1000} className="mt-2 w-full rounded-xl border bg-transparent p-3" placeholder={ar?'عرّفنا بجمهورك وطريقة الوصول للعملاء...':'Tell us about your audience and approach...'}/></label>
      <div className="grid gap-4 sm:grid-cols-2"><Field name="audienceSize" label={ar?'حجم الجمهور التقريبي':'Approx. audience'} type="number" min="0"/><Field name="portfolioUrl" label={ar?'رابط أعمال أو حساب':'Portfolio or profile URL'} type="url" placeholder="https://..."/></div>
      <label className="block text-sm font-bold">{ar?'ملاحظات إضافية':'Additional notes'}<textarea name="notes" rows={3} maxLength={1000} className="mt-2 w-full rounded-xl border bg-transparent p-3"/></label>
      <label className="flex items-start gap-3 text-sm leading-6"><input name="acceptTerms" type="checkbox" required className="mt-1"/><span>{ar?'أؤكد صحة البيانات وأوافق على ': 'I confirm the details and accept the '}<Link href="/terms" className="font-bold text-[#087d82] underline">{ar?'الشروط':'terms'}</Link>{ar?' و': ' and '}<Link href="/privacy" className="font-bold text-[#087d82] underline">{ar?'سياسة الخصوصية':'privacy policy'}</Link>.</span></label>
      {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={loading||!selectedChannels.length||(type==='STOREFRONT_PRODUCTS'&&!stores.length)} className="w-full rounded-xl bg-[#087d82] px-5 py-3.5 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{loading?(ar?'جارٍ الإرسال...':'Submitting...'):(ar?'إرسال طلب الانضمام':'Submit application')}</button>
    </form>
  </section>;
}

function Field({label,...props}:{label:string}&React.InputHTMLAttributes<HTMLInputElement>){return <label className="block text-sm font-bold">{label}<input {...props} className="mt-2 w-full rounded-xl border bg-transparent p-3"/></label>}
