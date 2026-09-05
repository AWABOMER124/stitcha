'use client';

import { useRef, useState, useTransition, type DragEvent } from 'react';
import { ExternalImage } from '@/components/external-image';
import { useLocale } from '@/lib/i18n/context';
import { saveStorefrontSettingsAction } from '@/modules/storefront/actions';
import { normalizeStorefrontTheme, STOREFRONT_TEMPLATES, type StorefrontSection } from '@/lib/storefront-theme';

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

type SectionId = StorefrontSection;
type AssetType = 'logo' | 'banner';

const inputCls = 'w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10';

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
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
      <p className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-medium leading-5 text-blue-800">{hint}</p>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => accept(event.target.files)} />
    </div>
  );
}

export function CustomizeClient({ settings, slug, merchantName, initialLogo }: { settings: Settings; slug: string; merchantName: string; initialLogo: string }) {
  const { dict, dir } = useLocale();
  const t = dict.storefrontCustomizePage;
  const theme = normalizeStorefrontTheme(settings?.theme, merchantName);
  const social = (settings?.socialLinks && typeof settings.socialLinks === 'object' ? settings.socialLinks : {}) as Record<string, unknown>;
  const rtl = dir === 'rtl';
  const copy = rtl ? {
    builder: 'منشئ واجهة المتجر', sections: 'أقسام المتجر', canvas: 'المعاينة المباشرة', settings: 'خصائص المتجر', drag: 'اسحب لترتيب الأقسام', announcement: 'شريط الإعلان', hero: 'الواجهة الرئيسية', trust: 'مزايا المتجر', categories: 'التصنيفات', featured: 'منتجات مميزة', products: 'كل المنتجات', testimonials: 'آراء العملاء', social: 'تابعنا وتواصل', visible: 'ظاهر', hidden: 'مخفي', logo: 'شعار المتجر', banner: 'بانر المتجر', uploadError: 'تعذر رفع الصورة أو أبعادها غير مناسبة', unsaved: 'لديك تعديلات غير محفوظة', mobile: 'جوال', desktop: 'سطح المكتب', sampleCategory: 'منتجات جديدة', remove: 'حذف', upload: 'اسحب الصورة هنا أو اضغط للرفع', uploading: 'جاري رفع الصورة…', open: 'مفتوح', closed: 'مغلق', shopNow: 'تسوق الآن', all: 'الكل', offers: 'العروض', popular: 'الأكثر طلباً', logoHint: 'شعار مربع 800 × 800 بكسل؛ الحد الأدنى 400 × 400، PNG بخلفية شفافة مفضل، حتى 5MB.', bannerHint: 'بانر عريض 1600 × 600 بكسل؛ الحد الأدنى 1200 × 450، حتى 5MB. يتم احتواء الصورة كاملة دون قص.', templates: 'قوالب جاهزة', templatesHint: 'اختر قالباً ثم عدّل كل تفاصيله', apply: 'تطبيق', content: 'محتوى الواجهة', layout: 'شكل العرض',
  } : {
    builder: 'Storefront builder', sections: 'Store sections', canvas: 'Live preview', settings: 'Store properties', drag: 'Drag to reorder sections', announcement: 'Announcement bar', hero: 'Main hero', trust: 'Store benefits', categories: 'Categories', featured: 'Featured products', products: 'All products', testimonials: 'Testimonials', social: 'Social & contact', visible: 'Visible', hidden: 'Hidden', logo: 'Store logo', banner: 'Store banner', uploadError: 'Could not upload the image or its dimensions are unsuitable', unsaved: 'You have unsaved changes', mobile: 'Mobile', desktop: 'Desktop', sampleCategory: 'New products', remove: 'Remove', upload: 'Drop an image here or click to upload', uploading: 'Uploading image…', open: 'Open', closed: 'Closed', shopNow: 'Shop now', all: 'All', offers: 'Offers', popular: 'Popular', logoHint: 'Square logo 800 × 800 px; minimum 400 × 400, transparent PNG preferred, up to 5MB.', bannerHint: 'Wide banner 1600 × 600 px; minimum 1200 × 450, up to 5MB. The complete image is fitted without cropping.', templates: 'Ready templates', templatesHint: 'Choose a template, then customize every detail', apply: 'Apply', content: 'Hero content', layout: 'Layout style',
  };
  const labels: Record<SectionId, string> = { announcement: copy.announcement, hero: copy.hero, trust: copy.trust, categories: copy.categories, featured: copy.featured, products: copy.products, testimonials: copy.testimonials, social: copy.social };

  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<AssetType | ''>('');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [dragged, setDragged] = useState<SectionId | null>(null);
  const [templateId, setTemplateId] = useState(theme.templateId);
  const [primary, setPrimary] = useState(theme.primaryColor);
  const [accent, setAccent] = useState(theme.accentColor);
  const [surface, setSurface] = useState(theme.surfaceColor);
  const [logoUrl, setLogoUrl] = useState(initialLogo);
  const [bannerUrl, setBannerUrl] = useState(settings?.bannerImage ?? '');
  const [welcome, setWelcome] = useState(settings?.welcomeText ?? '');
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(theme.sectionOrder);
  const [hiddenSections, setHiddenSections] = useState<SectionId[]>(theme.hiddenSections);
  const [heroStyle, setHeroStyle] = useState(theme.heroStyle);
  const [cardStyle, setCardStyle] = useState(theme.productCardStyle);
  const [announcement, setAnnouncement] = useState(theme.announcementText);
  const [heroTitle, setHeroTitle] = useState(theme.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(theme.heroSubtitle);
  const [heroCta, setHeroCta] = useState(theme.heroCtaLabel);
  const [trustItems, setTrustItems] = useState(theme.trustItems);
  const [testimonialQuote, setTestimonialQuote] = useState(theme.testimonialQuote);
  const [testimonialName, setTestimonialName] = useState(theme.testimonialName);
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

  function applyTemplate(id: string) {
    const selected = STOREFRONT_TEMPLATES.find(item => item.id === id);
    if (!selected) return;
    const next = selected.theme;
    setTemplateId(next.templateId); setPrimary(next.primaryColor); setAccent(next.accentColor); setSurface(next.surfaceColor);
    setSectionOrder([...next.sectionOrder]); setHiddenSections([...next.hiddenSections]); setHeroStyle(next.heroStyle); setCardStyle(next.productCardStyle);
    setAnnouncement(next.announcementText); setHeroTitle(next.heroTitle); setHeroSubtitle(next.heroSubtitle); setHeroCta(next.heroCtaLabel);
    setTrustItems([...next.trustItems]); setTestimonialQuote(next.testimonialQuote); setTestimonialName(next.testimonialName); changed();
  }

  async function uploadAsset(file: File, type: AssetType) {
    setError(''); setUploading(type);
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error(copy.uploadError);
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new Image(); const url = URL.createObjectURL(file);
        image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight }); };
        image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(copy.uploadError)); }; image.src = url;
      });
      const minimum = type === 'logo' ? { width: 400, height: 400 } : { width: 1200, height: 450 };
      if (dimensions.width < minimum.width || dimensions.height < minimum.height) throw new Error(copy.uploadError);
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
        theme: { templateId, primaryColor: primary, accentColor: accent, surfaceColor: surface, sectionOrder, hiddenSections, heroStyle, productCardStyle: cardStyle, announcementText: announcement, heroTitle, heroSubtitle, heroCtaLabel: heroCta, trustItems, testimonialQuote, testimonialName }, logoImage: logoUrl, bannerImage: bannerUrl || null, welcomeText: welcome || null,
        isOpen, deliveryEnabled: delivery, pickupEnabled: pickup, minimumOrderAmount: Number(minOrder) || 0, socialLinks: { whatsapp, instagram, facebook },
      });
      if (result.success) { setSaved(true); setDirty(false); } else setError(result.error ?? t.genericError);
    });
  }

  function previewSection(id: SectionId) {
    if (hiddenSections.includes(id)) return null;
    if (id === 'announcement') return <div className="px-4 py-2 text-center text-xs font-bold text-white" style={{ background: primary }}>{announcement}</div>;
    if (id === 'hero') return <div className={`relative min-h-52 overflow-hidden ${heroStyle === 'split' ? 'text-start' : 'text-center'}`} style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>{bannerUrl && <ExternalImage src={bannerUrl} alt="" fill sizes="900px" className={`object-cover ${heroStyle === 'immersive' ? 'opacity-70' : 'opacity-35'}`} />}<div className={`relative flex min-h-52 flex-col justify-center p-8 text-white ${heroStyle === 'split' ? 'items-start max-w-[65%]' : 'items-center'}`}><p className="text-2xl font-black">{heroTitle || welcome || merchantName}</p><p className="mt-2 max-w-lg text-sm text-white/85">{heroSubtitle}</p><span className="mt-4 rounded-xl bg-white px-4 py-2 text-xs font-black" style={{ color: primary }}>{heroCta}</span></div></div>;
    if (id === 'trust') return <div className="grid grid-cols-3 gap-2 p-4" style={{ background: surface }}>{trustItems.map((item, index) => <div key={index} className="rounded-xl bg-white p-3 text-center shadow-sm"><span className="block text-lg">{['✓','⚡','♡'][index]}</span><span className="text-[10px] font-bold text-stone-700">{item}</span></div>)}</div>;
    if (id === 'categories') return <div className="flex gap-2 overflow-hidden border-y border-stone-100 bg-white p-4">{[copy.all, copy.sampleCategory, copy.offers, copy.popular].map((item, index) => <span key={item} className="whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold" style={index === 0 ? { background: primary, color: 'white' } : { background: '#f5f5f4', color: '#57534e' }}>{item}</span>)}</div>;
    if (id === 'featured' || id === 'products') return <div className="p-5" style={{ background: surface }}><h3 className="mb-4 font-black text-stone-900">{id === 'featured' ? copy.featured : copy.sampleCategory}</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className={`overflow-hidden bg-white ${cardStyle === 'minimal' ? 'rounded-none shadow-none' : cardStyle === 'bordered' ? 'rounded-xl border-2 shadow-none' : 'rounded-2xl border border-stone-100 shadow-sm'}`}><div className="aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200" /><div className="p-3"><div className="h-2.5 w-2/3 rounded bg-stone-200" /><div className="mt-3 flex items-center justify-between"><span className="text-xs font-black" style={{ color: primary }}>0 SDG</span><span className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: primary }}>+</span></div></div></div>)}</div></div>;
    if (id === 'testimonials') return <div className="p-6 text-center" style={{ background: `${accent}14` }}><p className="text-xl text-amber-500">★★★★★</p><blockquote className="mx-auto mt-2 max-w-lg text-sm font-bold text-stone-800">“{testimonialQuote}”</blockquote><p className="mt-2 text-xs text-stone-500">— {testimonialName}</p></div>;
    return <div className="p-6 text-center text-white" style={{ background: '#07111f' }}><h3 className="font-black">{rtl ? 'تابعنا وتواصل معنا' : 'Follow and contact us'}</h3><div className="mt-3 flex justify-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-xs">WhatsApp</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs">Instagram</span></div></div>;
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
          <SettingCard title={copy.templates}><p className="text-xs text-[var(--muted-foreground)]">{copy.templatesHint}</p><div className="space-y-2">{STOREFRONT_TEMPLATES.map(item => <button key={item.id} type="button" onClick={() => applyTemplate(item.id)} className={`flex w-full items-center gap-3 rounded-xl border p-2 text-start transition ${templateId === item.id ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/10' : 'border-[var(--border)] hover:border-[var(--primary)]/50'}`}><span className="h-12 w-16 shrink-0 rounded-lg" style={{ background: item.preview }} /><span className="min-w-0 flex-1"><strong className="block text-sm text-[var(--foreground)]">{rtl ? item.nameAr : item.nameEn}</strong><span className="block text-[11px] text-[var(--muted-foreground)]">{rtl ? item.descriptionAr : item.descriptionEn}</span></span><span className="text-xs font-bold text-[var(--primary)]">{copy.apply}</span></button>)}</div></SettingCard>
          <SettingCard title={t.imagesTitle}><AssetDropzone type="logo" value={logoUrl} busy={uploading === 'logo'} label={copy.logo} hint={copy.logoHint} removeLabel={copy.remove} uploadLabel={copy.upload} uploadingLabel={copy.uploading} onUpload={uploadAsset} onRemove={() => setAndDirty(setLogoUrl, '')} /><AssetDropzone type="banner" value={bannerUrl} busy={uploading === 'banner'} label={copy.banner} hint={copy.bannerHint} removeLabel={copy.remove} uploadLabel={copy.upload} uploadingLabel={copy.uploading} onUpload={uploadAsset} onRemove={() => setAndDirty(setBannerUrl, '')} /><label className="block text-sm font-medium text-[var(--foreground)]">{t.welcomeMessageLabel}<textarea value={welcome} onChange={event => setAndDirty(setWelcome, event.target.value)} rows={3} className={`${inputCls} mt-2 resize-none`} placeholder={t.welcomePlaceholder} /></label></SettingCard>
          <SettingCard title={copy.content}><input value={announcement} maxLength={180} onChange={event => setAndDirty(setAnnouncement, event.target.value)} className={inputCls} placeholder={copy.announcement} /><input value={heroTitle} maxLength={180} onChange={event => setAndDirty(setHeroTitle, event.target.value)} className={inputCls} placeholder={rtl ? 'العنوان الرئيسي' : 'Hero title'} /><textarea value={heroSubtitle} maxLength={260} onChange={event => setAndDirty(setHeroSubtitle, event.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder={rtl ? 'وصف مختصر وجذاب' : 'Short compelling description'} /><input value={heroCta} maxLength={40} onChange={event => setAndDirty(setHeroCta, event.target.value)} className={inputCls} placeholder={rtl ? 'نص زر الإجراء' : 'CTA label'} />{trustItems.map((item, index) => <input key={index} value={item} maxLength={50} onChange={event => { const next = [...trustItems]; next[index] = event.target.value; setAndDirty(setTrustItems, next); }} className={inputCls} placeholder={`${copy.trust} ${index + 1}`} />)}<textarea value={testimonialQuote} maxLength={240} onChange={event => setAndDirty(setTestimonialQuote, event.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder={copy.testimonials} /><input value={testimonialName} maxLength={80} onChange={event => setAndDirty(setTestimonialName, event.target.value)} className={inputCls} placeholder={rtl ? 'اسم صاحب التقييم' : 'Reviewer name'} /></SettingCard>
          <SettingCard title={t.colorsTitle}>{[[t.primaryColorLabel, primary, setPrimary], [t.secondaryColorLabel, accent, setAccent], [rtl ? 'لون خلفية الأقسام' : 'Section background', surface, setSurface]].map(([label, value, setter]) => <label key={String(label)} className="flex items-center gap-3 text-sm text-[var(--foreground)]"><input type="color" value={String(value)} onChange={event => setAndDirty(setter as (value: string) => void, event.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border p-0.5" /><span className="flex-1">{String(label)}</span><code className="text-xs text-[var(--muted-foreground)]">{String(value)}</code></label>)}</SettingCard>
          <SettingCard title={copy.layout}><label className="text-xs text-[var(--muted-foreground)]">{copy.hero}<select value={heroStyle} onChange={event => setAndDirty(setHeroStyle, event.target.value as typeof heroStyle)} className={`${inputCls} mt-1`}><option value="centered">Centered</option><option value="split">Split</option><option value="immersive">Immersive</option></select></label><label className="text-xs text-[var(--muted-foreground)]">{copy.products}<select value={cardStyle} onChange={event => setAndDirty(setCardStyle, event.target.value as typeof cardStyle)} className={`${inputCls} mt-1`}><option value="soft">Soft cards</option><option value="bordered">Bordered</option><option value="minimal">Minimal</option></select></label></SettingCard>
          <SettingCard title={t.orderSettingsTitle}><Toggle checked={isOpen} onChange={value => setAndDirty(setIsOpen, value)} label={t.isOpenToggle} /><Toggle checked={delivery} onChange={value => setAndDirty(setDelivery, value)} label={t.deliveryToggle} /><Toggle checked={pickup} onChange={value => setAndDirty(setPickup, value)} label={t.pickupToggle} /><label className="block text-sm text-[var(--foreground)]">{t.minOrderLabel}<input type="number" min="0" value={minOrder} onChange={event => setAndDirty(setMinOrder, event.target.value)} className={`${inputCls} mt-2`} /></label></SettingCard>
          <SettingCard title={t.socialTitle}><input value={whatsapp} onChange={event => setAndDirty(setWhatsapp, event.target.value)} className={inputCls} placeholder={t.whatsappLabel} /><input value={instagram} onChange={event => setAndDirty(setInstagram, event.target.value)} className={inputCls} placeholder={t.instagramLabel} /><input value={facebook} onChange={event => setAndDirty(setFacebook, event.target.value)} className={inputCls} placeholder={t.facebookLabel} /></SettingCard>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{saved && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{t.saved}</p>}
        </aside>
      </div>
    </div>
  );
}
