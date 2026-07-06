"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestPhoneOtpAction, verifyPhoneOtpAction } from "@/modules/phone-verification/actions";
import { useLocale } from "@/lib/i18n/context";

type Step = "form" | "otp";

export default function RegisterDistributorPage() {
  const { dict } = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    distributorName: "",
    ownerName: "",
    phone: "",
    password: "",
  });

  const [ids, setIds] = useState<{ userId: string; distributorId: string } | null>(null);
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-distributor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? dict.common.somethingWrong);
        return;
      }
      setIds({ userId: data.userId, distributorId: data.distributorId });

      const otpRes = await requestPhoneOtpAction({ userId: data.userId });
      if (otpRes.success) {
        setSentTo(otpRes.data.phone);
        setStep("otp");
      } else {
        setError(otpRes.error);
      }
    } catch {
      setError(dict.common.somethingWrong);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!ids) return;
    setError("");
    setLoading(true);
    try {
      const res = await verifyPhoneOtpAction({
        userId: ids.userId,
        code,
        activateDistributorId: ids.distributorId,
      });
      if (res.success) {
        router.push("/login");
      } else {
        setError(res.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!ids) return;
    setError("");
    const res = await requestPhoneOtpAction({ userId: ids.userId });
    if (!res.success) setError(res.error);
  }

  if (step === "otp") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)] text-white text-2xl font-bold shadow-lg shadow-red-500/20">
            و
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{dict.otp.title}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {dict.otp.subtitlePrefix} <b>{sentTo}</b>
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="code" className="block text-sm font-medium text-[var(--foreground)]">
                {dict.otp.verificationCode}
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-center text-lg tracking-[0.5em] outline-none transition-colors focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-all hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? dict.otp.verifying : dict.otp.confirm}
            </button>
            <button
              type="button"
              onClick={handleResend}
              className="w-full text-center text-sm text-[var(--primary)] hover:underline"
            >
              {dict.otp.resend}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)] text-white text-2xl font-bold shadow-lg shadow-red-500/20">
          و
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{dict.registerDistributor.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{dict.registerDistributor.subtitle}</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">{dict.registerDistributor.distributorName}</label>
            <input
              required
              value={form.distributorName}
              onChange={(e) => setForm((f) => ({ ...f, distributorName: e.target.value }))}
              className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">{dict.register.yourName}</label>
            <input
              required
              value={form.ownerName}
              onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
              className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">{dict.registerDistributor.whatsappPhone}</label>
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+249..."
              className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">{dict.common.password}</label>
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-all hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? dict.registerDistributor.creatingAccount : dict.common.continue}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {dict.registerDistributor.alreadyHaveAccount}{" "}
        <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
          {dict.registerDistributor.signIn}
        </Link>
      </p>
    </div>
  );
}
