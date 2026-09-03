import { getAuthContext, requirePermission } from '@/lib/permissions';
import { getPublicOrigin } from '@/lib/public-origin';
import prisma from '@/lib/db/prisma';
import { issueStoreAffiliateOnboardingAction } from '@/modules/identity-verification/actions';

export const dynamic = 'force-dynamic';

export default async function AffiliateOnboardingLinksPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const auth = await getAuthContext();
  requirePermission(auth, 'settings:read');
  const canEdit = auth.role === 'MERCHANT_OWNER' || auth.permissions.includes('settings:update');
  const [affiliates, query, origin] = await Promise.all([
    prisma.storeAffiliate.findMany({ where: { merchantId: auth.merchantId }, include: { identityVerification: { select: { status: true } }, payoutProfile: { select: { id: true } } }, orderBy: { createdAt: 'desc' } }),
    searchParams,
    getPublicOrigin(),
  ]);
  const link = query.token ? `${origin}/affiliate-onboarding/${encodeURIComponent(query.token)}` : null;
  return <div className="mx-auto max-w-5xl space-y-6" dir="rtl"><header><p className="font-bold text-[var(--primary)]">التسويق بالعمولة</p><h1 className="mt-2 text-2xl font-black">توثيق المسوّقين وبيانات السداد</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">أنشئ رابطاً مؤقتاً لمدة 7 أيام. يرفع المسوّق هويته وبيانات حسابه بنفسه عبر صفحة آمنة.</p></header>{link && <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5"><h2 className="font-black text-emerald-950">انسخ الرابط الآن</h2><code dir="ltr" className="mt-3 block break-all rounded-xl bg-white p-4 text-sm select-all">{link}</code><p className="mt-2 text-xs text-emerald-900">لن يظهر الرمز الخام مرة أخرى؛ يمكنك إصدار رابط بديل في أي وقت.</p></section>}<div className="grid gap-4 md:grid-cols-2">{affiliates.map(affiliate => <article key={affiliate.id} className="rounded-2xl border bg-[var(--card)] p-5"><div className="flex justify-between gap-3"><div><h2 className="font-black">{affiliate.name}</h2><p className="text-sm text-[var(--muted-foreground)]">{affiliate.phone}</p></div><span className="text-xs font-bold">{affiliate.identityVerification?.status === 'APPROVED' ? '✓ موثق' : affiliate.identityVerification?.status === 'PENDING' ? 'قيد المراجعة' : 'غير موثق'}</span></div><p className="mt-3 text-xs">بيانات السداد: {affiliate.payoutProfile ? 'مضافة' : 'غير مضافة'}</p>{canEdit && <form action={issueStoreAffiliateOnboardingAction} className="mt-4"><input type="hidden" name="affiliateId" value={affiliate.id}/><button className="w-full rounded-xl border border-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary)]">إصدار رابط إعداد آمن</button></form>}</article>)}</div></div>;
}
