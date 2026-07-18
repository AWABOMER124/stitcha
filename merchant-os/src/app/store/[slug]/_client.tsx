'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Modifier = { id: string; name: string; required: boolean; minSelections: number; maxSelections: number; options: { name: string; price: number }[] };
type Product = { id: string; name: string; slug: string; description: string | null; images: string[]; price: number; compareAtPrice?: number | null; isFeatured: boolean; categoryId: string; category: { id: string; name: string; slug: string }; modifiers: Modifier[] };
type Category = { id: string; name: string; slug: string; _count: { products: number } };
type Merchant = { id: string; name: string; slug: string; description: string | null; logo: string | null; coverImage: string | null; storefrontSettings: { theme: any; bannerImage: string | null; welcomeText: string | null; isOpen: boolean; minimumOrderAmount: any; deliveryEnabled: boolean; pickupEnabled: boolean; socialLinks: any } | null };

type CartItem = { productId: string; name: string; basePrice: number; quantity: number; selectedModifiers: { groupName: string; optionName: string; price: number }[]; notes: string; totalPrice: number };

function calcItemTotal(basePrice: number, mods: { price: number }[], qty: number) {
  return (basePrice + mods.reduce((s, m) => s + m.price, 0)) * qty;
}

export function StoreClient({ merchant, categories, products }: { merchant: Merchant; categories: Category[]; products: Product[] }) {
  const router = useRouter();
  const settings = merchant.storefrontSettings;
  const theme = (settings?.theme ?? {}) as Record<string, string>;
  const primary = theme.primaryColor ?? '#b91c1c';
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
  const [chatMsg, setChatMsg] = useState('');
  const [chatSent, setChatSent] = useState(false);
  const catRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    // localStorage is unavailable during SSR, so this can't be a lazy useState initializer.
    const saved = localStorage.getItem(`cart-${merchant.slug}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) try { setCart(JSON.parse(saved)); } catch {}
  }, [merchant.slug]);

  useEffect(() => {
    localStorage.setItem(`cart-${merchant.slug}`, JSON.stringify(cart));
  }, [cart, merchant.slug]);

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
    setCart(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return null as any;
      return { ...item, quantity: newQty, totalPrice: calcItemTotal(item.basePrice, item.selectedModifiers, newQty) };
    }).filter(Boolean));
  }

  async function sendChat() {
    if (!chatName.trim() || !chatMsg.trim()) return;
    await fetch(`/api/store/${merchant.slug}/inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: chatName, message: chatMsg, merchantId: merchant.id }),
    }).catch(() => {});
    setChatSent(true);
  }

  const minOrder = Number(settings?.minimumOrderAmount ?? 0);
  const canCheckout = cartTotal >= minOrder;

  return (
    <div dir="rtl" className="min-h-screen bg-stone-50">
      <style>{`:root{--sp:${primary}}`}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm">
        <div className="mx-auto max-w-4xl flex items-center gap-3 px-4 h-14">
          {merchant.logo
            ? <img src={merchant.logo} alt="" className="h-8 w-8 rounded-lg object-cover" />
            : <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: primary }}>{merchant.name[0]}</div>}
          <span className="font-bold text-stone-900 flex-1">{merchant.name}</span>
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {isOpen ? 'مفتوح' : 'مغلق'}
          </div>
          <button onClick={() => setCartOpen(true)} className="relative p-2 rounded-xl" style={{ background: `${primary}15` }}>
            <svg className="w-5 h-5" style={{ color: primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            {cartCount > 0 && <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: primary }}>{cartCount}</span>}
          </button>
        </div>
        {/* Search */}
        <div className="px-4 pb-3 max-w-4xl mx-auto">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن منتج..." className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 text-stone-900 placeholder:text-stone-400" style={{ '--tw-ring-color': primary } as any} />
        </div>
      </header>

      {/* Hero */}
      {(settings?.welcomeText || settings?.bannerImage) && (
        <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primary}ee, ${primary}99)` }}>
          {settings.bannerImage && <img src={settings.bannerImage} alt="" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30" />}
          <div className="relative px-4 py-8 text-white text-center max-w-4xl mx-auto">
            <p className="text-lg font-medium">{settings.welcomeText}</p>
            {!settings.deliveryEnabled && settings.pickupEnabled && <p className="mt-1 text-sm text-white/70">الاستلام من الفرع فقط</p>}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="sticky top-[106px] z-30 bg-white border-b border-stone-100">
        <div className="max-w-4xl mx-auto px-4 flex gap-2 overflow-x-auto py-2 no-scrollbar">
          <button onClick={() => setActiveCat('all')} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCat === 'all' ? 'text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`} style={activeCat === 'all' ? { background: primary } : {}}>الكل</button>
          {categories.map(c => (
            <button key={c.id} onClick={() => { setActiveCat(c.id); catRefs.current[c.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCat === c.id ? 'text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`} style={activeCat === c.id ? { background: primary } : {}}>{c.name}</button>
          ))}
        </div>
      </div>

      {/* Products */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {grouped.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <div className="text-5xl mb-3">🔍</div>
            <p>لا توجد منتجات</p>
          </div>
        )}
        {grouped.map(cat => (
          <section key={cat.id} ref={el => { catRefs.current[cat.id] = el; }}>
            <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full inline-block" style={{ background: primary }} />
              {cat.name}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {cat.products.map(p => (
                <button key={p.id} onClick={() => openProduct(p)} className="bg-white rounded-2xl border border-stone-100 overflow-hidden text-right shadow-sm hover:shadow-md transition-all active:scale-95 group">
                  <div className="aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center overflow-hidden">
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      : <span className="text-4xl opacity-40">{p.category.name.includes('مشروب') ? '🥤' : p.category.name.includes('حلو') ? '🍰' : '🍽️'}</span>}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-stone-900 text-sm leading-tight">{p.name}</p>
                    {p.description && <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{p.description}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: primary }}>{Number(p.price).toLocaleString()} SDG</span>
                      {p.compareAtPrice && <span className="text-xs text-stone-400 line-through">{Number(p.compareAtPrice).toLocaleString()}</span>}
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-lg font-light" style={{ background: primary }}>+</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Cart FAB */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-6 inset-x-0 px-4 z-40" dir="rtl">
          <button onClick={() => setCartOpen(true)} className="w-full max-w-sm mx-auto flex items-center justify-between rounded-2xl px-5 py-3.5 text-white shadow-xl" style={{ background: primary }}>
            <span className="font-bold text-base">{cartTotal.toLocaleString()} SDG</span>
            <span className="font-medium">عرض السلة ({cartCount})</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </button>
        </div>
      )}

      {/* Chat FAB */}
      <button onClick={() => setChatOpen(true)} className="fixed bottom-24 left-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white text-xl" style={{ background: primary }}>💬</button>

      {/* Product Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {selectedProduct.images?.[0]
              ? <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-48 object-cover rounded-t-3xl sm:rounded-t-3xl" />
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
                    {mod.required && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">مطلوب</span>}
                    {mod.maxSelections > 1 && <span className="text-xs text-stone-400">اختر حتى {mod.maxSelections}</span>}
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
                <label className="text-sm font-medium text-stone-600 block mb-1">ملاحظات (اختياري)</label>
                <textarea value={itemNotes} onChange={e => setItemNotes(e.target.value)} rows={2} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none resize-none" placeholder="أي طلبات خاصة..." />
              </div>

              {/* Qty + Add */}
              <div className="mt-5 flex items-center gap-4">
                <div className="flex items-center gap-3 bg-stone-100 rounded-xl px-2 py-1">
                  <button onClick={() => setItemQty(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-xl font-bold text-stone-600">−</button>
                  <span className="w-6 text-center font-bold text-stone-900">{itemQty}</span>
                  <button onClick={() => setItemQty(q => q + 1)} className="w-8 h-8 flex items-center justify-center text-xl font-bold" style={{ color: primary }}>+</button>
                </div>
                <button onClick={addToCart} disabled={!isOpen} className="flex-1 py-3 rounded-xl text-white font-bold text-base disabled:opacity-50 transition-all active:scale-95" style={{ background: primary }}>
                  {isOpen ? `أضف للسلة — ${calcItemTotal(selectedProduct.price, selectedProduct.modifiers.flatMap(m => (modSelections[m.id] ?? []).map(n => m.options.find(o => o.name === n)!)), itemQty).toLocaleString()} SDG` : 'المتجر مغلق'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end" dir="rtl">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl sm:rounded-l-none w-full sm:w-96 sm:h-full max-h-[90vh] sm:max-h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="font-bold text-stone-900 text-lg">سلة الطلبات</h2>
              <button onClick={() => setCartOpen(false)} className="text-stone-400 hover:text-stone-600 text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {cart.length === 0
                ? <div className="text-center py-12 text-stone-400"><div className="text-5xl mb-3">🛒</div><p>السلة فارغة</p></div>
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
                {minOrder > 0 && cartTotal < minOrder && <p className="text-xs text-amber-600 text-center bg-amber-50 rounded-lg py-2">الحد الأدنى للطلب {minOrder} SDG — أضف {(minOrder - cartTotal).toLocaleString()} SDG</p>}
                <div className="flex justify-between text-stone-600 text-sm"><span>الإجمالي</span><span className="font-bold text-stone-900">{cartTotal.toLocaleString()} SDG</span></div>
                <button disabled={!canCheckout || !isOpen} onClick={() => { setCartOpen(false); router.push(`/store/${merchant.slug}/checkout?cart=${encodeURIComponent(JSON.stringify(cart))}`); }} className="w-full py-3.5 rounded-2xl text-white font-bold text-base disabled:opacity-50 transition-all active:scale-95" style={{ background: primary }}>
                  {!isOpen ? 'المتجر مغلق' : 'إتمام الطلب'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Widget */}
      {chatOpen && (
        <div className="fixed bottom-24 left-4 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden" dir="rtl">
          <div className="px-4 py-3 text-white flex items-center justify-between" style={{ background: primary }}>
            <span className="font-bold text-sm">تواصل معنا</span>
            <button onClick={() => setChatOpen(false)} className="text-white/80 hover:text-white">✕</button>
          </div>
          {chatSent
            ? <div className="p-6 text-center text-stone-600"><div className="text-3xl mb-2">✅</div><p className="font-medium">تم إرسال رسالتك!</p><p className="text-sm text-stone-400 mt-1">سنتواصل معك قريباً</p></div>
            : <div className="p-4 space-y-3">
              <input value={chatName} onChange={e => setChatName(e.target.value)} placeholder="اسمك" className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none" />
              <textarea value={chatMsg} onChange={e => setChatMsg(e.target.value)} rows={3} placeholder="كيف نقدر نساعدك؟" className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none resize-none" />
              <button onClick={sendChat} disabled={!chatName.trim() || !chatMsg.trim()} className="w-full py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50" style={{ background: primary }}>إرسال</button>
            </div>
          }
        </div>
      )}
    </div>
  );
}
