'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createOrderAction } from '@/modules/orders/actions';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

type Product = { id: string; name: string; price: number; sku?: string | null };
type Branch = { id: string; name: string; isMain: boolean };

export function ManualOrderClient({ products, branches }: { products: Product[]; branches: Branch[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'PICKUP' | 'MERCHANT_DELIVERY'>('PICKUP');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'ONLINE' | 'WALLET'>('CASH');
  const [branchId, setBranchId] = useState(branches.find((branch) => branch.isMain)?.id ?? branches[0]?.id ?? '');
  const filtered = useMemo(() => products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()) || product.sku?.toLowerCase().includes(query.toLowerCase())).slice(0, 30), [products, query]);
  const lines = useMemo(() => products.filter((product) => cart[product.id]).map((product) => ({ ...product, quantity: cart[product.id] })), [products, cart]);
  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

  function changeQuantity(id: string, next: number) {
    setCart((current) => { const copy = { ...current }; if (next <= 0) delete copy[id]; else copy[id] = Math.min(next, 999); return copy; });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!lines.length) return toast.error('أضف منتجاً واحداً على الأقل');
    const ok = await confirm({ title: 'تأكيد إنشاء الطلب', message: `سيُنشأ طلب بقيمة ${total.toLocaleString('en-US')} SDG للعميل ${customerName || 'المحدد'}. يمكنك تعديله لاحقاً من صفحة الطلب.`, confirmLabel: 'إنشاء الطلب' });
    if (!ok) return;
    startTransition(async () => {
      const result = await createOrderAction({ customerName, customerPhone, customerAddress: address || undefined, notes: notes || undefined, branchId: branchId || undefined, deliveryMethod, paymentMethod, items: lines.map((line) => ({ productId: line.id, quantity: line.quantity })) });
      if (!result.success) return toast.error(result.error || 'تعذر إنشاء الطلب');
      if (!result.data) return toast.error('تعذر إنشاء الطلب');
      toast.success('تم إنشاء الطلب بنجاح');
      router.push(`/dashboard/orders/${result.data.id}`);
      router.refresh();
    });
  }

  if (!products.length) return <div className="rounded-2xl border border-dashed p-10 text-center"><p className="font-bold">لا توجد منتجات نشطة لإضافتها إلى طلب.</p><a href="/dashboard/products/new" className="mt-3 inline-block text-sm font-bold text-[var(--primary)] underline">أضف منتجاً أولاً</a></div>;
  return <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]" dir="rtl"><section className="space-y-4 rounded-2xl border bg-[var(--card)] p-5"><div><label className="text-sm font-bold">ابحث وأضف المنتجات</label><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اسم المنتج أو SKU" className="mt-2 w-full rounded-xl border bg-transparent p-3" /></div><div className="max-h-[460px] space-y-2 overflow-y-auto">{filtered.map((product) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><p className="font-bold">{product.name}</p><p className="text-xs text-[var(--muted-foreground)]">{product.price.toLocaleString('en-US')} SDG {product.sku ? `· ${product.sku}` : ''}</p></div>{cart[product.id] ? <div className="flex items-center gap-2"><button type="button" onClick={() => changeQuantity(product.id, cart[product.id] - 1)} className="h-8 w-8 rounded-lg border">−</button><span className="min-w-5 text-center font-bold">{cart[product.id]}</span><button type="button" onClick={() => changeQuantity(product.id, cart[product.id] + 1)} className="h-8 w-8 rounded-lg border">+</button></div> : <button type="button" onClick={() => changeQuantity(product.id, 1)} className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-bold text-white">إضافة</button>}</div>)}</div></section><aside className="space-y-4 rounded-2xl border bg-[var(--card)] p-5"><h2 className="text-lg font-black">بيانات الطلب</h2><label className="block text-sm font-bold">اسم العميل<input required minLength={2} maxLength={120} value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-1 w-full rounded-xl border bg-transparent p-3 font-normal" /></label><label className="block text-sm font-bold">رقم الهاتف<input required minLength={7} maxLength={32} value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} inputMode="tel" className="mt-1 w-full rounded-xl border bg-transparent p-3 font-normal" dir="ltr" /></label><label className="block text-sm font-bold">طريقة الاستلام<select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value as 'PICKUP' | 'MERCHANT_DELIVERY')} className="mt-1 w-full rounded-xl border bg-transparent p-3 font-normal"><option value="PICKUP">استلام من الفرع</option><option value="MERCHANT_DELIVERY">توصيل المتجر</option></select></label>{deliveryMethod !== 'PICKUP' && <label className="block text-sm font-bold">عنوان التوصيل<textarea required maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1 w-full rounded-xl border bg-transparent p-3 font-normal" rows={2}/></label>}<label className="block text-sm font-bold">طريقة الدفع<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as 'CASH' | 'CARD' | 'ONLINE' | 'WALLET')} className="mt-1 w-full rounded-xl border bg-transparent p-3 font-normal"><option value="CASH">نقدي</option><option value="WALLET">محفظة/تحويل</option><option value="CARD">بطاقة</option><option value="ONLINE">دفع إلكتروني</option></select></label>{branches.length > 0 && <label className="block text-sm font-bold">الفرع<select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="mt-1 w-full rounded-xl border bg-transparent p-3 font-normal">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.isMain ? ' — رئيسي' : ''}</option>)}</select></label>}<label className="block text-sm font-bold">ملاحظات (اختياري)<textarea maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-xl border bg-transparent p-3 font-normal" rows={2}/></label><div className="rounded-xl bg-[var(--muted)] p-4"><div className="flex justify-between text-sm"><span>عدد المنتجات</span><b>{lines.reduce((sum, line) => sum + line.quantity, 0)}</b></div><div className="mt-2 flex justify-between text-lg font-black"><span>الإجمالي</span><span>{total.toLocaleString('en-US')} SDG</span></div></div><button disabled={pending || !lines.length} className="w-full rounded-xl bg-[#07111f] px-4 py-3 font-bold text-white disabled:opacity-50">{pending ? 'جارٍ إنشاء الطلب...' : 'مراجعة وإنشاء الطلب'}</button></aside></form>;
}
