import { getAuthContext, requirePermission } from '@/lib/permissions';
import { getPublicOrigin } from '@/lib/public-origin';
import { getMerchantReferralDashboard } from '@/modules/merchant-referrals/merchant-referrals.service';

export const dynamic = 'force-dynamic';

const statuses: Record<string, string> = {
  REGISTERED: 'سجّل المتجر', ACTIVATED: 'فعّل المتجر', QUALIFIED: 'استوفى الشرط', REJECTED: 'غير مؤهل',
  PENDING: 'معلّقة', APPROVED: 'معتمدة', FULFILLED: 'تم تنفيذها', REVERSED: 'معكوسة',
};
const rewardNames: Record<string, string> = { PRO_DAYS: 'أيام Pro', AI_CREDITS: 'رصيد AI', ACCOUNT_CREDIT: 'رصيد حساب', CASH: 'مكافأة نقدية' };

export default async function MerchantReferralsPage() {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:read');
  const { program, code, referrals, rewards } = await getMerchantReferralDashboard(auth.merchantId);
  const link = `${await getPublicOrigin()}/register?ref=${encodeURIComponent(code.code)}`;
  const total = referrals.length;
  const qualified = referrals.filter(item => item.status === 'QUALIFIED').length;
  const fulfilled = rewards.find(item => item.status === 'FULFILLED');
  return <div className="mx-auto max-w-6xl space-y-6" dir="rtl">
    <header><p className="font-bold text-[var(--primary)]">نمو متجرِك مع وصلة</p><h1 className="mt-2 text-2xl font-black">إحالة متاجر جديدة</h1><p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">شارك رابطك مع أصحاب الأعمال. التسجيل وحده لا يولد مكافأة؛ يجب أن يستوفي المتجر شرط البرنامج وتراجعه وصلة.</p></header>
    {!program?.isActive && <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">البرنامج غير مفتوح حالياً. رابطك محفوظ ويمكن نسخه، لكن الإحالات الجديدة لن تُسجل حتى تعلن وصلة تفعيل البرنامج وشروطه.</p>}
    <section className="grid gap-4 md:grid-cols-3">
      {[['الإحالات المسجلة', total], ['المتاجر المؤهلة', qualified], ['المكافآت المنفذة', fulfilled?._count._all ?? 0]].map(([label,value]) => <div key={String(label)} className="rounded-2xl border bg-[var(--card)] p-5"><p className="text-sm text-[var(--muted-foreground)]">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}
    </section>
    <section className="rounded-2xl border bg-[var(--card)] p-6"><h2 className="font-black">رابط الإحالة الخاص بمتجرك</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">الرمز ثابت ولا يحتوي معرّف متجرك. لا تنشئ حسابات لنفسك أو لأشخاص سبق إحالتهم.</p><code dir="ltr" className="mt-4 block break-all rounded-xl bg-[var(--muted)] p-4 select-all">{link}</code><p dir="ltr" className="mt-3 font-mono text-sm">{code.code}</p></section>
    {program && <section className="rounded-2xl border bg-[var(--card)] p-6"><h2 className="font-black">شروط البرنامج الحالية</h2><dl className="mt-4 grid gap-4 text-sm md:grid-cols-3"><div><dt className="text-[var(--muted-foreground)]">شرط التأهل</dt><dd className="font-bold">{program.qualificationRule === 'FIRST_PAID_PRO' ? 'أول اشتراك Pro مدفوع ومطابق' : 'أول طلب حقيقي مُسلّم'}</dd></div><div><dt className="text-[var(--muted-foreground)]">المكافأة</dt><dd className="font-bold">{program.rewardValue.toString()} {rewardNames[program.rewardType]} {program.currency ?? ''}</dd></div><div><dt className="text-[var(--muted-foreground)]">التعليق</dt><dd className="font-bold">{program.holdDays} يوم</dd></div></dl>{program.terms && <p className="mt-4 whitespace-pre-wrap text-sm leading-7">{program.terms}</p>}</section>}
    <section><h2 className="mb-3 font-black">سجل الإحالات</h2><div className="overflow-x-auto rounded-2xl border bg-[var(--card)]"><table className="w-full min-w-[720px] text-sm"><thead className="bg-[var(--muted)]"><tr>{['المتجر','التسجيل','حالة الإحالة','المكافأة','الحالة المالية'].map(label => <th key={label} className="p-3 text-right">{label}</th>)}</tr></thead><tbody>{referrals.map(item => <tr key={item.id} className="border-t"><td className="p-3 font-bold">{item.status === 'REJECTED' ? 'إحالة غير مؤهلة' : item.referredMerchant.name}</td><td className="p-3">{item.registeredAt.toLocaleDateString('ar-SD')}</td><td className="p-3">{statuses[item.status]}</td><td className="p-3">{item.reward ? `${item.reward.value.toString()} ${rewardNames[item.reward.type]}` : '—'}</td><td className="p-3">{item.reward ? statuses[item.reward.status] : 'لم تستحق بعد'}</td></tr>)}{referrals.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-[var(--muted-foreground)]">لا توجد إحالات حتى الآن.</td></tr>}</tbody></table></div></section>
  </div>;
}
