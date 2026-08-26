'use client';

import { useRef, useState, useTransition, type DragEvent } from 'react';
import { ExternalImage } from '@/components/external-image';
import { useLocale } from '@/lib/i18n/context';
import { saveStorefrontSettingsAction } from '@/modules/storefront/actions';

export type Settings = {
  theme: unknown;
  bannerImage: string | null;
  welcomeText: string | null;
  isOpen: boolean;
  minimumOrderAmount: number | string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  socialLinks: unknown;
} | null;

type SectionId = 'hero' | 'categories' | 'products';
type AssetType = 'logo' | 'banner';

const DEFAULT_SECTIONS: SectionId[] = ['hero', 'categories', 'products'];
const inputCls = 'w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10';

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readSectionList(value: unknown): SectionId[] {
  if (!Array.isArray(value)) return DEFAULT_SECTIONS;
  const valid = value.filter((item): item is SectionId => DEFAULT_SECTIONS.includes(item as SectionId));
  return [...valid, ...DEFAULT_SECTIONS.filter(item => !valid.includes(item))];
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 py-1 text-start">
      <span className="text-sm text-[var(--foreground)]">{label}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[var(--primary)]' : 'bg-stone-300'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'right-1' : 'left-1'}`} />
      </span>
    </button>
  );
}

function SettingCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"><h2 className="text-sm font-bold text-[var(--foreground)]">{title}</h2>{children}</section>;
}

function AssetDropzone({ type, value, busy, label, hint, removeLabel, uploadLabel, uploadingLabel, onUpload, onRemove }: {
  type: AssetType; value: string; busy: boolean; label: string; hint: string; removeLabel: string; uploadLabel: string; uploadingLabel: string;
  onUpload: (file: File, type: AssetType) => void; onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  function accept(files: FileList | null) { const file = files?.[0]; if (file) onUpload(file, type); }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between"><span className="text-sm font-medium text-[var(--foreground)]">{label}</span>{value && <button type="button" onClick={onRemove} className="text-xs font-medium text-red-600 hover:underline">{removeLabel}</button>}</div>
      <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); accept(event.dataTransfer.files); }} className="group relative flex min-h-28 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--muted)]/20 p-3 text-center transition hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 disabled:opacity-60">
        {value ? <ExternalImage src={value} alt="" fill sizes="360px" className={type === 'logo' ? 'object-contain p-5' : 'object-cover'} /> : <span className="relative z-10"><span className="block text-2xl">{type === 'logo' ? '🏷️' : '🖼️'}</span><span className="mt-1 block text-xs font-semibold text-[var(--foreground)]">{busy ? uploadingLabel : uploadLabel}</span><span className="mt-1 block text-[11px] text-[var(--muted-foreground)]">{hint}</span></span>}
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => accept(event.target.files)} />
    </div>
  );
}

