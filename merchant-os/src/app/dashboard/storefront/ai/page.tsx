import { AiGeneratorClient } from './_client';
import Link from 'next/link';
import { getAuthContext } from '@/lib/permissions';
import { getMerchantPlanSnapshot } from '@/modules/merchant-subscriptions';
import { listMerchantAiStoreDrafts } from '@/modules/storefront/services/ai-store-projects.service';
import { AI_FEATURE_KEYS, getMerchantAiUsageSummary } from '@/modules/ai-usage';

export default async function AiGeneratorPage() {
  const auth = await getAuthContext();
  const [plan, drafts, usage] = await Promise.all([
    getMerchantPlanSnapshot(auth.merchantId),
    listMerchantAiStoreDrafts(auth.merchantId),
    getMerchantAiUsageSummary(auth.merchantId),
  ]);
  const canGenerate = plan.entitlements.aiStoreGenerationsLifetime !== 0
    || plan.entitlements.aiStoreGenerationsMonthly !== 0;
  const usageKey = plan.entitlements.aiStoreGenerationsMonthly !== 0
    ? AI_FEATURE_KEYS.STORE_GENERATION_MONTHLY
    : AI_FEATURE_KEYS.STORE_GENERATION_LIFETIME;
  const generationUsage = usage.find((item) => item.key === usageKey);
  const editUsage = usage.find((item) => item.key === AI_FEATURE_KEYS.STORE_EDIT_MONTHLY);
  const exhausted = generationUsage?.remainingUnits === 0;
  if ((!canGenerate || exhausted) && drafts.length === 0) return <div className="mx-auto max-w-2xl rounded-2xl border bg-[var(--card)] p-8 text-center" dir="rtl"><div className="text-4xl">✨</div><h1 className="mt-4 text-2xl font-black">{exhausted ? 'استهلكت حصة إنشاء المتجر الذكي' : 'منشئ المتجر الذكي غير متاح في باقتك'}</h1><p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">{exhausted ? 'طوّر الباقة للحصول على توليدات جديدة وحصص شهرية أكبر.' : 'طوّر باقتك لاستخدام توليد المتجر وتعديله بالذكاء الاصطناعي.'}</p><Link href="/dashboard/subscription" className="mt-6 inline-block rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white">مقارنة الباقات والترقية</Link></div>;
  const editDisabledReason = plan.entitlements.aiStoreEditsMonthly === 0
    ? 'التعديل الذكي غير متاح في باقتك.'
    : editUsage?.remainingUnits === 0 ? 'استهلكت حصة التعديلات الذكية لهذا الشهر.' : undefined;
  return <AiGeneratorClient editDisabledReason={editDisabledReason} generationDisabledReason={!canGenerate ? 'هذه الميزة غير متاحة في باقتك.' : exhausted ? 'استهلكت حصة التوليد المتاحة؛ ما زال بإمكانك معاينة مسوداتك المحفوظة.' : undefined} initialDrafts={drafts.map((draft) => ({ ...draft, createdAt: draft.createdAt.toISOString() }))} />;
}
