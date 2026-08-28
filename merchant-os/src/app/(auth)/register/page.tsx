"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useLocale } from "@/lib/i18n/context";
import { Check, Eye, EyeOff, MessageCircle, ShieldCheck, Store } from 'lucide-react';

/**
 * Merchant registration page for WASLA Commerce OS
 */
export default function RegisterPage() {
  const { dict, locale } = useLocale();
  const router = useRouter();
  const [formData, setFormData] = useState({
    merchantName: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    businessType: "RESTAURANT",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [verificationToken, setVerificationToken] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const passwordChecks = useMemo(() => [formData.password.length >= 8, /[A-Za-z]/.test(formData.password), /\d/.test(formData.password)], [formData.password]);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError(dict.register.passwordsNoMatch);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
      } else {
        setVerificationToken(data.verificationToken);
        setSentTo(data.phone);
        setStep('otp');
        setError(data.otpSent ? '' : (data.warning || 'تم إنشاء الحساب، لكن تعذر إرسال الرمز. حاول إعادة الإرسال.'));
      }
    } catch {
      setError(dict.common.somethingWrong);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-phone', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationToken, code }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'فشل تأكيد الرقم');
      const signInResult = await signIn('credentials', {
        email: formData.email, password: formData.password, redirect: false,
      });
      router.replace(signInResult?.error ? '/login' : '/dashboard');
    } catch {
      setError(dict.common.somethingWrong);
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-phone/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationToken }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'تعذر إعادة إرسال الرمز');
    } catch {
      setError(dict.common.somethingWrong);
    } finally {
      setLoading(false);
    }
  }

  const businessTypes = [
    { value: "RESTAURANT", label: dict.register.types.RESTAURANT },
    { value: "CAFE", label: dict.register.types.CAFE },
    { value: "GROCERY", label: dict.register.types.GROCERY },
    { value: "PHARMACY", label: dict.register.types.PHARMACY },
    { value: "RETAIL", label: dict.register.types.RETAIL },
    { value: "OTHER", label: dict.register.types.OTHER },
  ];

  if (step === 'otp') {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"><MessageCircle className="h-7 w-7" /></div>
          <h1 className="text-2xl font-bold">تأكيد رقم واتساب</h1>
          <p className="text-sm text-[var(--muted-foreground)]">أرسلنا رمزاً من 6 أرقام إلى <b dir="ltr">{sentTo}</b></p>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={verifyCode} className="space-y-5">
            <label htmlFor="otp-code" className="block text-center text-sm font-semibold">رمز التأكيد</label>
            <input id="otp-code" autoFocus required inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-2xl border border-[var(--input)] bg-transparent px-4 py-4 text-center text-3xl font-bold tracking-[0.45em] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20" dir="ltr" />
            <button disabled={loading || code.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 font-bold text-white disabled:opacity-50">
              <ShieldCheck className="h-5 w-5" />{loading ? 'جارٍ التأكيد...' : 'تأكيد وتفعيل المتجر'}
            </button>
          </form>
          <div className="mt-5 text-center text-sm">
            <button type="button" disabled={loading} onClick={resendCode} className="font-semibold text-[var(--primary)] disabled:opacity-50">إعادة إرسال الرمز</button>
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-[var(--muted-foreground)]">الرمز صالح لمدة 10 دقائق. لا تشاركه مع أي شخص، وفريق وصلة لن يطلبه منك.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Logo & Title */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-lg shadow-emerald-500/20"><Store className="h-7 w-7"/></div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {dict.register.title}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {dict.register.subtitle}
        </p>
      </div>

      {/* Registration Form */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl shadow-slate-900/5 sm:p-7">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Business Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              {dict.register.businessType}
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {businessTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => updateField("businessType", type.value)}
                  className={`rounded-lg border p-2.5 text-xs font-medium transition-all ${
                    formData.businessType === type.value
                      ? "border-[var(--primary)] bg-red-50 dark:bg-red-950/30 text-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="merchantName" className="block text-sm font-medium text-[var(--foreground)]">
                {dict.register.businessName}
              </label>
              <input
                id="merchantName"
                type="text"
                value={formData.merchantName}
                onChange={(e) => updateField("merchantName", e.target.value)}
                placeholder={dict.register.businessNamePlaceholder}
                required
                className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="ownerName" className="block text-sm font-medium text-[var(--foreground)]">
                {dict.register.yourName}
              </label>
              <input
                id="ownerName"
                type="text"
                value={formData.ownerName}
                onChange={(e) => updateField("ownerName", e.target.value)}
                placeholder={dict.register.fullNamePlaceholder}
                required
                className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-email" className="block text-sm font-medium text-[var(--foreground)]">
              {dict.common.email}
            </label>
            <input
              id="reg-email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm font-medium text-[var(--foreground)]">
              {dict.common.phone}
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder={dict.register.phonePlaceholder}
              required
              className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="reg-password" className="block text-sm font-medium text-[var(--foreground)]">
                {dict.common.password}
              </label>
              <div className="relative"><input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 pe-10 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
              /><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">{showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--foreground)]">
                {dict.common.confirmPassword}
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 rounded-xl bg-[var(--muted)]/60 p-3 text-[11px] text-[var(--muted-foreground)]">
            {passwordChecks.map((ok,i)=><span key={i} className={`flex items-center gap-1 ${ok?'font-bold text-emerald-600':''}`}><Check className="h-3 w-3"/>{['8+','A-Z','0-9'][i]}</span>)}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-[var(--primary-foreground)] shadow-lg shadow-emerald-500/15 transition-all hover:-translate-y-0.5 hover:bg-[var(--primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? dict.register.creatingStore : dict.register.createAccount}
          </button>
        </form>
        <p className="mt-4 text-center text-[11px] leading-5 text-[var(--muted-foreground)]">{locale==='ar'?'الباقة الأساسية مجانية ولا تحتاج بطاقة بنكية. بإنشاء الحساب أنت توافق على شروط الاستخدام وسياسة الخصوصية.':'The Basic plan is free and requires no bank card. By creating an account, you agree to the Terms and Privacy Policy.'}</p>
      </div>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {dict.register.alreadyHaveAccount}{" "}
        <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
          {dict.register.signIn}
        </Link>
      </p>
    </div>
  );
}
