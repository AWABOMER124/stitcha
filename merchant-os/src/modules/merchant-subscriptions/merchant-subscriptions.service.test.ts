import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  merchant: { findUnique: vi.fn() },
  merchantSubscription: { findUnique: vi.fn() },
  merchantPlan: { findMany: vi.fn(), findFirst: vi.fn() },
  merchantPlanChangeRequest: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
  },
};
const sendPlatformNotification = vi.fn();
vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));
vi.mock('@/modules/platform-notifications/services/platform-notifications.service', () => ({
  sendNotification: sendPlatformNotification,
}));

const { getMerchantPlanSnapshot, listPublicPlans, requestPlanChange } = await import('./merchant-subscriptions.service');
const { parseEntitlements } = await import('./entitlements');

describe('merchant SaaS entitlements', () => {
  beforeEach(() => {
    prismaMock.merchantSubscription.findUnique.mockReset();
    prismaMock.merchantPlan.findMany.mockReset();
    prismaMock.merchantPlan.findFirst.mockReset();
    prismaMock.merchant.findUnique.mockReset();
    Object.values(prismaMock.merchantPlanChangeRequest).forEach((fn) => fn.mockReset());
    sendPlatformNotification.mockReset().mockResolvedValue(undefined);
  });

  it('fails safely to Basic when a merchant has no subscription row', async () => {
    prismaMock.merchantSubscription.findUnique.mockResolvedValue(null);
    await expect(getMerchantPlanSnapshot('merchant_1')).resolves.toMatchObject({
      code: 'FREE', monthlyPrice: 0, entitlements: { maxActiveProducts: 20, advancedAnalytics: false },
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
      .toMatchObject({ maxActiveProducts: 20, apiAccess: false, aiMonthlyCredits: 0 });
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

  it('creates one idempotent Pro upgrade request and notifies platform operations', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ name: 'Store' });
    prismaMock.merchantPlan.findFirst.mockResolvedValue({ id: 'pro_id', code: 'PRO', name: 'Pro' });
    prismaMock.merchantSubscription.findUnique.mockResolvedValue({ status: 'ACTIVE', plan: { code: 'FREE' } });
    prismaMock.merchantPlanChangeRequest.findUnique.mockResolvedValue(null);
    prismaMock.merchantPlanChangeRequest.create.mockResolvedValue({
      id: 'request_1', status: 'PENDING', targetPlan: { code: 'PRO', name: 'Pro' },
    });

    await expect(requestPlanChange('merchant_1', 'PRO')).resolves.toMatchObject({ status: 'PENDING' });
    expect(prismaMock.merchantPlanChangeRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ requestKey: 'pending:merchant_1:pro_id' }),
    }));
    expect(sendPlatformNotification).toHaveBeenCalledOnce();
  });

  it('returns an existing pending request without duplicating or notifying', async () => {
    prismaMock.merchant.findUnique.mockResolvedValue({ name: 'Store' });
    prismaMock.merchantPlan.findFirst.mockResolvedValue({ id: 'pro_id', code: 'PRO', name: 'Pro' });
    prismaMock.merchantSubscription.findUnique.mockResolvedValue({ status: 'ACTIVE', plan: { code: 'FREE' } });
    prismaMock.merchantPlanChangeRequest.findUnique.mockResolvedValue({ id: 'request_1', status: 'PENDING' });

    await expect(requestPlanChange('merchant_1', 'PRO')).resolves.toMatchObject({ status: 'PENDING' });
    expect(prismaMock.merchantPlanChangeRequest.create).not.toHaveBeenCalled();
    expect(sendPlatformNotification).not.toHaveBeenCalled();
  });
});
