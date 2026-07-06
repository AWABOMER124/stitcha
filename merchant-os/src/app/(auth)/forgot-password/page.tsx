"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";

export default function ForgotPasswordPage() {
  const { dict } = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? dict.common.somethingWrong);
        return;
      }
      setSent(true);
    } catch {
      setError(dict.common.somethingWrong);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)] text-white text-2xl font-bold shadow-lg shadow-red-500/20">
          و
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {dict.forgotPassword.title}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {dict.forgotPassword.subtitle}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        {sent ? (
          <div className="space-y-4 text-center">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              {dict.forgotPassword.sentPrefix} <b>{email}</b>{dict.forgotPassword.sentSuffix ? `، ${dict.forgotPassword.sentSuffix}` : ''}
            </div>
            <Link href="/login" className="text-sm font-medium text-[var(--primary)] hover:underline">
              {dict.forgotPassword.backToSignIn}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)]">
                {dict.common.email}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-all hover:bg-[var(--primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? dict.forgotPassword.sending : dict.forgotPassword.sendLink}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {dict.forgotPassword.remembered}{" "}
        <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
          {dict.common.signIn}
        </Link>
      </p>
    </div>
  );
}
