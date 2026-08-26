import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  merchantSubscription: { findUnique: vi.fn() },
  merchantPlan: { findMany: vi.fn() },
};
vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));

const { getMerchantPlanSnapshot, listPublicPlans } = await import('./merchant-subscriptions.service');
const { parseEntitlements } = await import('./entitlements');

describe('merchant SaaS entitlements', () => {
  beforeEach(() => {
    prismaMock.merchantSubscription.findUnique.mockReset();
    prismaMock.merchantPlan.findMany.mockReset();
  });

  it('fails safely to Basic when a merchant has no subscription row', async () => {
    prismaMock.merchantSubscription.findUnique.mockResolvedValue(null);
    await expect(getMerchantPlanSnapshot('merchant_1')).resolves.toMatchObject({
      code: 'FREE', monthlyPrice: 0, entitlements: { maxActiveProducts: 100, advancedAnalytics: false },
    });
  });

  it('returns an active grandfathered Pro subscription with its zero-price override', async () => {
    prismaMock.merchantSubscription.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      graceEndsAt: null,
      priceOverride: 0,
      currencyOverride: 'USD',
      isGrandfathered: true,
      plan: {
        code: 'PRO', name: 'Pro', monthlyPrice: 10, currency: 'USD',
        entitlements: { maxActiveProducts: -1, advancedAnalytics: true, apiAccess: true },
      },
    });
    await expect(getMerchantPlanSnapshot('merchant_1')).resolves.toMatchObject({
      code: 'PRO', monthlyPrice: 0, isGrandfathered: true,
      entitlements: { maxActiveProducts: -1, advancedAnalytics: true, apiAccess: true },
    });
  });

  it('downgrades an expired grace-period subscription to safe Basic access', async () => {
    prismaMock.merchantSubscription.findUnique.mockResolvedValue({
      status: 'GRACE_PERIOD',
      graceEndsAt: new Date('2026-08-01T00:00:00Z'),
      priceOverride: null,
      currencyOverride: null,
      isGrandfathered: false,
      plan: { code: 'PRO', name: 'Pro', monthlyPrice: 10, currency: 'USD', entitlements: {} },
    });
    await expect(getMerchantPlanSnapshot('merchant_1', new Date('2026-08-26T00:00:00Z')))
      .resolves.toMatchObject({ code: 'FREE', monthlyPrice: 0 });
  });

  it('normalizes malformed entitlement values conservatively', () => {
    expect(parseEntitlements({ maxActiveProducts: 'all', apiAccess: 'yes', aiMonthlyCredits: -2 }))
      .toMatchObject({ maxActiveProducts: 100, apiAccess: false, aiMonthlyCredits: 3 });
  });

  it('lists only public active plans in configured order', async () => {
    prismaMock.merchantPlan.findMany.mockResolvedValue([{
      code: 'FREE', name: 'Basic', description: 'Basic plan', monthlyPrice: 0,
      currency: 'USD', entitlements: { maxActiveProducts: 100 },
    }]);
    await expect(listPublicPlans()).resolves.toEqual([
      expect.objectContaining({ code: 'FREE', monthlyPrice: 0 }),
    ]);
    expect(prismaMock.merchantPlan.findMany).toHaveBeenCalledWith({
      where: { isActive: true, isPublic: true },
      orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }],
    });
  });
});
