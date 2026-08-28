'use client';
import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/context';
import { LanguageToggle } from '@/lib/i18n/language-toggle';
import { ExternalImage } from '@/components/external-image';
import { normalizeStorefrontTheme, type StorefrontSection } from '@/lib/storefront-theme';

type Modifier = { id: string; name: string; required: boolean; minSelections: number; maxSelections: number; options: { name: string; price: number }[] };
export type Product = { id: string; name: string; slug: string; description: string | null; images: string[]; price: number; compareAtPrice?: number | null; isFeatured: boolean; categoryId: string; category: { id: string; name: string; slug: string }; modifiers: Modifier[] };
export type Category = { id: string; name: string; slug: string; _count: { products: number } };
export type Merchant = { id: string; name: string; slug: string; description: string | null; logo: string | null; coverImage: string | null; storefrontSettings: { theme: unknown; bannerImage: string | null; welcomeText: string | null; isOpen: boolean; minimumOrderAmount: number | string; deliveryEnabled: boolean; pickupEnabled: boolean; socialLinks: unknown } | null };

type CartItem = { productId: string; name: string; basePrice: number; quantity: number; selectedModifiers: { groupName: string; optionName: string; price: number }[]; notes: string; totalPrice: number };
type StoreChatMessage = { id: string; content: string; isFromCustomer: boolean; senderName: string | null; sentAt: string; readAt?: string | null };
type StoreChatSession = { conversationId: string; token: string };

function calcItemTotal(basePrice: number, mods: { price: number }[], qty: number) {
  return (basePrice + mods.reduce((s, m) => s + m.price, 0)) * qty;
}

