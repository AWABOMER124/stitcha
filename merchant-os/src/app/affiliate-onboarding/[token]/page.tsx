import { notFound } from 'next/navigation';
import { getStoreAffiliateOnboarding } from '@/modules/identity-verification/identity-verification.service';
import { submitStoreAffiliateOnboardingAction } from '@/modules/identity-verification/actions';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function AffiliateOnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const affiliate = await getStoreAffiliateOnboarding(token);
  if (!affiliate) notFound();
  const submit = submitStoreAffiliateOnboardingAction.bind(null, token);
  const locked = affiliate.verification?.status === 'PENDING' || affiliate.verification?.status === 'APPROVED';
  return <main className="min-h-screen bg-slate-50 px-4 py-12" dir="rtl"><div className="mx-auto max-w-3xl space-y-6">
    <header className="rounded-3xl border bg-white p-7"><p className="font-bold text-emerald-700">وصلة · إعداد حساب المسوّق</p><h1 className="mt-2 text-2xl font-black">مرحباً {affiliate.name}</h1><p className="mt-2 text-sm leading-7 text-slate-600">أرسل بياناتك لاستلام عمولات متجر {affiliate.merchantName}. الرابط خاص بك وينتهي تلقائياً؛ لا تشاركه مع أي شخص.</p></header>
    {affiliate.verification && <section className="rounded-2xl border bg-white p-6"><h2 className="font-black">حالة التحقق</h2><p className="mt-2 text-sm">{affiliate.verification.status === 'APPROVED' ? '✓ هويتك مؤكدة' : affiliate.verification.status === 'PENDING' ? 'الطلب قيد مراجعة وصلة' : `تحتاج إعادة الإرسال: ${affiliate.verification.rejectionReason ?? 'راجع البيانات'}`}</p></section>}
    {affiliate.payout && <p className="rounded-2xl border bg-white p-5 text-sm">بيانات السداد المحفوظة: {affiliate.payout.accountName} · {affiliate.payout.accountNumber}{affiliate.payout.iban ? ` · ${affiliate.payout.iban}` : ''}</p>}
    {!locked && <form action={submit} className="grid gap-5 rounded-3xl border bg-white p-7 md:grid-cols-2">
      <h2 className="text-lg font-black md:col-span-2">الهوية وبيانات السداد</h2>
      <label className="text-sm">الاسم القانوني<input name="legalName" required minLength={3} maxLength={160} className="mt-1 w-full rounded-xl border p-3"/></label>
      <label className="text-sm">نوع الوثيقة<select name="documentType" className="mt-1 w-full rounded-xl border p-3"><option value="NATIONAL_ID">بطاقة هوية سارية</option><option value="PASSPORT">جواز سفر ساري</option></select></label>
      <label className="text-sm">رقم الوثيقة<input name="documentNumber" required minLength={5} maxLength={40} dir="ltr" className="mt-1 w-full rounded-xl border p-3"/></label>
      <label className="text-sm">تاريخ الانتهاء<input name="expiresAt" required type="date" className="mt-1 w-full rounded-xl border p-3"/></label>
      <label className="text-sm">صورة الوجه الأمامي<input name="front" required type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 block w-full rounded-xl border p-3"/></label>
      <label className="text-sm">الوجه الخلفي — اختياري<input name="back" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 block w-full rounded-xl border p-3"/></label>
      <label className="text-sm">طريقة السداد<select name="method" className="mt-1 w-full rounded-xl border p-3"><option value="BANK_ACCOUNT">حساب بنكي</option><option value="BANKAK">بنكك</option><option value="MYCASHY">ماي كاشي</option><option value="OTHER">أخرى</option></select></label>
      <label className="text-sm">اسم البنك أو المحفظة<input name="bankName" maxLength={120} className="mt-1 w-full rounded-xl border p-3"/></label>
      <label className="text-sm">اسم الحساب<input name="accountName" required minLength={3} maxLength={160} className="mt-1 w-full rounded-xl border p-3"/></label>
      <label className="text-sm">رقم الحساب<input name="accountNumber" required minLength={5} maxLength={40} dir="ltr" className="mt-1 w-full rounded-xl border p-3"/></label>
      <label className="text-sm md:col-span-2">IBAN — اختياري<input name="iban" maxLength={34} dir="ltr" className="mt-1 w-full rounded-xl border p-3 uppercase"/></label>
      <p className="text-xs leading-6 text-slate-500 md:col-span-2">بإرسال البيانات تؤكد صحتها وتوافق على استخدامها للتحقق من الهوية وتنفيذ العمولات وفق سياسة الخصوصية.</p>
      <button className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white md:col-span-2">إرسال آمن للمراجعة</button>
    </form>}
  </div></main>;
}
