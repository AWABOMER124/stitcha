import { getAuthContext, requirePermission } from '@/lib/permissions';
import { getMerchantIdentityDashboard } from '@/modules/identity-verification/identity-verification.service';
import { saveMerchantReferralPayoutAction, submitMerchantIdentityAction } from '@/modules/identity-verification/actions';

export const dynamic = 'force-dynamic';

const statuses: Record<string, string> = {
  DRAFT: 'مسودة', PENDING: 'قيد المراجعة', APPROVED: 'موثّق', REJECTED: 'مرفوض', EXPIRED: 'منتهي',
};

export default async function VerificationPage() {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:read');
  const { verification, payout } = await getMerchantIdentityDashboard(auth.merchantId);
  const canEdit = auth.role === 'MERCHANT_OWNER' || auth.permissions.includes('settings:update');
  const canSubmit = canEdit && (!verification || ['DRAFT', 'REJECTED', 'EXPIRED'].includes(verification.status));
  return <div className="mx-auto max-w-5xl space-y-7" dir="rtl">
    <header><p className="font-bold text-[var(--primary)]">الثقة والامتثال</p><h1 className="mt-2 text-2xl font-black">تأكيد هوية المتجر</h1><p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">ارفع بطاقة هوية سارية أو جواز سفر. تحفظ وصلة المستندات في تخزين خاص، ولا تظهر داخل المتجر أو عبر رابط عام.</p></header>
    <section className="rounded-2xl border bg-[var(--card)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">حالة اعرف عميلك KYC</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">{verification ? statuses[verification.status] : 'لم يُرسل طلب بعد'}</p></div>{verification?.status === 'APPROVED' && <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-800">✓ هوية مؤكدة</span>}</div>
      {verification?.rejectionReason && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">سبب الرفض: {verification.rejectionReason}</p>}
      {verification && <dl className="mt-5 grid gap-4 text-sm md:grid-cols-3"><div><dt className="text-[var(--muted-foreground)]">الاسم القانوني</dt><dd className="font-bold">{verification.legalName}</dd></div><div><dt className="text-[var(--muted-foreground)]">نوع الوثيقة</dt><dd className="font-bold">{verification.documentType === 'PASSPORT' ? 'جواز سفر' : 'بطاقة هوية'}</dd></div><div><dt className="text-[var(--muted-foreground)]">تاريخ الانتهاء</dt><dd className="font-bold">{verification.expiresAt.toLocaleDateString('ar-SD')}</dd></div></dl>}
      {verification?.documents.length ? <div className="mt-4 flex flex-wrap gap-2">{verification.documents.map(document => <a key={document.id} href={`/api/identity-documents/${document.id}?kind=MERCHANT`} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-2 text-sm font-bold">عرض {document.side === 'FRONT' ? 'الوجه الأمامي' : 'الوجه الخلفي'}</a>)}</div> : null}
      {canSubmit && <form action={submitMerchantIdentityAction} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm">الاسم القانوني كما في الوثيقة<input name="legalName" required minLength={3} maxLength={160} className="mt-1 w-full rounded-xl border bg-[var(--background)] p-3"/></label>
        <label className="text-sm">نوع الوثيقة<select name="documentType" className="mt-1 w-full rounded-xl border bg-[var(--background)] p-3"><option value="NATIONAL_ID">بطاقة هوية</option><option value="PASSPORT">جواز سفر</option></select></label>
        <label className="text-sm">رقم الوثيقة<input name="documentNumber" required minLength={5} maxLength={40} dir="ltr" className="mt-1 w-full rounded-xl border bg-[var(--background)] p-3"/></label>
        <label className="text-sm">تاريخ انتهاء الوثيقة<input name="expiresAt" required type="date" className="mt-1 w-full rounded-xl border bg-[var(--background)] p-3"/></label>
        <label className="text-sm">الوجه الأمامي أو صفحة بيانات الجواز<input name="front" required type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 block w-full rounded-xl border p-3"/></label>
        <label className="text-sm">الوجه الخلفي — إن وجد<input name="back" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 block w-full rounded-xl border p-3"/></label>
        <button className="rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white md:col-span-2">إرسال للمراجعة</button>
      </form>}
    </section>
    <section className="rounded-2xl border bg-[var(--card)] p-6"><h2 className="font-black">حساب استلام مكافآت إحالة التجار</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">تُحفظ أرقام الحساب وIBAN مشفّرة. لن تُنفذ مكافأة نقدية قبل اعتماد الهوية وإضافة وسيلة سداد.</p>{payout && <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">المحفوظ: {payout.accountName} · {payout.accountNumber}{payout.iban ? ` · IBAN ${payout.iban}` : ''}</p>}{canEdit && <form action={saveMerchantReferralPayoutAction} className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm">طريقة السداد<select name="method" className="mt-1 w-full rounded-xl border bg-[var(--background)] p-3"><option value="BANK_ACCOUNT">حساب بنكي</option><option value="BANKAK">بنكك</option><option value="MYCASHY">ماي كاشي</option><option value="OTHER">أخرى</option></select></label><label className="text-sm">اسم البنك أو المحفظة<input name="bankName" maxLength={120} className="mt-1 w-full rounded-xl border bg-[var(--background)] p-3"/></label><label className="text-sm">اسم الحساب<input name="accountName" required minLength={3} maxLength={160} className="mt-1 w-full rounded-xl border bg-[var(--background)] p-3"/></label><label className="text-sm">رقم الحساب<input name="accountNumber" required minLength={5} maxLength={40} dir="ltr" className="mt-1 w-full rounded-xl border bg-[var(--background)] p-3"/></label><label className="text-sm md:col-span-2">IBAN — اختياري<input name="iban" maxLength={34} dir="ltr" className="mt-1 w-full rounded-xl border bg-[var(--background)] p-3 uppercase"/></label><button className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white md:col-span-2">حفظ بيانات السداد</button></form>}</section>
  </div>;
}
