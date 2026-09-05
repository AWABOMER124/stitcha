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
    router.push("/login?partner=registered");
  }
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
