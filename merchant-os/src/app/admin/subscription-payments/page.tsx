import {
  createPaymentAccountAction,
  reviewSubscriptionPaymentFormAction,
  togglePaymentAccountAction,
} from '@/modules/subscription-payments/actions';
import {
  listAllPaymentAccounts,
  listPaymentsForReview,
} from '@/modules/subscription-payments/subscription-payments.service';

export const dynamic = 'force-dynamic';

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-900',
  VERIFIED: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-red-100 text-red-900',
  CANCELLED: 'bg-slate-100 text-slate-700',
};

export default async function SubscriptionPaymentsAdminPage() {
  const [accounts, payments] = await Promise.all([listAllPaymentAccounts(), listPaymentsForReview()]);

  return <div className="space-y-8">
    <header>
      <h1 className="text-2xl font-bold">مدفوعات اشتراكات وصلة</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">إدارة حسابات بنكك وماي كاشي، ومراجعة الإشعارات قبل تفعيل الباقة.</p>
    </header>

    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="font-bold">إضافة حساب تحصيل</h2>
      <form action={createPaymentAccountAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm">القناة<select name="channel" required className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"><option value="BANKAK">بنكك</option><option value="MYCASHY">ماي كاشي</option><option value="OTHER">أخرى</option></select></label>
        <label className="text-sm">اسم العرض<input name="label" required minLength={2} maxLength={80} placeholder="بنكك — وصلة" className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"/></label>
        <label className="text-sm">اسم صاحب الحساب<input name="accountName" required minLength={2} maxLength={120} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"/></label>
        <label className="text-sm">رقم الحساب<input name="accountNumber" required minLength={3} maxLength={100} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"/></label>
        <label className="text-sm">الاشتراك الشهري<input name="monthlyAmount" required type="number" min="1" step="0.01" className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"/></label>
        <label className="text-sm">العملة<input name="currency" required defaultValue="SDG" minLength={3} maxLength={6} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 uppercase"/></label>
        <label className="text-sm">الترتيب<input name="sortOrder" type="number" min="0" max="999" defaultValue="0" className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"/></label>
        <label className="text-sm md:col-span-2 xl:col-span-1">تعليمات التحويل<input name="instructions" maxLength={500} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"/></label>
        <button className="rounded-lg bg-[var(--primary)] px-4 py-2.5 font-semibold text-white md:col-span-2 xl:col-span-4">حفظ حساب التحصيل</button>
      </form>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {accounts.map(account => <article key={account.id} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] p-4">
          <div><strong>{account.label}</strong><p className="text-sm text-[var(--muted-foreground)]">{account.accountName} · {account.accountNumber}</p><p className="text-sm font-semibold">{account.monthlyAmount.toLocaleString()} {account.currency}</p></div>
          <form action={togglePaymentAccountAction}><input type="hidden" name="id" value={account.id}/><input type="hidden" name="isActive" value={account.isActive ? 'false' : 'true'}/><button className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">{account.isActive ? 'إيقاف' : 'تفعيل'}</button></form>
        </article>)}
        {accounts.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-[var(--muted-foreground)] lg:col-span-2">لم تتم إضافة حسابات تحصيل بعد.</p>}
      </div>
    </section>

    <section className="space-y-3">
      <h2 className="font-bold">طلبات التحقق</h2>
      {payments.map(payment => <article key={payment.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{payment.merchant.name}</h3><p className="text-sm text-[var(--muted-foreground)]">{payment.targetPlan.name} · {payment.paymentAccount.label}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[payment.status] ?? statusStyles.CANCELLED}`}>{payment.status}</span></div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-[var(--muted-foreground)]">المبلغ</dt><dd className="font-bold">{payment.amount.toLocaleString()} {payment.currency}</dd></div><div><dt className="text-[var(--muted-foreground)]">رقم العملية</dt><dd className="font-mono">{payment.transactionRef}</dd></div><div><dt className="text-[var(--muted-foreground)]">المحوّل</dt><dd>{payment.senderName ?? '—'}</dd></div><div><dt className="text-[var(--muted-foreground)]">التاريخ</dt><dd>{payment.transferredAt?.toLocaleString('ar-SD') ?? payment.createdAt.toLocaleString('ar-SD')}</dd></div></dl>
        <div className="mt-4 flex flex-wrap gap-2"><a href={`/api/subscriptions/manual-payment/${payment.id}/proof`} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold">عرض الإشعار الخاص</a></div>
        {payment.status === 'PENDING' && <div className="mt-4 grid gap-3 lg:grid-cols-2"><form action={reviewSubscriptionPaymentFormAction}><input type="hidden" name="paymentId" value={payment.id}/><input type="hidden" name="decision" value="VERIFY"/><button className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-bold text-white">مطابقة وتفعيل الباقة</button></form><form action={reviewSubscriptionPaymentFormAction} className="flex gap-2"><input type="hidden" name="paymentId" value={payment.id}/><input type="hidden" name="decision" value="REJECT"/><input name="reason" required maxLength={500} placeholder="سبب الرفض" className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"/><button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">رفض</button></form></div>}
        {payment.rejectionReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">سبب الرفض: {payment.rejectionReason}</p>}
      </article>)}
      {payments.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-center text-[var(--muted-foreground)]">لا توجد تحويلات مرسلة للمراجعة.</p>}
    </section>
  </div>;
}