export function CustomizeClient({ settings, slug, merchantName, initialLogo }: { settings: Settings; slug: string; merchantName: string; initialLogo: string }) {
  const { dict, dir } = useLocale();
  const t = dict.storefrontCustomizePage;
  const theme = (settings?.theme && typeof settings.theme === 'object' ? settings.theme : {}) as Record<string, unknown>;
  const social = (settings?.socialLinks && typeof settings.socialLinks === 'object' ? settings.socialLinks : {}) as Record<string, unknown>;
  const rtl = dir === 'rtl';
  const copy = rtl ? {
    builder: 'منشئ واجهة المتجر', sections: 'أقسام المتجر', canvas: 'المعاينة المباشرة', settings: 'خصائص المتجر', drag: 'اسحب لترتيب الأقسام', hero: 'البانر والترحيب', categories: 'التصنيفات', products: 'المنتجات', visible: 'ظاهر', hidden: 'مخفي', logo: 'شعار المتجر', banner: 'بانر المتجر', uploadError: 'تعذر رفع الصورة', unsaved: 'لديك تعديلات غير محفوظة', mobile: 'جوال', desktop: 'سطح المكتب', sampleCategory: 'منتجات جديدة', remove: 'حذف', upload: 'اسحب الصورة هنا أو اضغط للرفع', uploading: 'جاري رفع الصورة…', open: 'مفتوح', closed: 'مغلق', shopNow: 'تسوق الآن', all: 'الكل', offers: 'العروض', popular: 'الأكثر طلباً', bannerHint: 'يفضل مقاس 1600 × 600',
  } : {
    builder: 'Storefront builder', sections: 'Store sections', canvas: 'Live preview', settings: 'Store properties', drag: 'Drag to reorder sections', hero: 'Banner & welcome', categories: 'Categories', products: 'Products', visible: 'Visible', hidden: 'Hidden', logo: 'Store logo', banner: 'Store banner', uploadError: 'Could not upload image', unsaved: 'You have unsaved changes', mobile: 'Mobile', desktop: 'Desktop', sampleCategory: 'New products', remove: 'Remove', upload: 'Drop an image here or click to upload', uploading: 'Uploading image…', open: 'Open', closed: 'Closed', shopNow: 'Shop now', all: 'All', offers: 'Offers', popular: 'Popular', bannerHint: 'Recommended 1600 × 600',
  };
  const labels: Record<SectionId, string> = { hero: copy.hero, categories: copy.categories, products: copy.products };

  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<AssetType | ''>('');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [dragged, setDragged] = useState<SectionId | null>(null);
  const [primary, setPrimary] = useState(readString(theme.primaryColor, '#13c4a3'));
  const [accent, setAccent] = useState(readString(theme.accentColor, '#3b82f6'));
  const [logoUrl, setLogoUrl] = useState(initialLogo || readString(theme.logoUrl));
  const [bannerUrl, setBannerUrl] = useState(settings?.bannerImage ?? '');
  const [welcome, setWelcome] = useState(settings?.welcomeText ?? '');
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(readSectionList(theme.sectionOrder));
  const [hiddenSections, setHiddenSections] = useState<SectionId[]>(Array.isArray(theme.hiddenSections) ? theme.hiddenSections.filter((id): id is SectionId => DEFAULT_SECTIONS.includes(id as SectionId)) : []);
  const [isOpen, setIsOpen] = useState(settings?.isOpen ?? true);
  const [delivery, setDelivery] = useState(settings?.deliveryEnabled ?? true);
  const [pickup, setPickup] = useState(settings?.pickupEnabled ?? true);
  const [minOrder, setMinOrder] = useState(String(Number(settings?.minimumOrderAmount ?? 0)));
  const [whatsapp, setWhatsapp] = useState(readString(social.whatsapp));
  const [instagram, setInstagram] = useState(readString(social.instagram));
  const [facebook, setFacebook] = useState(readString(social.facebook));

  function changed() { setDirty(true); setSaved(false); }
  function setAndDirty<T>(setter: (value: T) => void, value: T) { setter(value); changed(); }
  function moveSection(source: SectionId, target: SectionId) { if (source === target) return; const next = sectionOrder.filter(item => item !== source); next.splice(next.indexOf(target), 0, source); setAndDirty(setSectionOrder, next); }
  function shiftSection(id: SectionId, delta: number) { const index = sectionOrder.indexOf(id); const target = sectionOrder[index + delta]; if (target) moveSection(id, target); }
  function toggleSection(id: SectionId) { setAndDirty(setHiddenSections, hiddenSections.includes(id) ? hiddenSections.filter(item => item !== id) : [...hiddenSections, id]); }

  async function uploadAsset(file: File, type: AssetType) {
    setError(''); setUploading(type);
    try {
      const body = new FormData(); body.set('image', file); body.set('assetType', type);
      const response = await fetch('/api/storefront/assets/upload', { method: 'POST', body });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || copy.uploadError);
      if (type === 'logo') setLogoUrl(payload.url); else setBannerUrl(payload.url);
      changed();
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : copy.uploadError); }
    finally { setUploading(''); }
  }

  function save() {
    setSaved(false); setError('');
    startTransition(async () => {
      const result = await saveStorefrontSettingsAction({
        theme: { primaryColor: primary, accentColor: accent, sectionOrder, hiddenSections }, logoImage: logoUrl, bannerImage: bannerUrl || null, welcomeText: welcome || null,
        isOpen, deliveryEnabled: delivery, pickupEnabled: pickup, minimumOrderAmount: Number(minOrder) || 0, socialLinks: { whatsapp, instagram, facebook },
      });
      if (result.success) { setSaved(true); setDirty(false); } else setError(result.error ?? t.genericError);
    });
  }

  function previewSection(id: SectionId) {
    if (hiddenSections.includes(id)) return null;
    if (id === 'hero') return <div className="relative min-h-44 overflow-hidden" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>{bannerUrl && <ExternalImage src={bannerUrl} alt="" fill sizes="900px" className="object-cover opacity-45" />}<div className="relative flex min-h-44 flex-col items-center justify-center p-8 text-center text-white"><p className="text-2xl font-black">{welcome || `${rtl ? 'مرحباً بك في' : 'Welcome to'} ${merchantName}`}</p><span className="mt-3 rounded-full bg-white/20 px-4 py-2 text-xs font-bold backdrop-blur">{copy.shopNow}</span></div></div>;
    if (id === 'categories') return <div className="flex gap-2 overflow-hidden border-y border-stone-100 bg-white p-4">{[copy.all, copy.sampleCategory, copy.offers, copy.popular].map((item, index) => <span key={item} className="whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold" style={index === 0 ? { background: primary, color: 'white' } : { background: '#f5f5f4', color: '#57534e' }}>{item}</span>)}</div>;
    return <div className="bg-stone-50 p-5"><h3 className="mb-4 font-black text-stone-900">{copy.sampleCategory}</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm"><div className="aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200" /><div className="p-3"><div className="h-2.5 w-2/3 rounded bg-stone-200" /><div className="mt-3 flex items-center justify-between"><span className="text-xs font-black" style={{ color: primary }}>0 SDG</span><span className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: primary }}>+</span></div></div></div>)}</div></div>;
  }

  return (
    <div className="min-h-full bg-[var(--background)]" dir={dir}>
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--background)]/95 px-4 py-3 backdrop-blur lg:px-6">
        <a href="/dashboard/storefront" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">{t.backToStore}</a>
        <div className="min-w-0 flex-1"><h1 className="truncate text-lg font-black text-[var(--foreground)]">{copy.builder}</h1>{dirty && <p className="text-xs text-amber-600">● {copy.unsaved}</p>}</div>
        <a href={`/store/${slug}`} target="_blank" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--foreground)]">{t.previewButton}</a>
        <button type="button" onClick={save} disabled={isPending || !!uploading || !dirty} className="rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50">{isPending ? t.saving : t.saveButton}</button>
      </div>

      <div className="grid min-h-[calc(100vh-65px)] grid-cols-1 xl:grid-cols-[250px_minmax(420px,1fr)_330px]">
        <aside className="border-b border-[var(--border)] bg-[var(--card)] p-4 xl:border-b-0 xl:border-e"><h2 className="font-black text-[var(--foreground)]">{copy.sections}</h2><p className="mb-4 mt-1 text-xs text-[var(--muted-foreground)]">{copy.drag}</p><div className="space-y-2">
          {sectionOrder.map((id, index) => <div key={id} draggable onDragStart={() => setDragged(id)} onDragEnd={() => setDragged(null)} onDragOver={event => event.preventDefault()} onDrop={() => dragged && moveSection(dragged, id)} className={`rounded-xl border bg-[var(--background)] p-3 transition ${dragged === id ? 'border-[var(--primary)] opacity-50' : 'border-[var(--border)]'}`}><div className="flex items-center gap-2"><span className="cursor-grab text-stone-400" aria-hidden>⠿</span><span className="flex-1 text-sm font-bold text-[var(--foreground)]">{labels[id]}</span><button type="button" onClick={() => toggleSection(id)} className={`rounded-full px-2 py-1 text-[10px] font-bold ${hiddenSections.includes(id) ? 'bg-stone-100 text-stone-500' : 'bg-emerald-50 text-emerald-700'}`}>{hiddenSections.includes(id) ? copy.hidden : copy.visible}</button></div><div className="mt-2 flex gap-1 ps-6 xl:hidden"><button type="button" disabled={index === 0} onClick={() => shiftSection(id, -1)} className="rounded border px-2 text-xs disabled:opacity-30">↑</button><button type="button" disabled={index === sectionOrder.length - 1} onClick={() => shiftSection(id, 1)} className="rounded border px-2 text-xs disabled:opacity-30">↓</button></div></div>)}
        </div></aside>

        <main className="min-w-0 bg-stone-100/70 p-4 lg:p-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-black text-stone-700">{copy.canvas}</h2><div className="flex rounded-xl bg-white p-1 shadow-sm">{(['mobile', 'desktop'] as const).map(item => <button key={item} type="button" onClick={() => setDevice(item)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${device === item ? 'bg-stone-900 text-white' : 'text-stone-500'}`}>{item === 'mobile' ? `▯ ${copy.mobile}` : `▱ ${copy.desktop}`}</button>)}</div></div>
          <div className={`mx-auto overflow-hidden rounded-[28px] border-4 border-stone-900 bg-white shadow-2xl transition-all ${device === 'mobile' ? 'max-w-[390px]' : 'max-w-4xl'}`}><div className="flex h-14 items-center gap-3 border-b border-stone-100 px-4">{logoUrl ? <div className="relative h-9 w-9 overflow-hidden rounded-xl"><ExternalImage src={logoUrl} alt="" fill sizes="36px" className="object-contain" /></div> : <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: primary }}>و</span>}<span className="flex-1 truncate font-black text-stone-900">{merchantName}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{isOpen ? copy.open : copy.closed}</span><span className="text-xl">🛒</span></div>
            {sectionOrder.map(id => <div key={id} draggable onDragStart={() => setDragged(id)} onDragOver={(event: DragEvent) => event.preventDefault()} onDrop={() => dragged && moveSection(dragged, id)} className="group relative outline-none hover:ring-2 hover:ring-inset hover:ring-[var(--primary)]">{previewSection(id)}<span className="pointer-events-none absolute end-3 top-3 hidden rounded-lg bg-stone-900/80 px-2 py-1 text-[10px] font-bold text-white group-hover:block">⠿ {labels[id]}</span></div>)}
          </div>
        </main>

        <aside className="space-y-4 border-t border-[var(--border)] bg-[var(--card)] p-4 xl:max-h-[calc(100vh-65px)] xl:overflow-y-auto xl:border-s xl:border-t-0"><h2 className="font-black text-[var(--foreground)]">{copy.settings}</h2>
          <SettingCard title={t.imagesTitle}><AssetDropzone type="logo" value={logoUrl} busy={uploading === 'logo'} label={copy.logo} hint="PNG / JPG / WebP — 5MB" removeLabel={copy.remove} uploadLabel={copy.upload} uploadingLabel={copy.uploading} onUpload={uploadAsset} onRemove={() => setAndDirty(setLogoUrl, '')} /><AssetDropzone type="banner" value={bannerUrl} busy={uploading === 'banner'} label={copy.banner} hint={copy.bannerHint} removeLabel={copy.remove} uploadLabel={copy.upload} uploadingLabel={copy.uploading} onUpload={uploadAsset} onRemove={() => setAndDirty(setBannerUrl, '')} /><label className="block text-sm font-medium text-[var(--foreground)]">{t.welcomeMessageLabel}<textarea value={welcome} onChange={event => setAndDirty(setWelcome, event.target.value)} rows={3} className={`${inputCls} mt-2 resize-none`} placeholder={t.welcomePlaceholder} /></label></SettingCard>
          <SettingCard title={t.colorsTitle}>{[[t.primaryColorLabel, primary, setPrimary], [t.secondaryColorLabel, accent, setAccent]].map(([label, value, setter]) => <label key={String(label)} className="flex items-center gap-3 text-sm text-[var(--foreground)]"><input type="color" value={String(value)} onChange={event => setAndDirty(setter as (value: string) => void, event.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border p-0.5" /><span className="flex-1">{String(label)}</span><code className="text-xs text-[var(--muted-foreground)]">{String(value)}</code></label>)}</SettingCard>
          <SettingCard title={t.orderSettingsTitle}><Toggle checked={isOpen} onChange={value => setAndDirty(setIsOpen, value)} label={t.isOpenToggle} /><Toggle checked={delivery} onChange={value => setAndDirty(setDelivery, value)} label={t.deliveryToggle} /><Toggle checked={pickup} onChange={value => setAndDirty(setPickup, value)} label={t.pickupToggle} /><label className="block text-sm text-[var(--foreground)]">{t.minOrderLabel}<input type="number" min="0" value={minOrder} onChange={event => setAndDirty(setMinOrder, event.target.value)} className={`${inputCls} mt-2`} /></label></SettingCard>
          <SettingCard title={t.socialTitle}><input value={whatsapp} onChange={event => setAndDirty(setWhatsapp, event.target.value)} className={inputCls} placeholder={t.whatsappLabel} /><input value={instagram} onChange={event => setAndDirty(setInstagram, event.target.value)} className={inputCls} placeholder={t.instagramLabel} /><input value={facebook} onChange={event => setAndDirty(setFacebook, event.target.value)} className={inputCls} placeholder={t.facebookLabel} /></SettingCard>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{saved && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{t.saved}</p>}
        </aside>
      </div>
    </div>
  );
}
