import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FREE_ENTITLEMENTS } from './entitlements';
import { PLAN_BOOLEAN_FIELDS, PLAN_LIMIT_FIELDS } from './plan-fields';

const prismaMock = {
  merchantPlan: { findMany: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
};
vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));

const { listAdminMerchantPlans, updateAdminMerchantPlan } = await import('./admin-plan.service');

describe('admin merchant-plan management', () => {
  beforeEach(() => Object.values(prismaMock.merchantPlan).forEach((fn) => fn.mockReset()));

  it('lists private and inactive plans for platform administration', async () => {
    prismaMock.merchantPlan.findMany.mockResolvedValue([{
      id: 'plan_1', code: 'BUSINESS', name: 'Business', description: null,
      monthlyPrice: 0, currency: 'USD', sortOrder: 3, isPublic: false, isActive: false, entitlements: {},
    }]);
    await expect(listAdminMerchantPlans()).resolves.toEqual([
      expect.objectContaining({ code: 'BUSINESS', isPublic: false, isActive: false }),
    ]);
  });

  it('updates known limits and flags without deleting future entitlement keys', async () => {
    prismaMock.merchantPlan.findUniqueOrThrow.mockResolvedValue({ entitlements: { futureFeature: true } });
    prismaMock.merchantPlan.update.mockResolvedValue({ id: 'cm12345678901234567890123' });
    const limits = Object.fromEntries(PLAN_LIMIT_FIELDS.map((key) => [key, FREE_ENTITLEMENTS[key]]));
    const flags = Object.fromEntries(PLAN_BOOLEAN_FIELDS.map((key) => [key, FREE_ENTITLEMENTS[key]]));

    await updateAdminMerchantPlan({
      id: 'cm12345678901234567890123', name: 'Growth', description: 'For growing stores', monthlyPrice: 5,
      currency: 'usd', sortOrder: 2, isPublic: true, isActive: true, limits, flags,
    });

    expect(prismaMock.merchantPlan.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ currency: 'USD', entitlements: expect.objectContaining({ futureFeature: true, maxActiveProducts: 20 }) }),
    }));
  });

  it('rejects negative prices and invalid currencies', async () => {
    const limits = Object.fromEntries(PLAN_LIMIT_FIELDS.map((key) => [key, 0]));
    const flags = Object.fromEntries(PLAN_BOOLEAN_FIELDS.map((key) => [key, false]));
    await expect(updateAdminMerchantPlan({
      id: 'cm12345678901234567890123', name: 'Growth', description: '', monthlyPrice: -1,
      currency: 'US', sortOrder: 1, isPublic: true, isActive: true, limits, flags,
    })).rejects.toThrow();
    expect(prismaMock.merchantPlan.update).not.toHaveBeenCalled();
  });
});
