import { AiGeneratorClient } from './_client';
import Link from 'next/link';
import { getAuthContext } from '@/lib/permissions';
import { getMerchantPlanSnapshot } from '@/modules/merchant-subscriptions';

export default async function AiGeneratorPage() {
  const auth = await getAuthContext();
  const plan = await getMerchantPlanSnapshot(auth.merchantId);
  if (plan.entitlements.aiMonthlyCredits === 0) return <div className="mx-auto max-w-2xl rounded-2xl border bg-[var(--card)] p-8 text-center" dir="rtl"><div className="text-4xl">✨</div><h1 className="mt-4 text-2xl font-black">منشئ المتجر الذكي ضمن باقة Pro</h1><p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">الباقة المجانية تمنحك أدوات الإنشاء الأساسية حتى 20 منتجاً. رقِّ إلى Pro لاستخدام التوليد والتحسين بالذكاء الاصطناعي.</p><Link href="/dashboard/subscription" className="mt-6 inline-block rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white">عرض باقة Pro</Link></div>;
  return <AiGeneratorClient />;
}
