"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import { generateStoreContentForDistributorAction, createMerchantFromAiAction } from "@/modules/ai-store-generator/actions";
import type { StoreContentResult } from "@/services/ai/types";

type BusinessType = "RESTAURANT" | "CAFE" | "GROCERY" | "PHARMACY" | "RETAIL" | "OTHER";
const BUSINESS_TYPES: BusinessType[] = ["RESTAURANT", "CAFE", "GROCERY", "PHARMACY", "RETAIL", "OTHER"];

export default function NewMerchantPage() {
  const { dict } = useLocale();
  const t = dict.distributorNewMerchantPage;
  const router = useRouter();
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [sentPhone, setSentPhone] = useState("");

  const [form, setForm] = useState({ name: "", phone: "", address: "" });

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
      if (!res.ok) throw new Error(data.error ?? t.genericError);
      setSentPhone(form.phone);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8">
          <p className="text-4xl mb-3">✅</p>
          <h1 className="text-xl font-bold text-emerald-800">{t.sentTitle}</h1>
          <p className="text-sm text-emerald-700 mt-2">
            {t.sentDescPrefix} <b>{sentPhone}</b> {t.sentDescSuffix}
          </p>
        </div>
        <button
          onClick={() => router.push("/distributor/merchants")}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary)]/90"
        >
          {t.backToMerchants}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>

      <div className="flex gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-1">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === "manual" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)]"}`}
        >
          {t.modeManual}
        </button>
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === "ai" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)]"}`}
        >
          {t.modeAi}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      {mode === "manual" ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                {t.storeNameLabel} <span className="text-red-500">*</span>
              </label>
              <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t.storeNamePlaceholder} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                {t.phoneLabel} <span className="text-red-500">*</span>
              </label>
              <input type="tel" required value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder={t.phonePlaceholder} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                {t.locationLabel} <span className="text-red-500">*</span>
              </label>
              <input type="text" required value={form.address} onChange={(e) => set("address", e.target.value)} placeholder={t.locationPlaceholder} className={inputCls} />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary)]/90 disabled:opacity-50"
            >
              {loading ? t.sending : t.submit}
            </button>
          </div>
        </form>
      ) : (
        <AiAssistedForm t={t} onCancel={() => router.back()} onDone={(phone) => { setSentPhone(phone); setSent(true); }} />
      )}
    </div>
  );
}

function AiAssistedForm({
  t,
  onCancel,
  onDone,
}: {
  t: ReturnType<typeof useLocale>["dict"]["distributorNewMerchantPage"];
  onCancel: () => void;
  onDone: (phone: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<StoreContentResult | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("OTHER");

  async function generate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError("");
    setContent(null);
    const res = await generateStoreContentForDistributorAction({ prompt });
    setGenerating(false);
    if (res.success) setContent(res.data);
    else setError(res.error);
  }

  async function createMerchant(e: React.FormEvent) {
    e.preventDefault();
    if (!content) return;
    setCreating(true);
    setError("");
    const res = await createMerchantFromAiAction({ phone, address, businessType, content });
    setCreating(false);
    if (res.success) onDone(phone);
    else setError(res.error);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--foreground)]">{t.aiPromptLabel}</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder={t.aiPromptPlaceholder}
            className={inputCls}
          />
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={generating || !prompt.trim()}
          className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary)]/90 disabled:opacity-50"
        >
          {generating ? t.aiGenerating : content ? t.aiRegenerateButton : t.aiGenerateButton}
        </button>
      </div>

      {content && (
        <form onSubmit={createMerchant} className="space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="p-5 text-white" style={{ background: `linear-gradient(135deg, ${content.primaryColor}, ${content.primaryColor}99)` }}>
              <p className="text-xs opacity-80 mb-1">{t.aiPreviewTitle}</p>
              <p className="text-lg font-bold">{content.name}</p>
              <p className="text-sm text-white/80 mt-0.5">{content.slogan}</p>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-[var(--foreground)]">{content.description}</p>
              <div className="space-y-2">
                {content.categories.map((cat) => (
                  <div key={cat.name} className="border border-[var(--border)] rounded-lg p-2.5">
                    <p className="font-semibold text-sm text-[var(--foreground)] mb-1">{cat.name}</p>
                    {cat.products.map((p) => (
                      <div key={p.name} className="flex justify-between text-xs text-[var(--muted-foreground)]">
                        <span>{p.name}</span>
                        <span className="font-medium">{p.price} SDG</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                {t.phoneLabel} <span className="text-red-500">*</span>
              </label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phonePlaceholder} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                {t.locationLabel} <span className="text-red-500">*</span>
              </label>
              <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t.locationPlaceholder} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--foreground)]">{t.businessTypeLabel}</label>
              <select value={businessType} onChange={(e) => setBusinessType(e.target.value as BusinessType)} className={inputCls}>
                {BUSINESS_TYPES.map((bt) => (
                  <option key={bt} value={bt}>{t.businessTypeOptions[bt]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]">
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary)]/90 disabled:opacity-50"
            >
              {creating ? t.creatingMerchant : t.createMerchantButton}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20";
