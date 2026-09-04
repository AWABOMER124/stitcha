'use server';

import { z } from 'zod';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { getMerchantPlanSnapshot } from '@/modules/merchant-subscriptions';
import { AI_FEATURE_KEYS, runMeteredAiOperation } from '@/modules/ai-usage';
import { AiCoreStoreContentProvider, isAiCoreStoreGenerationConfigured } from '@/services/ai/providers/ai-core-store-content.provider';
import { buildMerchantCopilotSnapshot } from './merchant-copilot.service';

const questionSchema = z.string().trim().min(2).max(500);

export async function askMerchantCopilotAction(question: string, idempotencyKey?: string) {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'reports:read');
    if (!isAiCoreStoreGenerationConfigured()) return { success: false as const, error: 'مساعد وصلة غير مهيأ بعد' };
    const safeQuestion = questionSchema.parse(question);
    const requestKey = idempotencyKey?.trim() || crypto.randomUUID();
    if (requestKey.length < 8 || requestKey.length > 120) return { success: false as const, error: 'معرّف الطلب غير صالح' };
    enforceRateLimit(`merchant-copilot:${auth.merchantId}`, 60, 60 * 60_000);
    const [plan, snapshot] = await Promise.all([
      getMerchantPlanSnapshot(auth.merchantId),
      buildMerchantCopilotSnapshot(auth.merchantId),
    ]);
    const result = await runMeteredAiOperation({
      merchantId: auth.merchantId,
      featureKey: AI_FEATURE_KEYS.MERCHANT_CHAT_MONTHLY,
      period: 'MONTHLY',
      limit: plan.entitlements.aiMerchantChatsMonthly,
      idempotencyKey: requestKey,
    }, async () => {
      const response = await new AiCoreStoreContentProvider().askCopilot(safeQuestion, snapshot, {
        merchantId: auth.merchantId, actorId: auth.userId, language: 'ar',
      });
      return { value: response.answer, usage: { provider: 'ai-core', providerRequestId: response.requestId } };
    });
    return { success: true as const, data: { answer: result } };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'تعذر تشغيل مساعد وصلة' };
  }
}
