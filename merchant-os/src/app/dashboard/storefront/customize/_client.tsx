'use client';
import { useState, useTransition } from 'react';
import { saveStorefrontSettingsAction } from '@/modules/storefront/actions';
import { useLocale } from '@/lib/i18n/context';

export type Settings = { theme: unknown; bannerImage: string | null; welcomeText: string | null; isOpen: boolean; minimumOrderAmount: number | string; deliveryEnabled: boolean; pickupEnabled: boolean; socialLinks: unknown } | null;

export function CustomizeClient({ settings, slug }: { settings: Settings; slug: string }) {
  const { dict } = useLocale();
  const t = dict.storefrontCustomizePage;
  const theme = (settings?.theme ?? {}) as Record<string, string>;
  const social = (settings?.socialLinks ?? {}) as Record<string, string>;
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [primary, setPrimary] = useState(theme.primaryColor ?? '#b91c1c');
  const [accent, setAccent] = useState(theme.accentColor ?? '#dc2626');
  const [logoUrl, setLogoUrl] = useState(theme.logoUrl ?? '');
  const [bannerUrl, setBannerUrl] = useState(settings?.bannerImage ?? '');
  const [welcome, setWelcome] = useState(settings?.welcomeText ?? '');
  const [isOpen, setIsOpen] = useState(settings?.isOpen ?? true);
  const [delivery, setDelivery] = useState(settings?.deliveryEnabled ?? true);
  const [pickup, setPickup] = useState(settings?.pickupEnabled ?? true);
  const [minOrder, setMinOrder] = useState(String(Number(settings?.minimumOrderAmount ?? 0)));
  const [whatsapp, setWhatsapp] = useState(social.whatsapp ?? '');
  const [instagram, setInstagram] = useState(social.instagram ?? '');
  const [facebook, setFacebook] = useState(social.facebook ?? '');

  function save() {
    setSaved(false); setError('');
    startTransition(async () => {
      const res = await saveStorefrontSettingsAction({
        theme: { primaryColor: primary, accentColor: accent, logoUrl: logoUrl || undefined },
        bannerImage: bannerUrl || undefined,
        welcomeText: welcome || undefined,
        isOpen,
        deliveryEnabled: delivery,
        pickupEnabled: pickup,
        minimumOrderAmount: Number(minOrder) || 0,
        socialLinks: { whatsapp: whatsapp || undefined, instagram: instagram || undefined, facebook: facebook || undefined },
      });
      if (res.success) setSaved(true);
      else setError(res.error ?? t.genericError);
    });
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
      <h2 className="font-bold text-[var(--foreground)]">{title}</h2>
      {children}
    </div>
  );

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="text-sm text-[var(--muted-foreground)] block mb-1.5">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm bg-[var(--background)] text-[var(--foreground)] outline-none focus:border-[var(--primary)]";
  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center justify-between w-full">
      <span className="text-sm text-[var(--foreground)]">{label}</span>
      <div className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-[var(--primary)]' : 'bg-stone-300'}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? 'right-1' : 'left-1'}`} />
      </div>
    </button>
  );

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <a href="/dashboard/storefront" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm">{t.backToStore}</a>
        <h1 className="text-xl font-bold text-[var(--foreground)]">{t.title}</h1>
      </div>

      {/* Live Preview */}
      <div className="rounded-2xl overflow-hidden border border-[var(--border)] h-24 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
        <div className="text-center text-white">
          {logoUrl ? <img src={logoUrl} alt="" className="h-8 mx-auto rounded-lg object-contain mb-1" /> : <div className="w-10 h-10 rounded-xl bg-white/20 mx-auto flex items-center justify-center text-2xl mb-1">🏪</div>}
          <p className="font-bold text-sm">{t.previewLabel}</p>
        </div>
      </div>

      <Section title={t.colorsTitle}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t.primaryColorLabel}>
            <div className="flex gap-2 items-center">
              <input type="color" value={primary} onChange={e => setPrimary(e.target.value)} className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer p-0.5" />
              <input value={primary} onChange={e => setPrimary(e.target.value)} className={`${inputCls} flex-1`} placeholder="#b91c1c" />
            </div>
          </Field>
          <Field label={t.secondaryColorLabel}>
            <div className="flex gap-2 items-center">
              <input type="color" value={accent} onChange={e => setAccent(e.target.value)} className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer p-0.5" />
              <input value={accent} onChange={e => setAccent(e.target.value)} className={`${inputCls} flex-1`} placeholder="#dc2626" />
            </div>
          </Field>
        </div>
      </Section>

      <Section title={t.imagesTitle}>
        <Field label={t.logoUrlLabel}>
          <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className={inputCls} placeholder="https://..." />
        </Field>
        <Field label={t.bannerUrlLabel}>
          <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} className={inputCls} placeholder="https://..." />
        </Field>
        <Field label={t.welcomeMessageLabel}>
          <textarea value={welcome} onChange={e => setWelcome(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder={t.welcomePlaceholder} />
        </Field>
      </Section>

      <Section title={t.orderSettingsTitle}>
        <div className="space-y-3">
          <Toggle checked={isOpen} onChange={setIsOpen} label={t.isOpenToggle} />
          <Toggle checked={delivery} onChange={setDelivery} label={t.deliveryToggle} />
          <Toggle checked={pickup} onChange={setPickup} label={t.pickupToggle} />
        </div>
        <Field label={t.minOrderLabel}>
          <input type="number" value={minOrder} onChange={e => setMinOrder(e.target.value)} className={inputCls} min="0" />
        </Field>
      </Section>

      <Section title={t.socialTitle}>
        <Field label={t.whatsappLabel}><input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className={inputCls} placeholder="+249912000000" /></Field>
        <Field label={t.instagramLabel}><input value={instagram} onChange={e => setInstagram(e.target.value)} className={inputCls} placeholder="@username" /></Field>
        <Field label={t.facebookLabel}><input value={facebook} onChange={e => setFacebook(e.target.value)} className={inputCls} placeholder="facebook.com/page" /></Field>
      </Section>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
      {saved && <p className="text-sm text-emerald-600 bg-emerald-50 rounded-xl px-4 py-3">{t.saved}</p>}

      <div className="flex gap-3">
        <button onClick={save} disabled={isPending} className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white font-bold disabled:opacity-60">
          {isPending ? t.saving : t.saveButton}
        </button>
        <a href={`/store/${slug}`} target="_blank" className="px-4 py-3 rounded-xl border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--background)] transition-colors">{t.previewButton}</a>
      </div>
    </div>
  );
}
