import { AiGeneratorClient } from './_client';
import Link from 'next/link';
import { getAuthContext } from '@/lib/permissions';
import { getMerchantPlanSnapshot } from '@/modules/merchant-subscriptions';

export default async function AiGeneratorPage() {
  const auth = await getAuthContext();
  const plan = await getMerchantPlanSnapshot(auth.merchantId);
  const canGenerate = plan.entitlements.aiStoreGenerationsLifetime !== 0
    || plan.entitlements.aiStoreGenerationsMonthly !== 0;
  if (!canGenerate) return <div className="mx-auto max-w-2xl rounded-2xl border bg-[var(--card)] p-8 text-center" dir="rtl"><div className="text-4xl">✨</div><h1 className="mt-4 text-2xl font-black">منشئ المتجر الذكي ضمن الباقات المدفوعة</h1><p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">رقِّ باقتك لاستخدام توليد المتجر وتعديله بالذكاء الاصطناعي.</p><Link href="/dashboard/subscription" className="mt-6 inline-block rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white">عرض الباقات</Link></div>;
  return <AiGeneratorClient />;
}
