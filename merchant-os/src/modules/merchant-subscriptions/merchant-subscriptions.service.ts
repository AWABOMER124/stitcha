import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError, ConflictError, NotFoundError } from '@/lib/errors';
import * as platformNotifications from '@/modules/platform-notifications/services/platform-notifications.service';
import { FREE_ENTITLEMENTS, FREE_PLAN_CODE, parseEntitlements, type MerchantEntitlements } from './entitlements';
import { logger } from '@/lib/logger';
import { planBelongsToMarket, planRequestQuote, resolveMarket, type SubscriptionMarket, type PlanInterval } from './market-pricing';

export interface MerchantPlanSnapshot {
  code: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number | null;
  currency: string;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'GRACE_PERIOD' | 'CANCELLED';
  billingInterval: 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  trialEndsAt: Date | null;
  billingProvider?: string | null;
  currentPeriodEndsAt?: Date | null;
  isGrandfathered: boolean;
  entitlements: MerchantEntitlements;
}

type Db = Prisma.TransactionClient | typeof prisma;

export async function getMerchantPlanSnapshot(
  merchantId: string,
  now = new Date(),
  tx: Db = prisma,
): Promise<MerchantPlanSnapshot> {
  const subscription = await tx.merchantSubscription.findUnique({
    where: { merchantId },
    include: { plan: true },
  });

  if (!subscription || !isEffective(subscription, now)) return freeSnapshot();

  return {
    code: subscription.plan.code,
    name: subscription.plan.name,
    monthlyPrice: Number(subscription.priceOverride ?? subscription.plan.monthlyPrice),
    yearlyPrice: subscription.plan.yearlyPrice == null ? null : Number(subscription.plan.yearlyPrice),
    currency: subscription.currencyOverride ?? subscription.plan.currency,
    status: subscription.status,
    billingInterval: subscription.billingInterval ?? 'MONTHLY',
    trialEndsAt: subscription.trialEndsAt ?? null,
    billingProvider: subscription.billingProvider,
    currentPeriodEndsAt: subscription.currentPeriodEndsAt,
    isGrandfathered: subscription.isGrandfathered,
    entitlements: mergeEntitlements(subscription.plan.entitlements, subscription.entitlementOverrides),
  };
}

export async function requireMerchantEntitlement(
  merchantId: string,
  entitlement: keyof MerchantEntitlements,
  message = 'هذه الميزة متاحة في باقة Pro',
  tx: Db = prisma,
) {
  const plan = await getMerchantPlanSnapshot(merchantId, new Date(), tx);
  const value = plan.entitlements[entitlement];
  if (value === false || value === 0) throw new BusinessRuleError(message);
  return plan;
}

export async function getMerchantSubscriptionMarket(merchantId: string): Promise<SubscriptionMarket> {
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { subscriptionMarket: true } });
  if (!merchant) throw new NotFoundError('Merchant');
  return resolveMarket(merchant.subscriptionMarket);
}

export async function listPublicPlans(market: SubscriptionMarket = 'SD') {
  const plans = await prisma.merchantPlan.findMany({
    where: market === 'SA' ? { isActive: true, OR: [{ code: 'FREE', isPublic: true }, { code: { startsWith: 'SA_' }, isMarketPublic: true }] } : { isActive: true, isPublic: true },
    orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }],
  });
  return plans.filter(plan => planBelongsToMarket(plan.code, market)).map((plan) => ({
    code: plan.code,
    name: plan.name,
    description: plan.description,
    monthlyPrice: Number(plan.monthlyPrice),
    yearlyPrice: plan.yearlyPrice == null ? null : Number(plan.yearlyPrice),
    currency: plan.currency,
    entitlements: parseEntitlements(plan.entitlements),
  }));
}

