"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InternationalPhoneInput } from '@/components/ui/international-phone-input';

export default function DeliveryPartnerRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+249');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'form'|'verify'>('form');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register-delivery-partner", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(form), countryCode, phone }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setError(data.error ?? "تعذر إنشاء الحساب");
    setUserId(data.userId);
    setEmail(String(form.get('email') ?? ''));
    setStep('verify');
    if (!data.otpSent) setError(data.warning ?? 'تم إنشاء الحساب، لكن تعذر إرسال رمز البريد. يمكنك إعادة المحاولة أو تأكيد واتساب بعد تسجيل الدخول.');
  }
  async function verify(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch('/api/auth/verify-account', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({userId,channel:'EMAIL',code}) });
      const data = await response.json();
      if (!response.ok) return setError(data.error ?? 'تعذر تأكيد البريد');
      router.push('/login?partner=verified');
    } catch { setError('تعذر الاتصال. حاول مرة أخرى.'); }
    finally { setLoading(false); }
  }
  async function resend() {
    setLoading(true); setError('');
    try { const response=await fetch('/api/auth/verify-account/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId,channel:'EMAIL'})}); const data=await response.json(); if(!response.ok)setError(data.error??'تعذر إرسال الرمز'); }
    catch { setError('تعذر الاتصال. حاول مرة أخرى.'); }
    finally { setLoading(false); }
  }
  if (step === 'verify') return <div className="space-y-6" dir="rtl"><div><p className="text-sm font-bold text-[var(--primary)]">شركاء وصلة</p><h1 className="mt-2 text-3xl font-black">تأكيد البريد الإلكتروني</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">أرسلنا رمزاً من 6 أرقام إلى <b dir="ltr">{email}</b></p></div><form onSubmit={verify} className="space-y-4 rounded-2xl border bg-[var(--card)] p-6 shadow-sm">{error&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<input required autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} className="w-full rounded-xl border p-4 text-center text-2xl font-black tracking-[.4em]"/><button disabled={loading||code.length!==6} className="w-full rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white disabled:opacity-50">{loading?'جارٍ التأكيد…':'تأكيد الحساب'}</button><button type="button" onClick={resend} disabled={loading} className="w-full text-sm font-bold text-[var(--primary)] disabled:opacity-50">إعادة إرسال الرمز</button><Link href="/login" className="block text-center text-sm underline">تأكيد واتساب أو تسجيل الدخول لاحقاً</Link></form></div>;
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <p className="text-sm font-bold text-[var(--primary)]">شركاء وصلة</p>
        <h1 className="mt-2 text-3xl font-black">انضم كشريك توصيل</h1>
        <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
          أنشئ حساب شركتك، أضف تطبيقك ومناطق وأسعار الخدمة، ثم أرسل طلب النشر
          ليظهر للتجار.
        </p>
      </div>
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
      >
        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <Field name="companyName" label="اسم شركة التوصيل" />
        <Field name="ownerName" label="اسم المسؤول" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="email" label="البريد الإلكتروني" type="email" />
          <label className="block text-sm font-semibold">رقم الهاتف / واتساب
            <div className="mt-2"><InternationalPhoneInput countryCode={countryCode} phone={phone} onCountryCodeChange={setCountryCode} onPhoneChange={setPhone} required disabled={loading} /></div>
            <p className="mt-2 text-xs font-normal text-[var(--muted-foreground)]">اختر مفتاح الدولة ثم اكتب الرقم. يتاح «مفتاح دولة آخر» لأي دولة.</p>
          </label>
        </div>
        <Field
          name="password"
          label="كلمة المرور"
          type="password"
          minLength={8}
        />
        <button
          disabled={loading}
          className="w-full rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          {loading ? "جارٍ إنشاء الحساب…" : "إنشاء حساب الشريك"}
        </button>
        <p className="text-center text-sm text-[var(--muted-foreground)]">
          لديك حساب؟{" "}
          <Link className="font-bold text-[var(--primary)]" href="/login">
            تسجيل الدخول
          </Link>
        </p>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  minLength,
}: {
  name: string;
  label: string;
  type?: string;
  minLength?: number;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        name={name}
        type={type}
        minLength={minLength}
        required
        className="mt-2 w-full rounded-xl border border-[var(--input)] bg-transparent px-3 py-3 outline-none focus:border-[var(--primary)]"
      />
    </label>
  );
}
