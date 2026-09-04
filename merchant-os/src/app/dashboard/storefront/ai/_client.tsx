'use client';
import { useState } from 'react';
import { useLocale } from '@/lib/i18n/context';
import { generateStoreContentAction, applyAiStoreContentAction } from '@/modules/storefront/actions';
import type { StoreContentResult } from '@/services/ai/types';

interface StoreDraft {
  projectId: string;
  versionId: string;
  versionNumber: number;
  content: StoreContentResult;
  status: 'DRAFT' | 'APPLYING' | 'APPLIED' | 'PARTIAL';
  createdAt: string;
}

export function AiGeneratorClient({ initialDrafts }: { initialDrafts: StoreDraft[] }) {
  const { dict } = useLocale();
  const t = dict.storefrontAiPage;
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StoreDraft | null>(null);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true); setError(''); setResult(null); setApplied(false);
    try {
      const res = await generateStoreContentAction(prompt, crypto.randomUUID());
      if (res.success) { setResult(res.data); setDrafts((current) => [res.data, ...current]); }
      else setError(res.error || t.genericError);
    } catch { setError(t.connectionError); }
    setLoading(false);
  }

  async function applyToStore() {
    if (!result) return;
    setApplying(true);
    const res = await applyAiStoreContentAction(result.projectId).catch(() => null);
    setApplying(false);
    if (res?.success) {
      setApplied(true);
      setDrafts((current) => current.map((draft) => draft.versionId === result.versionId ? { ...draft, status: res.data.status } : draft));
    }
    else setError((res && !res.success ? res.error : null) || t.genericError);
  }

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <a href="/dashboard/storefront" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm">{t.backToStore}</a>
        <h1 className="text-xl font-bold text-[var(--foreground)]">{t.title}</h1>
      </div>

      <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-5">
        <p className="text-sm text-violet-700 font-medium mb-1">{t.howItWorksTitle}</p>
        <p className="text-sm text-violet-600">{t.howItWorksDesc}</p>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-[var(--foreground)] block mb-2">{t.promptLabel}</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} className="w-full border border-[var(--border)] rounded-xl px-4 py-3 text-sm bg-[var(--background)] text-[var(--foreground)] outline-none focus:border-[var(--primary)] resize-none" placeholder={t.promptPlaceholder} />
        </div>
        <div>
          <p className="text-xs text-[var(--muted-foreground)] mb-2">{t.examplesLabel}</p>
          <div className="flex flex-wrap gap-2">
            {t.examples.map(ex => (
              <button key={ex} onClick={() => setPrompt(ex)} className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">{ex.slice(0, 35)}...</button>
            ))}
          </div>
        </div>
        <button onClick={generate} disabled={loading || !prompt.trim()} className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-bold disabled:opacity-50 transition-all">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t.generating}
            </span>
          ) : t.generateButton}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-600">{error}</div>}

      {drafts.length > 0 && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5" dir="rtl">
          <div className="flex items-center justify-between gap-3"><h2 className="font-black">المسودات المحفوظة</h2><span className="text-xs text-[var(--muted-foreground)]">آخر {drafts.length} إصدار</span></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {drafts.map((draft) => (
              <button key={draft.versionId} type="button" onClick={() => { setResult(draft); setApplied(draft.status === 'APPLIED'); }} className="rounded-xl border border-[var(--border)] p-3 text-start hover:border-[var(--primary)]">
                <span className="block text-sm font-bold">{draft.content.name}</span>
                <span className="mt-1 block text-xs text-[var(--muted-foreground)]">الإصدار {draft.versionNumber} · {new Date(draft.createdAt).toLocaleDateString('ar-SD')} · {draft.status === 'APPLIED' ? 'مطبّق' : draft.status === 'PARTIAL' ? 'مطبّق جزئياً' : 'مسودة'}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {result && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {/* Preview Header */}
          <div className="p-5 text-white" style={{ background: `linear-gradient(135deg, ${result.content.primaryColor}, ${result.content.primaryColor}99)` }}>
            <p className="text-lg font-bold">{result.content.name}</p>
            <p className="text-sm text-white/80 mt-0.5">{result.content.slogan}</p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-1">{t.descriptionLabel}</p>
              <p className="text-sm text-[var(--foreground)]">{result.content.description}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-1">{t.welcomeMessageLabel}</p>
              <p className="text-sm text-[var(--foreground)]">{result.content.welcomeText}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-2">{t.categoriesLabel}</p>
              <div className="space-y-3">
                {result.content.categories.map(cat => (
                  <div key={cat.name} className="border border-[var(--border)] rounded-xl p-3">
                    <p className="font-semibold text-[var(--foreground)] text-sm mb-2">{cat.name}</p>
                    <div className="space-y-1.5">
                      {cat.products.map(p => (
                        <div key={p.name} className="flex justify-between text-sm">
                          <div>
                            <span className="text-[var(--foreground)]">{p.name}</span>
                            {p.description && <span className="text-[var(--muted-foreground)] text-xs block">{p.description}</span>}
                          </div>
                          <span className="text-[var(--primary)] font-bold whitespace-nowrap">{p.price} SDG</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <div className="w-5 h-5 rounded-full border-2 border-stone-300" style={{ background: result.content.primaryColor }} />
                <span>{t.primaryColorLabel}</span>
              </div>
            </div>
            {applied || result.status !== 'DRAFT'
              ? <p className="text-sm text-emerald-600 bg-emerald-50 rounded-xl px-4 py-3 text-center font-medium">{t.appliedMessage}</p>
              : <button onClick={applyToStore} disabled={applying} className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-bold disabled:opacity-50">
                {applying ? t.applyingButton : t.applyButton}
              </button>
            }
          </div>
        </div>
      )}
    </div>
  );
}
