"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { requestPhoneOtpAction, verifyPhoneOtpAction } from "@/modules/phone-verification/actions";
import { useLocale } from "@/lib/i18n/context";

type Step = "loading" | "invalid" | "form" | "otp";

export default function CompleteRegistrationPage() {
  const { dict } = useLocale();
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const BUSINESS_TYPES = [
    { value: "RESTAURANT", label: dict.register.types.RESTAURANT },
    { value: "CAFE", label: dict.register.types.CAFE },
    { value: "GROCERY", label: dict.register.types.GROCERY },
    { value: "PHARMACY", label: dict.register.types.PHARMACY },
    { value: "RETAIL", label: dict.register.types.RETAIL },
    { value: "OTHER", label: dict.register.types.OTHER },
  ];

  const [step, setStep] = useState<Step>("loading");
  const [loadError, setLoadError] = useState("");
  const [invite, setInvite] = useState<{ name: string; phone: string; address: string } | null>(null);

  const [form, setForm] = useState({ ownerName: "", password: "", businessType: "RESTAURANT" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [ids, setIds] = useState<{ userId: string; merchantId: string } | null>(null);
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    fetch(`/api/auth/complete-registration/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setLoadError(data.error ?? dict.completeRegistration.invalidLink);
          setStep("invalid");
          return;
        }
        setInvite(data);
        setStep("form");
      })
      .catch(() => {
        setLoadError(dict.common.somethingWrong);
        setStep("invalid");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/complete-registration/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? dict.common.somethingWrong);
        return;
      }
      setIds({ userId: data.userId, merchantId: data.merchantId });

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
      const res = await verifyPhoneOtpAction({ userId: ids.userId, code, activateMerchantId: ids.merchantId });
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

  if (step === "loading") {
    return <p className="text-center text-sm text-[var(--muted-foreground)]">{dict.common.loading}</p>;
  }

  if (step === "invalid") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-2xl mb-2">⚠️</p>
        <p className="text-sm text-red-700">{loadError}</p>
      </div>
    );
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
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-center text-lg tracking-[0.5em] outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
            />
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary)]/90 disabled:opacity-50"
            >
              {loading ? dict.otp.verifying : dict.otp.confirm}
            </button>
            <button type="button" onClick={handleResend} className="w-full text-center text-sm text-[var(--primary)] hover:underline">
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
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{dict.completeRegistration.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {invite?.name} · {invite?.phone}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

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
            <label className="block text-sm font-medium text-[var(--foreground)]">{dict.completeRegistration.businessType}</label>
            <select
              value={form.businessType}
              onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}
              className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
            >
              {BUSINESS_TYPES.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">{dict.common.password}</label>
            <input
              type="password"
              required
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
            className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary)]/90 disabled:opacity-50"
          >
            {loading ? dict.registerDistributor.creatingAccount : dict.common.continue}
          </button>
        </form>
      </div>
    </div>
  );
}
