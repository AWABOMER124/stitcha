import prisma from '@/lib/db/prisma';
import { ConflictError, NotFoundError } from '@/lib/errors';
import * as platformNotifications from '@/modules/platform-notifications/services/platform-notifications.service';
import { FREE_ENTITLEMENTS, FREE_PLAN_CODE, parseEntitlements, type MerchantEntitlements } from './entitlements';

export interface MerchantPlanSnapshot {
  code: string;
  name: string;
  monthlyPrice: number;
  currency: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'GRACE_PERIOD' | 'CANCELLED';
  isGrandfathered: boolean;
  entitlements: MerchantEntitlements;
}

export async function getMerchantPlanSnapshot(
  merchantId: string,
  now = new Date(),
): Promise<MerchantPlanSnapshot> {
  const subscription = await prisma.merchantSubscription.findUnique({
    where: { merchantId },
    include: { plan: true },
  });

  if (!subscription || !isEffective(subscription, now)) return freeSnapshot();

  return {
    code: subscription.plan.code,
    name: subscription.plan.name,
    monthlyPrice: Number(subscription.priceOverride ?? subscription.plan.monthlyPrice),
    currency: subscription.currencyOverride ?? subscription.plan.currency,
    status: subscription.status,
    isGrandfathered: subscription.isGrandfathered,
    entitlements: parseEntitlements(subscription.plan.entitlements),
  };
}

export async function listPublicPlans() {
  const plans = await prisma.merchantPlan.findMany({
    where: { isActive: true, isPublic: true },
    orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }],
  });
  return plans.map((plan) => ({
    code: plan.code,
    name: plan.name,
    description: plan.description,
    monthlyPrice: Number(plan.monthlyPrice),
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
  };
}

export async function requestPlanChange(
  merchantId: string,
  targetPlanCode: string,
  note?: string,
) {
  const [merchant, targetPlan, current] = await Promise.all([
    prisma.merchant.findUnique({ where: { id: merchantId }, select: { name: true } }),
    prisma.merchantPlan.findFirst({
      where: { code: targetPlanCode, isActive: true, isPublic: true },
      select: { id: true, code: true, name: true },
    }),
    prisma.merchantSubscription.findUnique({
      where: { merchantId },
      include: { plan: { select: { code: true } } },
    }),
  ]);
  if (!merchant) throw new NotFoundError('Merchant');
  if (!targetPlan) throw new NotFoundError('MerchantPlan');
  if (current?.plan.code === targetPlan.code && current.status === 'ACTIVE') {
    throw new ConflictError('This plan is already active');
  }

  const requestKey = `pending:${merchantId}:${targetPlan.id}`;
  const existing = await prisma.merchantPlanChangeRequest.findUnique({
    where: { requestKey },
    include: { targetPlan: { select: { code: true, name: true } } },
  });
  if (existing) return existing;

  let request;
  try {
    request = await prisma.merchantPlanChangeRequest.create({
      data: { merchantId, targetPlanId: targetPlan.id, requestKey, note },
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

  await platformNotifications.sendNotification({
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
    status: 'ACTIVE' | 'PAST_DUE' | 'GRACE_PERIOD' | 'CANCELLED';
    graceEndsAt: Date | null;
  },
  now: Date,
): boolean {
  if (subscription.status === 'ACTIVE') return true;
  return subscription.status === 'GRACE_PERIOD'
    && subscription.graceEndsAt !== null
    && subscription.graceEndsAt > now;
}

function freeSnapshot(): MerchantPlanSnapshot {
  return {
    code: FREE_PLAN_CODE,
    name: 'Basic',
    monthlyPrice: 0,
    currency: 'USD',
    status: 'ACTIVE',
    isGrandfathered: false,
    entitlements: { ...FREE_ENTITLEMENTS },
  };
}
