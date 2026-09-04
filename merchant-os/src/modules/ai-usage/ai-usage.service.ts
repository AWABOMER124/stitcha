import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError, FeatureNotAvailableError, NotFoundError, UsageLimitReachedError } from '@/lib/errors';
import { getMerchantPlanSnapshot } from '@/modules/merchant-subscriptions';
import type { MerchantEntitlements } from '@/modules/merchant-subscriptions';
import { logger } from '@/lib/logger';

export const AI_FEATURE_KEYS = Object.freeze({
  STORE_GENERATION_LIFETIME: 'ai.store_generation.lifetime',
  STORE_GENERATION_MONTHLY: 'ai.store_generation.monthly',
  STORE_EDIT_MONTHLY: 'ai.store_edit.monthly',
  MERCHANT_CHAT_MONTHLY: 'ai.merchant_chat.monthly',
  IMAGE_ENHANCEMENT_MONTHLY: 'ai.image_enhancement.monthly',
  WHATSAPP_CONVERSATION_MONTHLY: 'ai.whatsapp_conversation.monthly',
} as const);

export type AiFeatureKey = typeof AI_FEATURE_KEYS[keyof typeof AI_FEATURE_KEYS];
export type AiUsagePeriod = 'LIFETIME' | 'MONTHLY';

export const AI_FEATURE_CATALOG: ReadonlyArray<{
  key: AiFeatureKey;
  entitlement: keyof MerchantEntitlements;
  period: AiUsagePeriod;
  labelAr: string;
  labelEn: string;
}> = Object.freeze([
  { key: AI_FEATURE_KEYS.STORE_GENERATION_LIFETIME, entitlement: 'aiStoreGenerationsLifetime', period: 'LIFETIME', labelAr: 'توليد المتجر مدى الحياة', labelEn: 'Lifetime store generation' },
  { key: AI_FEATURE_KEYS.STORE_GENERATION_MONTHLY, entitlement: 'aiStoreGenerationsMonthly', period: 'MONTHLY', labelAr: 'توليد المتجر', labelEn: 'Store generations' },
  { key: AI_FEATURE_KEYS.STORE_EDIT_MONTHLY, entitlement: 'aiStoreEditsMonthly', period: 'MONTHLY', labelAr: 'تعديلات المتجر الذكية', labelEn: 'AI store edits' },
  { key: AI_FEATURE_KEYS.MERCHANT_CHAT_MONTHLY, entitlement: 'aiMerchantChatsMonthly', period: 'MONTHLY', labelAr: 'محادثات مساعد التاجر', labelEn: 'Merchant copilot chats' },
  { key: AI_FEATURE_KEYS.IMAGE_ENHANCEMENT_MONTHLY, entitlement: 'aiImageEnhancementsMonthly', period: 'MONTHLY', labelAr: 'تحسين صور المنتجات', labelEn: 'Product image enhancements' },
  { key: AI_FEATURE_KEYS.WHATSAPP_CONVERSATION_MONTHLY, entitlement: 'whatsappAiConversationsMonthly', period: 'MONTHLY', labelAr: 'ردود واتساب الذكية', labelEn: 'WhatsApp AI replies' },
]);

export interface AiProviderUsage {
  provider?: string;
  providerRequestId?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  metadata?: Prisma.InputJsonValue;
}

interface ReserveAiUsageInput {
  merchantId: string;
  featureKey: AiFeatureKey;
  period: AiUsagePeriod;
  limit: number;
  idempotencyKey: string;
  units?: number;
  now?: Date;
  reservationTtlMs?: number;
}

export interface AiUsageReservation {
  operationId: string;
  merchantId: string;
  featureKey: AiFeatureKey;
  periodKey: string;
  status: 'RESERVED' | 'COMMITTED' | 'RELEASED' | 'EXPIRED';
  units: number;
  usedUnits: number;
  reservedUnits: number;
  limit: number;
}

const DEFAULT_RESERVATION_TTL_MS = 15 * 60_000;
const SERIALIZABLE_RETRIES = 3;

