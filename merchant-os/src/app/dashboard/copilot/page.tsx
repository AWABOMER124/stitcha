import Link from 'next/link';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import { AI_FEATURE_KEYS, getMerchantAiUsageSummary } from '@/modules/ai-usage';
import { getMerchantPlanSnapshot } from '@/modules/merchant-subscriptions';
import { MerchantCopilotClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function MerchantCopilotPage() {
  const auth = await getAuthContext();
  requirePermission(auth, 'reports:read');
  const [plan, usage] = await Promise.all([getMerchantPlanSnapshot(auth.merchantId), getMerchantAiUsageSummary(auth.merchantId)]);
  const item = usage.find((entry) => entry.key === AI_FEATURE_KEYS.MERCHANT_CHAT_MONTHLY);
  const remaining = item?.remainingUnits ?? 0;
  if (plan.entitlements.aiMerchantChatsMonthly === 0 || remaining === 0) return <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center" dir="rtl"><div className="text-4xl">💡</div><h1 className="mt-4 text-2xl font-black">مساعد وصلة غير متاح في باقتك الحالية</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">طوّر الباقة لتحليل المبيعات والطلبات والمخزون بأسئلة بسيطة.</p><Link href="/dashboard/subscription" className="mt-5 inline-block rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white">مقارنة الباقات</Link></div>;
  return <MerchantCopilotClient remaining={remaining} />;
}
