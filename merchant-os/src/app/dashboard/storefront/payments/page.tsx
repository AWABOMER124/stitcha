import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import {
  createMerchantPaymentAccountAction,
  toggleMerchantPaymentAccountAction,
} from '@/modules/store-payments/actions';
import { listMerchantPaymentAccounts } from '@/modules/store-payments/store-payments.service';

export const dynamic = 'force-dynamic';

export default async function StorePaymentSettingsPage() {
  const session = await auth();
  const merchantId = session?.user?.merchantId;
  if (!merchantId) redirect('/login');
  const accounts = await listMerchantPaymentAccounts(merchantId);

  return <div className="max-w-4xl space-y-6 p-6">
    <header><h1 className="text-2xl font-bold">طرق دفع المتجر</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">أضف حسابات بنكك أو ماي كاشي التي تظهر لعملائك عند إتمام الطلب.</p></header>
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="font-bold">إضافة حساب تحويل</h2>
      <form action={createMerchantPaymentAccountAction} className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm">القناة<select name="channel" required className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"><option value="BANKAK">بنكك</option><option value="MYCASHY">ماي كاشي</option><option value="OTHER">أخرى</option></select></label>
        <label className="text-sm">اسم العرض<input name="label" required minLength={2} maxLength={80} placeholder="بنكك" className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"/></label>
        <label className="text-sm">اسم صاحب الحساب<input name="accountName" required minLength={2} maxLength={120} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"/></label>
        <label className="text-sm">رقم الحساب<input name="accountNumber" required minLength={3} maxLength={100} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"/></label>
        <label className="text-sm">تعليمات للعميل<input name="instructions" maxLength={500} placeholder="حوّل قيمة الطلب كاملة ثم ارفع الإشعار" className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"/></label>
        <label className="text-sm">الترتيب<input name="sortOrder" type="number" min="0" max="999" defaultValue="0" className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"/></label>
        <button className="rounded-lg bg-[var(--primary)] px-4 py-2.5 font-bold text-white md:col-span-2">حفظ طريقة الدفع</button>
      </form>
    </section>
    <section className="grid gap-3 md:grid-cols-2">
      {accounts.map(account => <article key={account.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"><div><strong>{account.label}</strong><p className="text-sm text-[var(--muted-foreground)]">{account.accountName}</p><p className="font-mono text-sm">{account.accountNumber}</p></div><form action={toggleMerchantPaymentAccountAction}><input type="hidden" name="id" value={account.id}/><input type="hidden" name="isActive" value={account.isActive ? 'false' : 'true'}/><button className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">{account.isActive ? 'إيقاف' : 'تفعيل'}</button></form></article>)}
      {accounts.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-center text-[var(--muted-foreground)] md:col-span-2">الدفع النقدي هو المتاح حالياً. أضف حساباً لتفعيل التحويل.</p>}
    </section>
  </div>;
}