export function aiUsagePeriodKey(period: AiUsagePeriod, now = new Date()): string {
  if (period === 'LIFETIME') return 'lifetime';
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function reserveAiUsage(input: ReserveAiUsageInput): Promise<AiUsageReservation> {
  const units = input.units ?? 1;
  if (!Number.isInteger(units) || units <= 0) throw new BusinessRuleError('وحدة استهلاك الذكاء الاصطناعي غير صالحة');
  if (!Number.isInteger(input.limit) || input.limit < -1) throw new BusinessRuleError('حد استخدام الذكاء الاصطناعي غير صالح');
  if (!input.idempotencyKey.trim()) throw new BusinessRuleError('مفتاح العملية مطلوب');
  if (input.limit === 0) {
    logAiLimitReached(input, 0, null);
    throw new FeatureNotAvailableError(input.featureKey);
  }

  const now = input.now ?? new Date();
  const periodKey = aiUsagePeriodKey(input.period, now);
  const expiresAt = new Date(now.getTime() + (input.reservationTtlMs ?? DEFAULT_RESERVATION_TTL_MS));

  return serializableTransaction(async (tx) => {
    const existing = await tx.aiUsageOperation.findUnique({
      where: {
        merchantId_featureKey_idempotencyKey: {
          merchantId: input.merchantId,
          featureKey: input.featureKey,
          idempotencyKey: input.idempotencyKey,
        },
      },
      include: { bucket: true },
    });
    if (existing) return toReservation(existing, existing.bucket);

    const bucket = await tx.aiUsageBucket.upsert({
      where: {
        merchantId_featureKey_periodKey: {
          merchantId: input.merchantId,
          featureKey: input.featureKey,
          periodKey,
        },
      },
      create: {
        merchantId: input.merchantId,
        featureKey: input.featureKey,
        periodKey,
        limitSnapshot: input.limit,
      },
      update: { limitSnapshot: input.limit },
    });

    if (input.limit !== -1 && bucket.usedUnits + bucket.reservedUnits + units > input.limit) {
      logAiLimitReached(input, bucket.usedUnits + bucket.reservedUnits, input.period === 'MONTHLY' ? nextUtcMonth(now) : null);
      throw quotaExceeded(input.featureKey, bucket.usedUnits + bucket.reservedUnits, input.limit, input.period, now);
    }

    const updatedBucket = await tx.aiUsageBucket.update({
      where: { id: bucket.id },
      data: { reservedUnits: { increment: units }, limitSnapshot: input.limit },
    });
    const operation = await tx.aiUsageOperation.create({
      data: {
        merchantId: input.merchantId,
        bucketId: bucket.id,
        featureKey: input.featureKey,
        idempotencyKey: input.idempotencyKey,
        units,
        expiresAt,
      },
    });
    return toReservation(operation, updatedBucket);
  });
}

export async function commitAiUsage(operationId: string, usage: AiProviderUsage = {}): Promise<void> {
  await serializableTransaction(async (tx) => {
    const operation = await tx.aiUsageOperation.findUnique({ where: { id: operationId } });
    if (!operation) throw new NotFoundError('AiUsageOperation');
    if (operation.status !== 'RESERVED') return;

    await tx.aiUsageBucket.update({
      where: { id: operation.bucketId },
      data: {
        reservedUnits: { decrement: operation.units },
        usedUnits: { increment: operation.units },
      },
    });
    await tx.aiUsageOperation.update({
      where: { id: operation.id },
      data: {
        status: 'COMMITTED',
        committedAt: new Date(),
        ...providerUsageData(usage),
      },
    });
  });
}

export async function releaseAiUsage(
  operationId: string,
  failure?: { code?: string; message?: string; usage?: AiProviderUsage },
): Promise<void> {
  await serializableTransaction(async (tx) => {
    const operation = await tx.aiUsageOperation.findUnique({ where: { id: operationId } });
    if (!operation) throw new NotFoundError('AiUsageOperation');
    if (operation.status !== 'RESERVED') return;

    await tx.aiUsageBucket.update({
      where: { id: operation.bucketId },
      data: { reservedUnits: { decrement: operation.units } },
    });
    await tx.aiUsageOperation.update({
      where: { id: operation.id },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
        failureCode: failure?.code,
        failureMessage: failure?.message?.slice(0, 1000),
        ...providerUsageData(failure?.usage ?? {}),
      },
    });
  });
}

export async function expireAiUsageReservations(now = new Date(), batchSize = 500): Promise<number> {
  const expired = await prisma.aiUsageOperation.findMany({
    where: { status: 'RESERVED', expiresAt: { lte: now } },
    select: { id: true, bucketId: true, units: true },
    orderBy: { expiresAt: 'asc' },
    take: Math.min(Math.max(batchSize, 1), 1000),
  });
  if (expired.length === 0) return 0;

  return prisma.$transaction(async tx => {
    let released = 0;
    for (const operation of expired) {
      const claimed = await tx.aiUsageOperation.updateMany({
        where: { id: operation.id, status: 'RESERVED' },
        data: { status: 'EXPIRED', releasedAt: now },
      });
      if (claimed.count === 0) continue;
      await tx.aiUsageBucket.update({
        where: { id: operation.bucketId },
        data: { reservedUnits: { decrement: operation.units } },
      });
      released += 1;
    }
    return released;
  });
}

