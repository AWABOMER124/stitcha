"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STORE_TYPES = [
  { value: "FOOD_MENU", label: "Food Menu", desc: "Restaurant, cafe, or food delivery" },
  { value: "ONLINE_STORE", label: "Online Store", desc: "E-commerce, retail products" },
  { value: "SERVICES", label: "Services", desc: "Service-based business" },
  { value: "BOOKING", label: "Booking", desc: "Appointments and reservations" },
  { value: "OTHER", label: "Other", desc: "Custom business type" },
];

const BUSINESS_TYPES = [
  "RESTAURANT", "CAFE", "GROCERY", "PHARMACY", "RETAIL", "OTHER",
];

export default function NewMerchantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    storeType: "FOOD_MENU",
    businessType: "RESTAURANT",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/distributor/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create merchant");
      router.push("/distributor/merchants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Add Merchant</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Create a new merchant account under your distributor
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Store Type Selection */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
          <h2 className="font-semibold text-[var(--foreground)]">Store Type</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {STORE_TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  form.storeType === t.value
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--border)] hover:border-[var(--ring)]"
                }`}
              >
                <input
                  type="radio"
                  name="storeType"
                  value={t.value}
                  checked={form.storeType === t.value}
                  onChange={(e) => set("storeType", e.target.value)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{t.label}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Business Info */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
          <h2 className="font-semibold text-[var(--foreground)]">Business Info</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business Name" required>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. مطعم الشيف"
                className={inputCls}
              />
            </Field>
            <Field label="Business Type" required>
              <select
                value={form.businessType}
                onChange={(e) => set("businessType", e.target.value)}
                className={inputCls}
              >
                {BUSINESS_TYPES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="business@example.com"
                className={inputCls}
              />
            </Field>
            <Field label="Phone">
              <input
                type="text"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+249 9X XXX XXXX"
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* Owner Account */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
          <h2 className="font-semibold text-[var(--foreground)]">Owner Account</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            These credentials will be used by the merchant to log in.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner Name" required>
              <input
                type="text"
                required
                value={form.ownerName}
                onChange={(e) => set("ownerName", e.target.value)}
                placeholder="Full name"
                className={inputCls}
              />
            </Field>
            <Field label="Owner Email" required>
              <input
                type="email"
                required
                value={form.ownerEmail}
                onChange={(e) => set("ownerEmail", e.target.value)}
                placeholder="owner@example.com"
                className={inputCls}
              />
            </Field>
            <Field label="Password" required className="sm:col-span-2">
              <input
                type="password"
                required
                minLength={8}
                value={form.ownerPassword}
                onChange={(e) => set("ownerPassword", e.target.value)}
                placeholder="Min 8 characters"
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary)]/90 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Merchant"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20";

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label className="block text-sm font-medium text-[var(--foreground)]">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
