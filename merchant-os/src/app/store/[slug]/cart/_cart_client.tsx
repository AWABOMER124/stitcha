'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type CartItem = {
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  selectedModifiers: { groupName: string; optionName: string; price: number }[];
  notes: string;
  totalPrice: number;
};

type Merchant = {
  name: string;
  storefrontSettings: {
    theme: unknown;
    minimumOrderAmount: unknown;
    isOpen: boolean;
  } | null;
};

function calcItemTotal(basePrice: number, mods: { price: number }[], qty: number) {
  return (basePrice + mods.reduce((s, m) => s + m.price, 0)) * qty;
}

export function CartClient({ merchant, slug }: { merchant: Merchant; slug: string }) {
  const router = useRouter();
  const settings = merchant.storefrontSettings;
  const theme = (settings?.theme ?? {}) as Record<string, string>;
  const primary = theme.primaryColor ?? '#b91c1c';
  const isOpen = settings?.isOpen ?? true;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`cart-${slug}`);
    if (saved) try { setCart(JSON.parse(saved)); } catch {}
    setReady(true);
  }, [slug]);

  useEffect(() => {
    if (ready) localStorage.setItem(`cart-${slug}`, JSON.stringify(cart));
  }, [cart, slug, ready]);

  function updateQty(idx: number, delta: number) {
    setCart(prev =>
      prev
        .map((item, i) => {
          if (i !== idx) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null as unknown as CartItem;
          return { ...item, quantity: newQty, totalPrice: calcItemTotal(item.basePrice, item.selectedModifiers, newQty) };
        })
        .filter(Boolean)
    );
  }

  const subtotal = cart.reduce((s, i) => s + i.totalPrice, 0);
  const minOrder = Number(settings?.minimumOrderAmount ?? 0);
  const canCheckout = subtotal >= minOrder && isOpen && cart.length > 0;

  if (!ready) {
    return <div className="flex h-64 items-center justify-center text-stone-400 text-sm">...</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">
      <style>{`:root{--sp:${primary}}`}</style>

      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm">
        <div className="mx-auto max-w-2xl flex items-center gap-3 px-4 h-14">
          <a href={`/store/${slug}`} className="text-stone-500 hover:text-stone-700 text-sm flex items-center gap-1">
            ← <span>{merchant.name}</span>
          </a>
          <span className="text-stone-300">/</span>
          <h1 className="font-bold text-stone-900">سلة الطلبات</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {cart.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-lg font-semibold text-stone-700">السلة فارغة</h2>
            <p className="text-sm text-stone-500 mt-2">أضف منتجات من القائمة للبدء</p>
            <a
              href={`/store/${slug}`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white transition-all"
              style={{ background: primary }}
            >
              تصفح القائمة
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item, idx) => (
              <div key={idx} className="flex gap-4 bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900">{item.name}</p>
                  {item.selectedModifiers.length > 0 && (
                    <p className="text-xs text-stone-400 mt-0.5">
                      {item.selectedModifiers.map(m => m.optionName).join('، ')}
                    </p>
                  )}
                  {item.notes && <p className="text-xs text-stone-400 italic mt-0.5">{item.notes}</p>}
                  <p className="text-sm font-bold mt-1" style={{ color: primary }}>
                    {item.totalPrice.toLocaleString()} SDG
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-stone-100 rounded-xl px-2 py-1 h-fit self-center">
                  <button
                    onClick={() => updateQty(idx, -1)}
                    className="w-7 h-7 flex items-center justify-center text-stone-500 font-bold text-lg"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-bold text-stone-800">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(idx, 1)}
                    className="w-7 h-7 flex items-center justify-center font-bold text-lg"
                    style={{ color: primary }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm space-y-3">
              {minOrder > 0 && subtotal < minOrder && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg py-2 px-3 text-center">
                  الحد الأدنى للطلب {minOrder.toLocaleString()} SDG — أضف{' '}
                  {(minOrder - subtotal).toLocaleString()} SDG
                </p>
              )}
              <div className="flex justify-between text-stone-600 text-sm">
                <span>الإجمالي</span>
                <span className="font-bold text-stone-900">{subtotal.toLocaleString()} SDG</span>
              </div>
              <button
                disabled={!canCheckout}
                onClick={() =>
                  router.push(
                    `/store/${slug}/checkout?cart=${encodeURIComponent(JSON.stringify(cart))}`
                  )
                }
                className="w-full py-3.5 rounded-2xl text-white font-bold text-base disabled:opacity-50 transition-all active:scale-95"
                style={{ background: primary }}
              >
                {!isOpen ? 'المتجر مغلق' : 'إتمام الطلب'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