export async function getMerchantAiUsageSummary(merchantId: string, now = new Date()) {
  const plan = await getMerchantPlanSnapshot(merchantId, now);
  const monthlyKey = aiUsagePeriodKey('MONTHLY', now);
  const buckets = await prisma.aiUsageBucket.findMany({
    where: { merchantId, periodKey: { in: ['lifetime', monthlyKey] } },
  });
  const byKey = new Map(buckets.map(bucket => [`${bucket.featureKey}:${bucket.periodKey}`, bucket]));

  return AI_FEATURE_CATALOG.map(feature => {
    const limitValue = plan.entitlements[feature.entitlement];
    const limit = typeof limitValue === 'number' ? limitValue : 0;
    const periodKey = aiUsagePeriodKey(feature.period, now);
    const bucket = byKey.get(`${feature.key}:${periodKey}`);
    return {
      ...feature,
      periodKey,
      limit,
      usedUnits: bucket?.usedUnits ?? 0,
      reservedUnits: bucket?.reservedUnits ?? 0,
      remainingUnits: limit === -1 ? -1 : Math.max(0, limit - (bucket?.usedUnits ?? 0) - (bucket?.reservedUnits ?? 0)),
    };
  });
}

export async function getPlatformAiUsageOverview(now = new Date()) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [totals, breakdown, recent] = await Promise.all([
    prisma.aiUsageOperation.aggregate({
      where: { createdAt: { gte: monthStart } },
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true, estimatedCostUsd: true },
    }),
    prisma.aiUsageOperation.groupBy({
      by: ['featureKey', 'status'],
      where: { createdAt: { gte: monthStart } },
      _count: { _all: true },
    }),
    prisma.aiUsageOperation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { merchant: { select: { name: true, slug: true } } },
    }),
  ]);
  return {
    monthStart,
    totalOperations: totals._count._all,
    inputTokens: totals._sum.inputTokens ?? 0,
    outputTokens: totals._sum.outputTokens ?? 0,
    estimatedCostUsd: Number(totals._sum.estimatedCostUsd ?? 0),
    breakdown,
    recent: recent.map(item => ({ ...item, estimatedCostUsd: Number(item.estimatedCostUsd ?? 0) })),
  };
}

export async function runMeteredAiOperation<T>(
  input: ReserveAiUsageInput,
  execute: () => Promise<{ value: T; usage?: AiProviderUsage }>,
): Promise<T> {
  const reservation = await reserveAiUsage(input);
  if (reservation.status === 'COMMITTED') {
    throw new BusinessRuleError('تم تنفيذ هذه العملية مسبقاً');
  }
  if (reservation.status !== 'RESERVED') {
    throw new BusinessRuleError('لا يمكن إعادة استخدام عملية ذكاء اصطناعي منتهية');
  }
  logger.info('product_event', { event: 'ai_operation_started', merchantId: input.merchantId, feature: input.featureKey, operationId: reservation.operationId });

  try {
    const result = await execute();
    await commitAiUsage(reservation.operationId, result.usage);
    logger.info('product_event', { event: 'ai_operation_completed', merchantId: input.merchantId, feature: input.featureKey, operationId: reservation.operationId });
    return result.value;
  } catch (error) {
    await releaseAiUsage(reservation.operationId, {
      code: errorCode(error),
      message: error instanceof Error ? error.message : 'AI operation failed',
    }).catch((releaseError) => console.error('[ai-usage] Failed to release reservation:', releaseError));
    logger.info('product_event', { event: 'ai_operation_failed', merchantId: input.merchantId, feature: input.featureKey, operationId: reservation.operationId, code: errorCode(error) });
    throw error;
  }
}

function providerUsageData(usage: AiProviderUsage) {
  return {
    provider: usage.provider,
    providerRequestId: usage.providerRequestId,
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    estimatedCostUsd: usage.estimatedCostUsd,
    metadata: usage.metadata,
  };
}

function toReservation(
  operation: { id: string; merchantId: string; featureKey: string; status: string; units: number },
  bucket: { periodKey: string; usedUnits: number; reservedUnits: number; limitSnapshot: number },
): AiUsageReservation {
  return {
    operationId: operation.id,
    merchantId: operation.merchantId,
    featureKey: operation.featureKey as AiFeatureKey,
    periodKey: bucket.periodKey,
    status: operation.status as AiUsageReservation['status'],
    units: operation.units,
    usedUnits: bucket.usedUnits,
    reservedUnits: bucket.reservedUnits,
    limit: bucket.limitSnapshot,
  };
}

async function serializableTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= SERIALIZABLE_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(callback, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (!isRetryableTransactionError(error) || attempt === SERIALIZABLE_RETRIES) throw error;
    }
  }
  throw new Error('Unreachable transaction retry state');
}

function isRetryableTransactionError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034';
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined;
}

function quotaExceeded(featureKey: AiFeatureKey, used: number, limit: number, period: AiUsagePeriod, now: Date) {
  return new UsageLimitReachedError({
    limitKey: featureKey,
    used,
    limit,
    resetAt: period === 'MONTHLY' ? nextUtcMonth(now) : null,
  });
}

function nextUtcMonth(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

function logAiLimitReached(input: ReserveAiUsageInput, used: number, resetAt: Date | null) {
  logger.info('product_event', {
    event: 'ai_limit_reached', merchantId: input.merchantId, feature: input.featureKey,
    used, limit: input.limit, resetAt: resetAt?.toISOString() ?? null,
  });
}
