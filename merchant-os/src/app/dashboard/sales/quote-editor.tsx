'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';
import { saveQuoteAction } from '@/modules/assisted-sales/actions';
import type { SavedQuote } from '@/modules/assisted-sales/policy';
import { inputClass, buttonClass, type SalesQuoteRow, type SalesWorkspaceProps } from './types';

export function QuoteEditor({ context, quote, onClose, onSaved }: { context: SalesWorkspaceProps; quote?: SalesQuoteRow; onClose: () => void; onSaved: (result: SavedQuote) => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const container = formRef.current?.closest('main');
    const previousPadding = container?.style.scrollPaddingBottom;
    if (container) container.style.scrollPaddingBottom = '180px';
    formRef.current?.scrollIntoView({ block: 'start' });
    return () => { if (container) container.style.scrollPaddingBottom = previousPadding ?? ''; };
  }, []);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [items, setItems] = useState(quote?.items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })) ?? []);
  const [method, setMethod] = useState(quote?.deliveryMethod ?? 'MERCHANT_DELIVERY');
  const [fee, setFee] = useState(quote?.deliveryFee ?? context.settings.defaultDeliveryFee);
  const [productSearch, setProductSearch] = useState('');
  const availableProducts = context.products.filter(p => !items.some(i => i.productId === p.id) && `${p.name} ${p.sku ?? ''}`.toLowerCase().includes(productSearch.toLowerCase()));
  const subtotal = items.reduce((sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity, 0) / 100;
  const needsApproval = items.some(i => {
    const product = context.products.find(p => p.id === i.productId);
    return product && product.price > 0 && i.unitPrice * 100 < product.price * (100 - context.discountLimit) - 0.000001;
  });
  const money = (v: number) => new Intl.NumberFormat('ar-SA', { style: 'currency', currency: context.currency }).format(v);
  function submit(form: FormData) {
    setError('');
    startTransition(async () => {
      const result = await saveQuoteAction({ customerName: form.get('name'), customerPhone: form.get('phone'), items,
        deliveryFee: method === 'PICKUP' ? 0 : fee, expiryHours: Number(form.get('expiry')), paymentMethod: form.get('payment'), deliveryMethod: method, notes: form.get('notes') }, quote?.id, quote?.version);
      if (!result.success) setError(result.error);
      else { router.refresh(); onSaved(result.data); }
    });
  }
  return <form ref={formRef} action={submit} onFocusCapture={event => {
    const field = event.target;
    if (field instanceof HTMLElement && field.matches('input, select, textarea')) {
      requestAnimationFrame(() => { if (field.isConnected) field.scrollIntoView({ block: 'center', inline: 'nearest' }); });
    }
  }} className="scroll-mt-3 space-y-6 rounded-2xl border bg-[var(--card)] p-4 sm:p-6 [&_input]:scroll-mb-40 [&_select]:scroll-mb-40 [&_textarea]:scroll-mb-40">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">{quote ? 'تعديل العرض' : 'عرض جديد'}</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">العميل ← المنتجات والسعر ← مشاركة الرابط</p></div><button type="button" disabled={pending} onClick={onClose} className="min-h-12 shrink-0 rounded-xl border px-4 py-2 text-sm">رجوع</button></div>
    {quote && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">حفظ التعديل يلغي الرابط السابق ويعيد تقييم صلاحية الخصم. أرسل الرابط الجديد للعميل.</p>}
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">اسم العميل<input className={inputClass} name="name" required minLength={2} maxLength={120} defaultValue={quote?.customerName} autoComplete="name" /></label>
      <label className="text-sm font-bold">رقم واتساب مع رمز الدولة<input className={inputClass} name="phone" type="tel" required pattern="\+?[0-9]{9,15}" defaultValue={quote?.customerPhone} placeholder="+9665XXXXXXXX" dir="ltr" autoComplete="tel" /></label></div>
    <div><h3 className="mb-3 font-bold">المنتجات والأسعار المتفق عليها</h3>
      <label className="text-sm">ابحث بالاسم أو رمز المنتج<input className={inputClass} value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="ابحث عن منتج لإضافته" /></label>
      <div aria-label="إضافة منتج" className="mt-3 grid gap-2 sm:grid-cols-2">{availableProducts.slice(0, 6).map(product => <button key={product.id} type="button" aria-label={`إضافة ${product.name}`} className="flex min-h-14 min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-3 text-start hover:border-[#087d82] focus-visible:outline-2 focus-visible:outline-[#087d82]" onClick={() => setItems(current => [...current, { productId: product.id, quantity: 1, unitPrice: product.price }])}><span className="min-w-0"><span className="block break-words text-sm font-bold">{product.name}</span><span className="mt-1 block text-xs text-[var(--muted-foreground)]">{money(product.price)}</span></span><Plus size={20} className="shrink-0 text-[#087d82]" /></button>)}</div>
      {availableProducts.length > 6 && <p className="mt-2 text-xs text-[var(--muted-foreground)]">تظهر أول 6 منتجات. اكتب اسم المنتج للوصول إليه بسرعة.</p>}
      {!availableProducts.length && <p className="mt-3 text-sm text-[var(--muted-foreground)]">{productSearch ? 'لا توجد منتجات مطابقة. جرّب اسمًا آخر.' : 'تمت إضافة كل المنتجات المتاحة.'}</p>}
      <div className="mt-3 space-y-3">{items.map((item, index) => {
        const product = context.products.find(p => p.id === item.productId);
        return <div key={item.productId} className="grid grid-cols-2 items-end gap-3 rounded-xl border bg-[var(--background)] p-3 sm:grid-cols-[1fr_85px_130px_auto]">
          <div className="col-span-2 flex min-w-0 items-start justify-between gap-2 sm:col-span-1"><div className="min-w-0"><p className="break-words text-sm font-bold">{product?.name ?? quote?.items.find(i => i.productId === item.productId)?.name ?? 'منتج غير متاح'}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">سعر المتجر: {money(product?.price ?? 0)}</p></div><button type="button" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-red-600 sm:hidden" aria-label={`حذف ${product?.name ?? 'المنتج'}`} onClick={() => setItems(items.filter((_, n) => n !== index))}><Trash2 size={18} /></button></div>
          <label className="min-w-0 text-xs">الكمية<input className={inputClass} type="number" inputMode="numeric" required min={1} max={10000} value={item.quantity} onChange={e => setItems(items.map((i, n) => n === index ? { ...i, quantity: Number(e.target.value) } : i))} /></label>
          <label className="min-w-0 text-xs">سعر الوحدة النهائي<input className={inputClass} type="number" inputMode="decimal" required min={0} max={999999} step="0.01" value={item.unitPrice} onChange={e => setItems(items.map((i, n) => n === index ? { ...i, unitPrice: Number(e.target.value) } : i))} /></label>
          <button type="button" className="hidden min-h-11 min-w-11 items-center justify-center rounded-lg text-red-600 sm:flex" aria-label={`حذف ${product?.name ?? 'المنتج'}`} onClick={() => setItems(items.filter((_, n) => n !== index))}><Trash2 size={18} /></button>
        </div>;
      })}</div>
      {!items.length && <p className="mt-3 rounded-xl border border-dashed p-5 text-center text-sm text-[var(--muted-foreground)]">أضف أول منتج لتجهيز العرض.</p>}
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm font-bold">طريقة الدفع<select name="payment" className={inputClass} defaultValue={quote?.paymentMethod ?? (context.gatewayReady ? 'ONLINE' : context.settings.allowCod ? 'CASH' : 'ONLINE')}><option value="ONLINE">دفع إلكتروني</option>{context.settings.allowCod && <option value="CASH">عند الاستلام</option>}</select></label>
      <label className="text-sm font-bold">التوصيل<select aria-label="التوصيل" className={inputClass} value={method} onChange={e => setMethod(e.target.value as typeof method)}><option value="MERCHANT_DELIVERY">توصيل للعميل</option>{context.settings.allowPickup && <option value="PICKUP">استلام من المتجر</option>}</select></label>
      <label className="text-sm font-bold">رسوم الشحن<input className={inputClass} type="number" inputMode="decimal" min={0} max={999999} step="0.01" value={method === 'PICKUP' ? 0 : fee} disabled={method === 'PICKUP'} onChange={e => setFee(Number(e.target.value))} required /></label>
    </div>
    <details open={Boolean(quote?.notes)} className="rounded-xl border p-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">خيارات إضافية: المدة وملاحظة العميل</summary>
    <label className="mt-3 block text-sm font-bold">صلاحية العرض بالساعات<input name="expiry" className={inputClass} type="number" inputMode="numeric" min={1} max={720} required defaultValue={context.settings.defaultExpiryHours} /></label>
    <label className="block text-sm font-bold">ملاحظة للعميل<textarea name="notes" className={inputClass} rows={2} maxLength={1000} defaultValue={quote?.notes} /></label>
    </details>
    <p className="text-xs leading-6 text-[var(--muted-foreground)]">أدخل أسعارًا نهائية تشمل أي ضريبة مطبقة. لا تُضاف ضريبة تلقائيًا في هذا المسار. المخزون يُتحقق منه عند إتمام الطلب ولا يُحجز عند إنشاء العرض.</p>
    <div className="sticky bottom-0 z-10 -mx-4 rounded-xl border-t bg-[var(--card)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_16px_-12px_rgba(0,0,0,0.3)] sm:mx-0 sm:border sm:p-4">
      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="mb-3 flex items-center justify-between gap-2"><div className="min-w-0"><p className="text-xs">الإجمالي النهائي للعميل</p><p aria-live="polite" className="mt-1 break-words text-xl font-black">{money(subtotal + (method === 'PICKUP' ? 0 : fee))}</p></div><ShieldCheck size={22} className="shrink-0 text-[#087d82]" /></div>
      {needsApproval && <p className="mb-3 text-xs text-amber-700">الخصم يحتاج موافقة مشرف قبل الإرسال.</p>}
      <button className={`${buttonClass} w-full`} disabled={pending || !items.length || !context.settings.enabled}><Plus size={17} />{pending ? 'جارٍ حفظ العرض…' : needsApproval ? 'إرسال للموافقة' : 'حفظ وتجهيز الرابط'}</button>
    </div>
  </form>;
}
