import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  merchant: { findUniqueOrThrow: vi.fn() },
  order: { groupBy: vi.fn(), count: vi.fn() },
  orderItem: { findMany: vi.fn() },
  inventoryItem: { findMany: vi.fn() },
};
vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));
const { buildMerchantCopilotSnapshot } = await import('./merchant-copilot.service');

describe('merchant copilot snapshot', () => {
  beforeEach(() => Object.values(prismaMock).flatMap((group) => Object.values(group)).forEach((fn) => fn.mockReset()));

  it('contains aggregated business metrics without customer PII', async () => {
    prismaMock.merchant.findUniqueOrThrow.mockResolvedValue({ name: 'متجر وصلة', currency: 'SDG' });
    prismaMock.order.groupBy.mockResolvedValue([{ status: 'DELIVERED', _count: { id: 2 }, _sum: { total: 5000 } }]);
    prismaMock.orderItem.findMany.mockResolvedValue([
      { quantity: 2, total: 3000, productSnapshot: { name: 'قهوة', customerPhone: '+249000000' } },
      { quantity: 1, total: 2000, productSnapshot: { name: 'قهوة' } },
    ]);
    prismaMock.inventoryItem.findMany.mockResolvedValue([{ quantity: 1, lowStockThreshold: 2, product: { name: 'قهوة' } }]);
    prismaMock.order.count.mockResolvedValue(1);
    const result = await buildMerchantCopilotSnapshot('merchant_1', new Date('2026-09-04T12:00:00Z'));
    expect(result).toMatchObject({ delayedOrdersOver24h: 1, topProducts: [{ name: 'قهوة', quantity: 3, revenue: 5000 }] });
    expect(JSON.stringify(result)).not.toContain('+249000000');
  });
});