export async function getPendingPlanChangeRequest(merchantId: string) {
  const request = await prisma.merchantPlanChangeRequest.findFirst({
    where: { merchantId, status: { in: ['PENDING', 'CONTACTED'] } },
    include: { targetPlan: { select: { code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return request && {
    id: request.id,
    status: request.status,
    targetPlan: request.targetPlan,
    createdAt: request.createdAt,
    billingInterval: request.billingInterval,
    quotedAmount: request.quotedAmount == null ? null : Number(request.quotedAmount),
    quotedCurrency: request.quotedCurrency,
  };
}

export async function requestPlanChange(
  merchantId: string,
  targetPlanCode: string,
  note?: string,
  billingInterval: PlanInterval = 'MONTHLY',
  options: { notifyPlatform?: boolean } = {},
) {
  const [merchant, targetPlan, current] = await Promise.all([
    prisma.merchant.findUnique({ where: { id: merchantId }, select: { name: true, subscriptionMarket: true } }),
    prisma.merchantPlan.findFirst({
      where: { code: targetPlanCode, isActive: true, ...(targetPlanCode.startsWith('SA_') ? { isMarketPublic: true } : { isPublic: true }) },
      select: { id: true, code: true, name: true, monthlyPrice: true, yearlyPrice: true, currency: true },
    }),
    prisma.merchantSubscription.findUnique({
      where: { merchantId },
      include: { plan: { select: { code: true } } },
    }),
  ]);
  if (!merchant) throw new NotFoundError('Merchant');
  if (!targetPlan) throw new NotFoundError('MerchantPlan');
  if (!planBelongsToMarket(targetPlan.code, resolveMarket(merchant.subscriptionMarket))) {
    throw new BusinessRuleError('اختر باقة من سوق نشاط متجرك');
  }
  const quote = planRequestQuote({ targetPlan, billingInterval });
  if (current?.plan.code === targetPlan.code && isEffective(current, new Date()) && !(merchant.subscriptionMarket === 'SA' && current.billingProvider === 'paymob')) {
    throw new ConflictError('This plan is already active');
  }

  const requestKey = billingInterval === 'MONTHLY' ? `pending:${merchantId}:${targetPlan.id}` : `pending:${merchantId}:${targetPlan.id}:YEARLY`;
  const existing = await prisma.merchantPlanChangeRequest.findUnique({
    where: { requestKey },
    include: { targetPlan: { select: { code: true, name: true } } },
  });
  if (existing) {
    if (merchant.subscriptionMarket !== 'SA' || ['PENDING', 'CONTACTED'].includes(existing.status)) return existing;
    await prisma.merchantPlanChangeRequest.updateMany({ where: { id: existing.id, requestKey, status: { notIn: ['PENDING', 'CONTACTED'] } }, data: { requestKey: null } });
  }

  let request;
  try {
    request = await prisma.merchantPlanChangeRequest.create({
      data: { merchantId, targetPlanId: targetPlan.id, requestKey, note, billingInterval, quotedAmount: quote.amount, quotedCurrency: quote.currency },
      include: { targetPlan: { select: { code: true, name: true } } },
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    request = await prisma.merchantPlanChangeRequest.findUniqueOrThrow({
      where: { requestKey },
      include: { targetPlan: { select: { code: true, name: true } } },
    });
    return request;
  }

  logger.info('product_event', {
    event: 'upgrade_clicked', merchantId, targetPlanCode: targetPlan.code, requestId: request.id,
  });

  if (options.notifyPlatform !== false) await platformNotifications.sendNotification({
    type: 'SYSTEM',
    title: 'Merchant plan upgrade request',
    body: `${merchant.name} requested the ${targetPlan.name} plan.`,
  }).catch((error) => console.error('[merchant-subscriptions] Failed to notify platform:', error));

  return request;
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function isEffective(
  subscription: {
    status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'GRACE_PERIOD' | 'CANCELLED';
    graceEndsAt: Date | null;
    trialEndsAt: Date | null;
    billingProvider?: string | null;
    currentPeriodEndsAt?: Date | null;
  },
  now: Date,
): boolean {
  if (subscription.status === 'ACTIVE') return subscription.billingProvider !== 'paymob' || Boolean(subscription.currentPeriodEndsAt && subscription.currentPeriodEndsAt > now);
  if (subscription.status === 'TRIALING') {
    return subscription.trialEndsAt !== null && subscription.trialEndsAt > now;
  }
  return subscription.status === 'GRACE_PERIOD'
    && subscription.graceEndsAt !== null
    && subscription.graceEndsAt > now;
}

function freeSnapshot(): MerchantPlanSnapshot {
  return {
    code: FREE_PLAN_CODE,
    name: 'Basic',
    monthlyPrice: 0,
    yearlyPrice: null,
    currency: 'USD',
    status: 'ACTIVE',
    billingInterval: 'MONTHLY',
    trialEndsAt: null,
    isGrandfathered: false,
    entitlements: { ...FREE_ENTITLEMENTS },
  };
}

/** Platform queue shown before a merchant submits a transfer receipt. */
export async function listPlanChangeRequestsForAdmin() {
  return prisma.merchantPlanChangeRequest.findMany({
    where: { status: { in: ['PENDING', 'CONTACTED'] } },
    include: {
      merchant: { select: { name: true, slug: true } },
      targetPlan: { select: { code: true, name: true, monthlyPrice: true, currency: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

function mergeEntitlements(plan: Prisma.JsonValue, overrides: Prisma.JsonValue | null): MerchantEntitlements {
  const base = isJsonObject(plan) ? plan : {};
  const custom = isJsonObject(overrides) ? overrides : {};
  return parseEntitlements({ ...base, ...custom });
}

function isJsonObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
