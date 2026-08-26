import prisma from '@/lib/db/prisma';
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
