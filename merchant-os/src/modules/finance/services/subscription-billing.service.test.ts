import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = {
  merchant: { findMany: vi.fn() },
  settlement: { findFirst: vi.fn() },
};

const financeServiceMock = {
  createSettlement: vi.fn(),
};

vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));
vi.mock('./finance.service', () => financeServiceMock);

const { runSubscriptionBilling } = await import('./subscription-billing.service');

describe('runSubscriptionBilling', () => {
  beforeEach(() => {
    prismaMock.merchant.findMany.mockReset();
    prismaMock.settlement.findFirst.mockReset();
    financeServiceMock.createSettlement.mockReset();
  });

  it('computes the previous full calendar month as the billing period', async () => {
    prismaMock.merchant.findMany.mockResolvedValue([]);
    const result = await runSubscriptionBilling(new Date(Date.UTC(2026, 7, 15))); // 15 Aug 2026

    expect(result.periodFrom.toISOString()).toBe(new Date(Date.UTC(2026, 6, 1)).toISOString()); // 1 Jul
    expect(result.periodTo.toISOString()).toBe(new Date(Date.UTC(2026, 7, 1)).toISOString()); // 1 Aug
  });

  it('handles January correctly by rolling back into the previous year', async () => {
    prismaMock.merchant.findMany.mockResolvedValue([]);
    const result = await runSubscriptionBilling(new Date(Date.UTC(2026, 0, 10))); // 10 Jan 2026

    expect(result.periodFrom.toISOString()).toBe(new Date(Date.UTC(2025, 11, 1)).toISOString()); // 1 Dec 2025
    expect(result.periodTo.toISOString()).toBe(new Date(Date.UTC(2026, 0, 1)).toISOString()); // 1 Jan 2026
  });

  it('only queries merchants on an active SUBSCRIPTION plan', async () => {
    prismaMock.merchant.findMany.mockResolvedValue([]);
    await runSubscriptionBilling();

    expect(prismaMock.merchant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          status: 'ACTIVE',
          commissionPlan: { type: 'SUBSCRIPTION', isActive: true },
        }),
      })
    );
  });

  it('bills a merchant with no existing settlement for the period', async () => {
    prismaMock.merchant.findMany.mockResolvedValue([{ id: 'merch_1', distributorId: 'dist_1' }]);
    prismaMock.settlement.findFirst.mockResolvedValue(null);
    financeServiceMock.createSettlement.mockResolvedValue({ id: 'settlement_1' });

    const result = await runSubscriptionBilling();

    expect(financeServiceMock.createSettlement).toHaveBeenCalledWith(
      'dist_1',
      expect.objectContaining({ merchantId: 'merch_1' })
    );
    expect(result.billed).toEqual(['merch_1']);
    expect(result.skippedAlreadyBilled).toEqual([]);
  });

  it('is idempotent — skips a merchant whose period is already billed', async () => {
    prismaMock.merchant.findMany.mockResolvedValue([{ id: 'merch_1', distributorId: 'dist_1' }]);
    prismaMock.settlement.findFirst.mockResolvedValue({ id: 'existing_settlement' });

    const result = await runSubscriptionBilling();

    expect(financeServiceMock.createSettlement).not.toHaveBeenCalled();
    expect(result.skippedAlreadyBilled).toEqual(['merch_1']);
    expect(result.billed).toEqual([]);
  });

  it.each(['P2002', 'CONFLICT'])('treats a concurrent %s race as already billed', async (code) => {
    prismaMock.merchant.findMany.mockResolvedValue([{ id: 'merch_1', distributorId: 'dist_1' }]);
    prismaMock.settlement.findFirst.mockResolvedValue(null);
    financeServiceMock.createSettlement.mockRejectedValue({ code });

    const result = await runSubscriptionBilling();

    expect(result.billed).toEqual([]);
    expect(result.skippedAlreadyBilled).toEqual(['merch_1']);
    expect(result.failed).toEqual([]);
  });

  it('records a per-merchant failure without stopping the batch', async () => {
    prismaMock.merchant.findMany.mockResolvedValue([
      { id: 'merch_bad', distributorId: 'dist_1' },
      { id: 'merch_good', distributorId: 'dist_1' },
    ]);
    prismaMock.settlement.findFirst.mockResolvedValue(null);
    financeServiceMock.createSettlement
      .mockRejectedValueOnce(new Error('db exploded'))
      .mockResolvedValueOnce({ id: 'settlement_2' });

    const result = await runSubscriptionBilling();

    expect(result.failed).toEqual([{ merchantId: 'merch_bad', error: 'db exploded' }]);
    expect(result.billed).toEqual(['merch_good']);
  });

  it('skips a merchant with no distributorId (should not happen, but defends against it)', async () => {
    prismaMock.merchant.findMany.mockResolvedValue([{ id: 'merch_orphan', distributorId: null }]);

    const result = await runSubscriptionBilling();

    expect(financeServiceMock.createSettlement).not.toHaveBeenCalled();
    expect(result.billed).toEqual([]);
    expect(result.skippedAlreadyBilled).toEqual([]);
    expect(result.failed).toEqual([]);
  });
});
