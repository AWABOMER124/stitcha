'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { placeOrderAction } from '@/modules/storefront/actions';

type CartItem = { productId: string; name: string; basePrice: number; quantity: number; selectedModifiers: { groupName: string; optionName: string; price: number }[]; notes: string; totalPrice: number };
export type Merchant = { id: string; name: string; slug: string; storefrontSettings: { theme: unknown; isOpen: boolean; minimumOrderAmount: number | string; deliveryEnabled: boolean; pickupEnabled: boolean } | null };

export function CheckoutClient({ merchant, slug }: { merchant: Merchant; slug: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const settings = merchant.storefrontSettings;
  const theme = (settings?.theme ?? {}) as Record<string, string>;
  const primary = theme.primaryColor ?? '#b91c1c';

  const [cart, setCart] = useState<CartItem[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<'PICKUP' | 'MERCHANT_DELIVERY'>('PICKUP');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // localStorage is unavailable during SSR, so this can't be a lazy useState initializer.
    const raw = sp.get('cart');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (raw) try { setCart(JSON.parse(decodeURIComponent(raw))); } catch {}
    else {
      const saved = localStorage.getItem(`cart-${slug}`);
      if (saved) try { setCart(JSON.parse(saved)); } catch {}
    }
  }, [slug, sp]);

  const subtotal = cart.reduce((s, i) => s + i.totalPrice, 0);
  const minOrder = Number(settings?.minimumOrderAmount ?? 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { setError('الاسم ورقم الهاتف مطلوبان'); return; }
    if (method === 'MERCHANT_DELIVERY' && !address.trim()) { setError('العنوان مطلوب للتوصيل'); return; }
    if (subtotal < minOrder) { setError(`الحد الأدنى للطلب ${minOrder} SDG`); return; }
    setLoading(true);
    setError('');
    const result = await placeOrderAction(slug, {
      customerName: name,
      customerPhone: phone,
      deliveryMethod: method,
      customerAddress: method === 'MERCHANT_DELIVERY' ? address : undefined,
      notes: notes || undefined,
      items: cart.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        modifiers: i.selectedModifiers,
      })),
    });
    setLoading(false);
    if (result.success) {
      localStorage.removeItem(`cart-${slug}`);
      router.push(`/store/${slug}/order/${result.data.orderId}`);
    } else {
      setError(result.error ?? 'حدث خطأ');
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-stone-50">
      <style>{`:root{--sp:${primary}}`}</style>
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-stone-500 hover:text-stone-700">
            <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="font-bold text-stone-900">إتمام الطلب</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <h2 className="font-bold text-stone-900">ملخص الطلب</h2>
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <div>
                <span className="font-medium text-stone-800">{item.name}</span>
                {item.selectedModifiers.length > 0 && <span className="text-stone-400 text-xs block">{item.selectedModifiers.map(m => m.optionName).join('، ')}</span>}
              </div>
              <span className="text-stone-600 whitespace-nowrap">{item.quantity} × {item.totalPrice.toLocaleString()} SDG</span>
            </div>
          ))}
          <div className="border-t border-stone-100 pt-3 flex justify-between font-bold">
            <span>الإجمالي</span>
            <span style={{ color: primary }}>{subtotal.toLocaleString()} SDG</span>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <h2 className="font-bold text-stone-900">بياناتك</h2>
          <div>
            <label className="text-sm text-stone-600 mb-1 block">الاسم</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="اسمك الكامل" className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[var(--sp)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sp)_15%,transparent)]" />
          </div>
          <div>
            <label className="text-sm text-stone-600 mb-1 block">رقم الهاتف</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} required type="tel" placeholder="+249 912 000 000" className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[var(--sp)]" />
          </div>
        </div>

        {/* Delivery Method */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <h2 className="font-bold text-stone-900">طريقة الاستلام</h2>
          <div className="grid grid-cols-2 gap-3">
            {settings?.pickupEnabled !== false && (
              <button type="button" onClick={() => setMethod('PICKUP')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all ${method === 'PICKUP' ? 'border-[var(--sp)] bg-[color-mix(in_srgb,var(--sp)_8%,white)]' : 'border-stone-100 text-stone-500 hover:border-stone-200'}`} style={method === 'PICKUP' ? { color: primary } : {}}>
                <span className="text-2xl">🏪</span> استلام من الفرع
              </button>
            )}
            {settings?.deliveryEnabled !== false && (
              <button type="button" onClick={() => setMethod('MERCHANT_DELIVERY')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all ${method === 'MERCHANT_DELIVERY' ? 'border-[var(--sp)] bg-[color-mix(in_srgb,var(--sp)_8%,white)]' : 'border-stone-100 text-stone-500 hover:border-stone-200'}`} style={method === 'MERCHANT_DELIVERY' ? { color: primary } : {}}>
                <span className="text-2xl">🚚</span> توصيل للمنزل
              </button>
            )}
          </div>
          {method === 'MERCHANT_DELIVERY' && (
            <input value={address} onChange={e => setAddress(e.target.value)} required placeholder="العنوان التفصيلي" className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[var(--sp)]" />
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <label className="font-bold text-stone-900 block mb-2">ملاحظات للمطعم (اختياري)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="أي طلبات خاصة..." className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none resize-none" />
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <h2 className="font-bold text-stone-900 mb-3">طريقة الدفع</h2>
          <div className="flex items-center gap-3 border border-stone-200 rounded-xl p-3">
            <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: primary }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: primary }} />
            </div>
            <span className="text-sm text-stone-700">💵 الدفع عند الاستلام</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl py-2.5">{error}</p>}

        <button type="submit" disabled={loading || cart.length === 0} className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50 transition-all active:scale-95 shadow-lg" style={{ background: primary }}>
          {loading ? 'جاري إرسال الطلب...' : `تأكيد الطلب — ${subtotal.toLocaleString()} SDG`}
        </button>
      </form>
    </div>
  );
}
