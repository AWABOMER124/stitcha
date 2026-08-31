'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { securityAction } from '@/app/partner/security/actions';
const input = 'mt-2 w-full rounded-xl border p-3 bg-[var(--card)]';
export function PartnerSecurityForm({ email, phone, channels }: { email: string; phone: string | null; channels: { email: boolean; whatsapp: boolean } }) {
  const [verification, verify, sending] = useActionState(securityAction, {});
  const [password, changePassword, changing] = useActionState(securityAction, {});
  return <div className="grid gap-6 lg:grid-cols-2">
    <form action={verify} className="space-y-4 rounded-2xl border bg-[var(--card)] p-6">
      <h2 className="text-lg font-bold">تأكيد الحساب</h2>
      <p className="text-sm leading-7">الدخول بالبريد أو الهاتف وكلمة المرور. أكّد ملكية وسيلة اتصال واحدة لتفعيل خطوات الشراكة؛ هذا ليس دخولاً بدون كلمة مرور.</p>
      <p className="text-sm break-all" dir="ltr">{email} · {phone ?? '—'}</p>
      <label className="block text-sm font-semibold">قناة التحقق<select name="channel" className={input} defaultValue={channels.email ? 'EMAIL' : 'WHATSAPP'}>
        <option value="EMAIL" disabled={!channels.email}>البريد الإلكتروني{!channels.email ? ' — غير مهيأ' : ''}</option>
        <option value="WHATSAPP" disabled={!channels.whatsapp || !phone}>واتساب{!channels.whatsapp ? ' — غير مهيأ' : ''}</option>
      </select></label>
      <button name="intent" value="send" disabled={sending || (!channels.email && !channels.whatsapp)} className="rounded-xl border px-4 py-3 disabled:opacity-50">إرسال / إعادة إرسال رمز</button>
      <label className="block text-sm font-semibold">رمز التحقق<input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={input} /></label>
      <button name="intent" value="verify" disabled={sending} className="rounded-xl bg-[var(--primary)] px-5 py-3 text-white disabled:opacity-50">{sending ? 'جارٍ المعالجة…' : 'تأكيد الحساب'}</button>
      <p role="status" className={verification.error ? 'text-red-700' : 'text-emerald-700'}>{verification.error ?? verification.message}</p>
    </form>
    <form action={changePassword} className="space-y-4 rounded-2xl border bg-[var(--card)] p-6">
      <h2 className="text-lg font-bold">تغيير كلمة المرور</h2>
      <p className="text-sm leading-7">8 أحرف على الأقل وبحد أقصى 72 بايت؛ الأحرف العربية تستهلك أكثر من بايت. سيتم إبطال جلسات بوابة الشريك السابقة بعد التغيير.</p>
      <input type="hidden" name="intent" value="password" />
      {[['currentPassword','كلمة المرور الحالية'],['newPassword','كلمة المرور الجديدة'],['confirmation','تأكيد كلمة المرور الجديدة']].map(([name,label]) => <label key={name} className="block text-sm font-semibold">{label}<input type="password" name={name} required minLength={8} maxLength={name === 'currentPassword' ? 128 : 72} autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'} className={input} /></label>)}
      <button disabled={changing || password.signedOut} className="rounded-xl bg-[var(--primary)] px-5 py-3 text-white disabled:opacity-50">{changing ? 'جارٍ الحفظ…' : 'تغيير كلمة المرور'}</button>
      <p role="status" className={password.error ? 'text-red-700' : 'text-emerald-700'}>{password.error ?? password.message}</p>
      <Link className="block underline" href={password.signedOut ? '/login' : '/forgot-password'}>{password.signedOut ? 'تسجيل الدخول مجدداً' : 'نسيت كلمة المرور الحالية؟'}</Link>
    </form>
  </div>;
}
