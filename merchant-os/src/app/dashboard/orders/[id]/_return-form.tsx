'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DeliveryAddressFields } from '@/components/orders/delivery-address-fields';
import { createMerchantReturnAction } from '@/modules/delivery-partners/actions';
export function ReturnForm({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition(), [error, setError] = useState(''); const router = useRouter();
  return <details className="rounded-2xl border p-5"><summary className="cursor-pointer font-bold">إنشاء رجيع لطلب تم تسليمه</summary><p className="my-3 text-sm">استرجاع كامل الأصناف من عنوان العميل المسجل إلى العنوان أدناه. لا يتضمن رد المبلغ تلقائيًا؛ رسوم النقل تحددها شركة الشحن.</p><form data-action-guard="off" className="space-y-3" onSubmit={event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); if (!window.confirm('تأكيد طلب استرجاع كامل الأصناف من العميل؟')) return; start(async () => { const result = await createMerchantReturnAction(orderId, data); if (!result.success) setError(result.error || 'تعذر الإنشاء'); else router.refresh(); }); }}>
  <h3 className="font-bold">عنوان المتجر لاستلام الرجيع</h3>
  <label className="block">اسم المستلم<input name="customerName" required minLength={2} maxLength={120} className="block w-full rounded-xl border p-3" /></label>
  <label className="block">الهاتف<input name="customerPhone" required minLength={7} maxLength={32} type="tel" className="block w-full rounded-xl border p-3" /></label>
  <DeliveryAddressFields />
  <label className="block">العنوان التفصيلي<textarea name="customerAddress" required minLength={2} maxLength={500} className="block w-full rounded-xl border p-3" /></label>
  <label className="block">سبب الاسترجاع<textarea name="reason" required minLength={3} maxLength={500} className="block w-full rounded-xl border p-3" /></label>
  {error && <p role="alert" className="text-red-700">{error}</p>}
  <button disabled={pending} className="rounded-xl bg-teal-700 px-5 py-3 font-bold text-white disabled:opacity-50">{pending ? 'جارٍ الإنشاء…' : 'إنشاء طلب الرجيع'}</button></form></details>;
}