export function StoreClient({ merchant, categories, products }: { merchant: Merchant; categories: Category[]; products: Product[] }) {
  const router = useRouter();
  const { dict, dir, locale } = useLocale();
  const t = dict.storefrontPublic;
  const settings = merchant.storefrontSettings;
  const rawTheme = (settings?.theme ?? {}) as Record<string, unknown>;
  const theme = normalizeStorefrontTheme(rawTheme, merchant.name);
  const primary = theme.primaryColor;
  const accent = theme.accentColor;
  const logoSrc = merchant.logo ?? (typeof rawTheme.logoUrl === 'string' ? rawTheme.logoUrl : null);
  const hiddenSections = new Set(theme.hiddenSections);
  const sectionStyle = (id: StorefrontSection): CSSProperties => ({ order: theme.sectionOrder.indexOf(id) });
  const isOpen = settings?.isOpen ?? true;

  const [activeCat, setActiveCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modSelections, setModSelections] = useState<Record<string, string[]>>({});
  const [itemQty, setItemQty] = useState(1);
  const [itemNotes, setItemNotes] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatName, setChatName] = useState('');
  const [chatPhone, setChatPhone] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [chatSession, setChatSession] = useState<StoreChatSession | null>(null);
  const [chatMessages, setChatMessages] = useState<StoreChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const catRefs = useRef<Record<string, HTMLElement | null>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatCopy = locale === 'ar' ? {
    subtitle: 'عادةً يرد المتجر خلال وقت قصير', phone: 'رقم الهاتف (اختياري)',
    start: 'بدء المحادثة', reply: 'اكتب رسالتك…', retry: 'تعذر إرسال الرسالة. حاول مرة أخرى.',
    newChat: 'محادثة جديدة', you: 'أنت', store: 'المتجر',
  } : {
    subtitle: 'The store usually replies shortly', phone: 'Phone number (optional)',
    start: 'Start conversation', reply: 'Write your message…', retry: 'Could not send the message. Please try again.',
    newChat: 'New conversation', you: 'You', store: 'Store',
  };

  useEffect(() => {
    // localStorage is unavailable during SSR, so this can't be a lazy useState initializer.
    const saved = localStorage.getItem(`cart-${merchant.slug}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) try { setCart(JSON.parse(saved)); } catch {}
  }, [merchant.slug]);

  useEffect(() => {
    localStorage.setItem(`cart-${merchant.slug}`, JSON.stringify(cart));
  }, [cart, merchant.slug]);

  const loadChat = useCallback(async (session: StoreChatSession) => {
    const response = await fetch(`/api/store/${merchant.slug}/conversations/${session.conversationId}`, {
      headers: { 'x-conversation-token': session.token },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Conversation unavailable');
    const data = await response.json();
    setChatMessages(data.messages ?? []);
  }, [merchant.slug]);

  useEffect(() => {
    const raw = localStorage.getItem(`store-chat-${merchant.slug}`);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as StoreChatSession;
      if (saved.conversationId && saved.token) {
        const restore = window.setTimeout(() => setChatSession(saved), 0);
        return () => window.clearTimeout(restore);
      }
    } catch {
      localStorage.removeItem(`store-chat-${merchant.slug}`);
    }
  }, [merchant.slug]);

  useEffect(() => {
    if (!chatOpen || !chatSession) return;
    const initial = window.setTimeout(() => void loadChat(chatSession).catch(() => setChatError(chatCopy.retry)), 0);
    const poll = window.setInterval(() => void loadChat(chatSession).catch(() => {}), 5000);
    return () => { window.clearTimeout(initial); window.clearInterval(poll); };
  }, [chatOpen, chatSession, loadChat, chatCopy.retry]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const filtered = products.filter(p => {
    const matchCat = activeCat === 'all' || p.categoryId === activeCat;
    const matchSearch = !search || p.name.includes(search) || p.description?.includes(search);
    return matchCat && matchSearch;
  });

  const grouped = categories.map(cat => ({
    ...cat,
    products: filtered.filter(p => p.categoryId === cat.id),
  })).filter(c => c.products.length > 0);

  const cartTotal = cart.reduce((s, i) => s + i.totalPrice, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  function openProduct(p: Product) {
    setSelectedProduct(p);
    setModSelections({});
    setItemQty(1);
    setItemNotes('');
  }

  function toggleModOption(modId: string, optName: string, maxSel: number) {
    setModSelections(prev => {
      const cur = prev[modId] ?? [];
      if (cur.includes(optName)) return { ...prev, [modId]: cur.filter(x => x !== optName) };
      if (maxSel === 1) return { ...prev, [modId]: [optName] };
      if (cur.length >= maxSel) return prev;
      return { ...prev, [modId]: [...cur, optName] };
    });
  }

  function addToCart() {
    if (!selectedProduct) return;
    const mods = selectedProduct.modifiers.flatMap(mod =>
      (modSelections[mod.id] ?? []).map(optName => {
        const opt = mod.options.find(o => o.name === optName)!;
        return { groupName: mod.name, optionName: opt.name, price: opt.price };
      })
    );
    const totalPrice = calcItemTotal(selectedProduct.price, mods, itemQty);
    setCart(prev => {
      const existing = prev.find(i => i.productId === selectedProduct.id && JSON.stringify(i.selectedModifiers) === JSON.stringify(mods));
      if (existing) return prev.map(i => i === existing ? { ...i, quantity: i.quantity + itemQty, totalPrice: calcItemTotal(i.basePrice, i.selectedModifiers, i.quantity + itemQty) } : i);
      return [...prev, { productId: selectedProduct.id, name: selectedProduct.name, basePrice: selectedProduct.price, quantity: itemQty, selectedModifiers: mods, notes: itemNotes, totalPrice }];
    });
    setSelectedProduct(null);
    setCartOpen(true);
  }

  function updateQty(idx: number, delta: number) {
    setCart(prev => prev.map((item, i): CartItem | null => {
      if (i !== idx) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return null;
      return { ...item, quantity: newQty, totalPrice: calcItemTotal(item.basePrice, item.selectedModifiers, newQty) };
    }).filter((item): item is CartItem => item !== null));
  }

  async function sendChat() {
    if (!chatMsg.trim() || (!chatSession && !chatName.trim())) return;
    setChatLoading(true);
    setChatError('');
    try {
      const response = await fetch(chatSession
        ? `/api/store/${merchant.slug}/conversations/${chatSession.conversationId}`
        : `/api/store/${merchant.slug}/inquiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(chatSession ? { 'x-conversation-token': chatSession.token } : {}),
        },
        body: JSON.stringify(chatSession
          ? { message: chatMsg }
          : { customerName: chatName, customerPhone: chatPhone || undefined, message: chatMsg }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Send failed');
      let activeSession = chatSession;
      if (!activeSession) {
        activeSession = { conversationId: data.conversationId, token: data.token };
        localStorage.setItem(`store-chat-${merchant.slug}`, JSON.stringify(activeSession));
        setChatSession(activeSession);
      }
      setChatMsg('');
      await loadChat(activeSession);
    } catch {
      setChatError(chatCopy.retry);
    } finally {
      setChatLoading(false);
    }
  }

  function startNewChat() {
    localStorage.removeItem(`store-chat-${merchant.slug}`);
    setChatSession(null);
    setChatMessages([]);
    setChatName('');
    setChatPhone('');
    setChatMsg('');
    setChatError('');
  }

  const minOrder = Number(settings?.minimumOrderAmount ?? 0);
  const canCheckout = cartTotal >= minOrder;
  const featuredProducts = filtered.filter(product => product.isFeatured).slice(0, 6);
  const cardClass = theme.productCardStyle === 'minimal'
    ? 'bg-white overflow-hidden text-right transition-all active:scale-95 group'
    : theme.productCardStyle === 'bordered'
      ? 'bg-white rounded-xl border-2 border-stone-200 overflow-hidden text-right hover:border-[var(--sp)] transition-all active:scale-95 group'
      : 'bg-white rounded-2xl border border-stone-100 overflow-hidden text-right shadow-sm hover:shadow-md transition-all active:scale-95 group';

  function productCard(product: Product) {
    return <button key={product.id} onClick={() => openProduct(product)} className={cardClass}>
      <div className="relative aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center overflow-hidden">
        {product.images?.[0]
          ? <ExternalImage src={product.images[0]} alt={product.name} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform" />
          : <span className="text-4xl opacity-40">{product.category.name.includes('مشروب') ? '🥤' : product.category.name.includes('حلو') ? '🍰' : '🛍️'}</span>}
        {product.isFeatured && <span className="absolute start-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black" style={{ color: primary }}>★ مميز</span>}
      </div>
      <div className="p-3"><p className="font-semibold text-stone-900 text-sm leading-tight">{product.name}</p>{product.description && <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{product.description}</p>}<div className="mt-2 flex items-center justify-between"><span className="text-sm font-bold" style={{ color: primary }}>{Number(product.price).toLocaleString()} SDG</span>{product.compareAtPrice && <span className="text-xs text-stone-400 line-through">{Number(product.compareAtPrice).toLocaleString()}</span>}<span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-lg font-light" style={{ background: primary }}>+</span></div></div>
    </button>;
  }

  return (
    <div dir={dir} className="min-h-screen bg-stone-50">
      <style>{`:root{--sp:${primary}}`}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm">
        <div className="mx-auto max-w-4xl flex items-center gap-3 px-4 h-14">
          {logoSrc
            ? <ExternalImage src={logoSrc} alt={merchant.name} width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
            : <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: primary }}>{merchant.name[0]}</div>}
          <span className="font-bold text-stone-900 flex-1">{merchant.name}</span>
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {isOpen ? t.open : t.closed}
          </div>
          <LanguageToggle />
          <button onClick={() => setCartOpen(true)} className="relative p-2 rounded-xl" style={{ background: `${primary}15` }}>
            <svg className="w-5 h-5" style={{ color: primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            {cartCount > 0 && <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: primary }}>{cartCount}</span>}
          </button>
        </div>
        {/* Search */}
        <div className="px-4 pb-3 max-w-4xl mx-auto">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchPlaceholder} className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 text-stone-900 placeholder:text-stone-400" style={{ '--tw-ring-color': primary } as CSSProperties} />
        </div>
      </header>

      <div className="flex flex-col">
      {!hiddenSections.has('announcement') && theme.announcementText && (
        <div className="px-4 py-2.5 text-center text-sm font-bold text-white" style={{ background: primary, ...sectionStyle('announcement') }}>
          {theme.announcementText}
        </div>
      )}

      {/* Hero */}
      {!hiddenSections.has('hero') && (
        <section className={`relative overflow-hidden ${theme.heroStyle === 'immersive' ? 'min-h-[430px]' : 'min-h-[310px]'}`} style={{ background: `linear-gradient(135deg, ${primary}, ${accent})`, ...sectionStyle('hero') }}>
          {settings?.bannerImage && (
            <ExternalImage
              src={settings.bannerImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className={`object-cover ${theme.heroStyle === 'immersive' ? 'opacity-55' : 'mix-blend-overlay opacity-35'}`}
            />
          )}
          <div className={`relative mx-auto flex min-h-[310px] max-w-4xl items-center px-6 py-12 text-white ${theme.heroStyle === 'centered' ? 'justify-center text-center' : theme.heroStyle === 'split' ? 'md:w-2/3 md:ms-0' : 'items-end min-h-[430px]'}`}>
            <div className="max-w-xl">
              <h1 className="text-3xl font-black leading-tight sm:text-5xl">{theme.heroTitle}</h1>
              <p className="mt-4 text-base leading-7 text-white/85 sm:text-lg">{theme.heroSubtitle}</p>
              {!settings?.deliveryEnabled && settings?.pickupEnabled && <p className="mt-2 text-sm text-white/70">{t.pickupOnlyNote}</p>}
              <button onClick={() => document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' })} className="mt-6 rounded-xl bg-white px-6 py-3 text-sm font-black shadow-lg transition-transform hover:-translate-y-0.5" style={{ color: primary }}>
                {theme.heroCtaLabel}
              </button>
            </div>
          </div>
        </section>
      )}

      {!hiddenSections.has('trust') && (
        <section className="border-b border-stone-100 px-4 py-5" style={{ background: theme.surfaceColor, ...sectionStyle('trust') }}>
          <div className="mx-auto grid max-w-4xl grid-cols-3 gap-2">
            {theme.trustItems.map((item, index) => <div key={`${item}-${index}`} className="rounded-xl bg-white/80 px-2 py-3 text-center text-xs font-bold text-stone-700 shadow-sm"><span className="mb-1 block text-lg">{['✓', '◇', '⚡'][index]}</span>{item}</div>)}
          </div>
        </section>
      )}

      {/* Category Tabs */}
      {!hiddenSections.has('categories') && <div className="sticky top-[106px] z-30 bg-white border-b border-stone-100" style={sectionStyle('categories')}>
        <div className="max-w-4xl mx-auto px-4 flex gap-2 overflow-x-auto py-2 no-scrollbar">
          <button onClick={() => setActiveCat('all')} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCat === 'all' ? 'text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`} style={activeCat === 'all' ? { background: primary } : {}}>{t.allCategory}</button>
          {categories.map(c => (
            <button key={c.id} onClick={() => { setActiveCat(c.id); catRefs.current[c.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCat === c.id ? 'text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`} style={activeCat === c.id ? { background: primary } : {}}>{c.name}</button>
          ))}
        </div>
      </div>}

      {!hiddenSections.has('featured') && featuredProducts.length > 0 && (
        <section className="px-4 py-8" style={{ background: theme.surfaceColor, ...sectionStyle('featured') }}>
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold" style={{ color: primary }}>اختيارات المتجر</p><h2 className="text-xl font-black text-stone-900">منتجات مميزة</h2></div><span className="text-2xl">★</span></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{featuredProducts.map(productCard)}</div>
          </div>
        </section>
      )}

      {/* Products */}
      {!hiddenSections.has('products') && <main id="store-products" className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8" style={sectionStyle('products')}>
        {grouped.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <div className="text-5xl mb-3">🔍</div>
            <p>{t.noProducts}</p>
          </div>
        )}
        {grouped.map(cat => (
          <section key={cat.id} ref={el => { catRefs.current[cat.id] = el; }}>
            <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full inline-block" style={{ background: primary }} />
              {cat.name}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {cat.products.map(productCard)}
            </div>
          </section>
        ))}
      </main>}

      {!hiddenSections.has('testimonials') && (
        <section className="px-4 py-10 text-center" style={{ background: theme.surfaceColor, ...sectionStyle('testimonials') }}>
          <div className="mx-auto max-w-2xl rounded-3xl bg-white px-6 py-8 shadow-sm"><div className="mb-3 text-3xl" style={{ color: accent }}>“</div><blockquote className="text-lg font-bold leading-8 text-stone-800">{theme.testimonialQuote}</blockquote><p className="mt-3 text-sm text-stone-500">— {theme.testimonialName}</p></div>
        </section>
      )}

      {!hiddenSections.has('social') && (
        <section className="border-t border-stone-100 bg-white px-4 py-10 text-center" style={sectionStyle('social')}>
          <div className="mx-auto max-w-4xl"><h2 className="text-xl font-black text-stone-900">تواصل معنا</h2><p className="mt-2 text-sm text-stone-500">نحن قريبون منك للإجابة عن أسئلتك ومتابعة طلبك.</p><button onClick={() => setChatOpen(true)} className="mt-5 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-sm" style={{ background: primary }}>ابدأ محادثة</button><p className="mt-7 text-xs text-stone-400">متجر إلكتروني بواسطة وصلة</p></div>
        </section>
      )}
      </div>

      {/* Cart FAB */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-6 inset-x-0 px-4 z-40" dir={dir}>
          <button onClick={() => setCartOpen(true)} className="w-full max-w-sm mx-auto flex items-center justify-between rounded-2xl px-5 py-3.5 text-white shadow-xl" style={{ background: primary }}>
            <span className="font-bold text-base">{cartTotal.toLocaleString()} SDG</span>
            <span className="font-medium">{t.viewCart} ({cartCount})</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </button>
        </div>
      )}

      {/* Chat FAB */}
      <button onClick={() => setChatOpen(true)} className="fixed bottom-24 left-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white text-xl" style={{ background: primary }}>💬</button>

      {/* Product Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir={dir}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {selectedProduct.images?.[0]
              ? <div className="relative h-48 w-full"><ExternalImage src={selectedProduct.images[0]} alt={selectedProduct.name} fill sizes="(max-width: 640px) 100vw, 512px" className="object-cover rounded-t-3xl" /></div>
              : <div className="w-full h-32 rounded-t-3xl flex items-center justify-center text-6xl" style={{ background: `${primary}15` }}>🍽️</div>}
            <button onClick={() => setSelectedProduct(null)} className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-stone-600 shadow">✕</button>
            <div className="p-5">
              <h3 className="text-xl font-bold text-stone-900">{selectedProduct.name}</h3>
              {selectedProduct.description && <p className="mt-1 text-sm text-stone-500">{selectedProduct.description}</p>}
              <p className="mt-2 text-xl font-bold" style={{ color: primary }}>{Number(selectedProduct.price).toLocaleString()} SDG</p>

              {/* Modifiers */}
              {selectedProduct.modifiers.map(mod => (
                <div key={mod.id} className="mt-5">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-stone-800">{mod.name}</h4>
                    {mod.required && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{t.required}</span>}
                    {mod.maxSelections > 1 && <span className="text-xs text-stone-400">{t.chooseUpTo.replace('{n}', String(mod.maxSelections))}</span>}
                  </div>
                  <div className="space-y-2">
                    {mod.options.map(opt => {
                      const selected = (modSelections[mod.id] ?? []).includes(opt.name);
                      return (
                        <button key={opt.name} onClick={() => toggleModOption(mod.id, opt.name, mod.maxSelections)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-sm ${selected ? 'border-[var(--sp)] bg-[color-mix(in_srgb,var(--sp)_8%,white)]' : 'border-stone-100 hover:border-stone-200'}`}>
                          <span className="font-medium text-stone-800">{opt.name}</span>
                          <div className="flex items-center gap-3">
                            {opt.price > 0 && <span className="text-stone-500">+{opt.price} SDG</span>}
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selected ? 'border-[var(--sp)] bg-[var(--sp)]' : 'border-stone-300'}`}>
                              {selected && <span className="text-white text-xs">✓</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Notes */}
              <div className="mt-4">
                <label className="text-sm font-medium text-stone-600 block mb-1">{t.notesLabel}</label>
                <textarea value={itemNotes} onChange={e => setItemNotes(e.target.value)} rows={2} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none resize-none" placeholder={t.notesPlaceholder} />
              </div>

              {/* Qty + Add */}
              <div className="mt-5 flex items-center gap-4">
                <div className="flex items-center gap-3 bg-stone-100 rounded-xl px-2 py-1">
                  <button onClick={() => setItemQty(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-xl font-bold text-stone-600">−</button>
                  <span className="w-6 text-center font-bold text-stone-900">{itemQty}</span>
                  <button onClick={() => setItemQty(q => q + 1)} className="w-8 h-8 flex items-center justify-center text-xl font-bold" style={{ color: primary }}>+</button>
                </div>
                <button onClick={addToCart} disabled={!isOpen} className="flex-1 py-3 rounded-xl text-white font-bold text-base disabled:opacity-50 transition-all active:scale-95" style={{ background: primary }}>
                  {isOpen ? `${t.addToCart} — ${calcItemTotal(selectedProduct.price, selectedProduct.modifiers.flatMap(m => (modSelections[m.id] ?? []).map(n => m.options.find(o => o.name === n)!)), itemQty).toLocaleString()} SDG` : t.storeClosed}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end" dir={dir}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl sm:rounded-l-none w-full sm:w-96 sm:h-full max-h-[90vh] sm:max-h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="font-bold text-stone-900 text-lg">{t.cartTitle}</h2>
              <button onClick={() => setCartOpen(false)} className="text-stone-400 hover:text-stone-600 text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {cart.length === 0
                ? <div className="text-center py-12 text-stone-400"><div className="text-5xl mb-3">🛒</div><p>{t.cartEmpty}</p></div>
                : cart.map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-stone-900 text-sm">{item.name}</p>
                      {item.selectedModifiers.length > 0 && <p className="text-xs text-stone-400 mt-0.5">{item.selectedModifiers.map(m => m.optionName).join('، ')}</p>}
                      {item.notes && <p className="text-xs text-stone-400 italic">{item.notes}</p>}
                      <p className="text-sm font-bold mt-1" style={{ color: primary }}>{item.totalPrice.toLocaleString()} SDG</p>
                    </div>
                    <div className="flex items-center gap-2 bg-stone-100 rounded-xl px-2 py-1 h-fit self-center">
                      <button onClick={() => updateQty(idx, -1)} className="w-6 h-6 flex items-center justify-center text-stone-500 font-bold text-lg">−</button>
                      <span className="w-5 text-center text-sm font-bold text-stone-800">{item.quantity}</span>
                      <button onClick={() => updateQty(idx, 1)} className="w-6 h-6 flex items-center justify-center font-bold text-lg" style={{ color: primary }}>+</button>
                    </div>
                  </div>
                ))
              }
            </div>
            {cart.length > 0 && (
              <div className="px-5 py-4 border-t border-stone-100 space-y-3">
                {minOrder > 0 && cartTotal < minOrder && <p className="text-xs text-amber-600 text-center bg-amber-50 rounded-lg py-2">{t.minOrderNote.replace('{min}', String(minOrder)).replace('{remaining}', (minOrder - cartTotal).toLocaleString())}</p>}
                <div className="flex justify-between text-stone-600 text-sm"><span>{t.total}</span><span className="font-bold text-stone-900">{cartTotal.toLocaleString()} SDG</span></div>
                <button disabled={!canCheckout || !isOpen} onClick={() => { setCartOpen(false); router.push(`/store/${merchant.slug}/checkout?cart=${encodeURIComponent(JSON.stringify(cart))}`); }} className="w-full py-3.5 rounded-2xl text-white font-bold text-base disabled:opacity-50 transition-all active:scale-95" style={{ background: primary }}>
                  {!isOpen ? t.storeClosed : t.checkoutButton}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Widget */}
      {chatOpen && (
        <div className="fixed bottom-20 left-4 z-50 flex max-h-[min(620px,75vh)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl" dir={dir}>
          <div className="px-4 py-3 text-white flex items-center justify-between" style={{ background: primary }}>
            <div><span className="block font-bold text-sm">{t.contactUs}</span><span className="text-[11px] text-white/75">{chatCopy.subtitle}</span></div>
            <button onClick={() => setChatOpen(false)} className="text-white/80 hover:text-white">✕</button>
          </div>
          {chatSession ? <>
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-4 py-2 text-xs text-stone-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />{t.messageSentSubtitle}</span>
              <button onClick={startNewChat} className="font-bold hover:text-stone-800">{chatCopy.newChat}</button>
            </div>
            <div className="min-h-52 flex-1 space-y-3 overflow-y-auto bg-stone-50/60 p-4">
              {chatMessages.map(message => <div key={message.id} className={`flex ${message.isFromCustomer ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm ${message.isFromCustomer ? 'rounded-ee-md text-white' : 'rounded-es-md border border-stone-200 bg-white text-stone-800'}`} style={message.isFromCustomer ? { background: primary } : undefined}>
                  <p className="mb-1 text-[10px] font-bold opacity-65">{message.isFromCustomer ? chatCopy.you : chatCopy.store}</p>
                  <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                  <p className="mt-1 text-[9px] opacity-55">{new Date(message.sentAt).toLocaleTimeString(locale === 'ar' ? 'ar-SD' : 'en', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>)}
              <div ref={chatEndRef} />
            </div>
            {chatError && <p className="px-4 pt-2 text-xs text-red-600">{chatError}</p>}
            <div className="flex gap-2 border-t border-stone-100 bg-white p-3">
              <textarea value={chatMsg} onChange={e => setChatMsg(e.target.value)} rows={2} placeholder={chatCopy.reply} className="min-h-11 flex-1 resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400" />
              <button onClick={sendChat} disabled={chatLoading || !chatMsg.trim()} className="self-end rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50" style={{ background: primary }}>{chatLoading ? '…' : t.send}</button>
            </div>
          </> : <div className="p-4 space-y-3">
              <input value={chatName} onChange={e => setChatName(e.target.value)} placeholder={t.namePlaceholder} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none" />
              <input value={chatPhone} onChange={e => setChatPhone(e.target.value)} inputMode="tel" placeholder={chatCopy.phone} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none" />
              <textarea value={chatMsg} onChange={e => setChatMsg(e.target.value)} rows={3} placeholder={t.messagePlaceholder} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none resize-none" />
              {chatError && <p className="text-xs text-red-600">{chatError}</p>}
              <button onClick={sendChat} disabled={chatLoading || !chatName.trim() || !chatMsg.trim()} className="w-full py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50" style={{ background: primary }}>{chatLoading ? '…' : chatCopy.start}</button>
            </div>}
        </div>
      )}
    </div>
  );
}
