'use client';
import { useState } from 'react';
import { useLocale } from '@/lib/i18n/context';

type AiResult = { name: string; description: string; slogan: string; primaryColor: string; welcomeText: string; categories: { name: string; products: { name: string; price: number; description: string }[] }[] };

export function AiGeneratorClient() {
  const { dict } = useLocale();
  const t = dict.storefrontAiPage;
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true); setError(''); setResult(null); setApplied(false);
    try {
      const res = await fetch('/api/ai/generate-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
      else setError(data.error ?? t.genericError);
    } catch { setError(t.connectionError); }
    setLoading(false);
  }

  async function applyToStore() {
    if (!result) return;
    setApplying(true);
    await fetch('/api/ai/apply-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    }).catch(() => {});
    setApplying(false); setApplied(true);
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

      {result && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {/* Preview Header */}
          <div className="p-5 text-white" style={{ background: `linear-gradient(135deg, ${result.primaryColor}, ${result.primaryColor}99)` }}>
            <p className="text-lg font-bold">{result.name}</p>
            <p className="text-sm text-white/80 mt-0.5">{result.slogan}</p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-1">{t.descriptionLabel}</p>
              <p className="text-sm text-[var(--foreground)]">{result.description}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-1">{t.welcomeMessageLabel}</p>
              <p className="text-sm text-[var(--foreground)]">{result.welcomeText}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-2">{t.categoriesLabel}</p>
              <div className="space-y-3">
                {result.categories.map(cat => (
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
                <div className="w-5 h-5 rounded-full border-2 border-stone-300" style={{ background: result.primaryColor }} />
                <span>{t.primaryColorLabel}</span>
              </div>
            </div>
            {applied
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
