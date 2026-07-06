"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";

/**
 * Merchant registration page for Waslak Merchant OS
 */
export default function RegisterPage() {
  const { dict } = useLocale();
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

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed");
      } else {
        window.location.href = "/dashboard";
      }
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

  return (
    <div className="space-y-6">
      {/* Logo & Title */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)] text-white text-2xl font-bold shadow-lg shadow-red-500/20">
          و
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {dict.register.title}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {dict.register.subtitle}
        </p>
      </div>

      {/* Registration Form */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
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
            <div className="grid grid-cols-3 gap-2">
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

          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="reg-password" className="block text-sm font-medium text-[var(--foreground)]">
                {dict.common.password}
              </label>
              <input
                id="reg-password"
                type="password"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--foreground)]">
                {dict.common.confirmPassword}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-all hover:bg-[var(--primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? dict.register.creatingStore : dict.register.createAccount}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {dict.register.alreadyHaveAccount}{" "}
        <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
          {dict.register.signIn}
        </Link>
      </p>
      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {dict.login.areYouDistributor}{" "}
        <Link href="/register-distributor" className="font-medium text-[var(--primary)] hover:underline">
          {dict.login.registerHere}
        </Link>
      </p>
    </div>
  );
}
