import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessRuleError } from '@/lib/errors';

const txMock = {
  deliveryQuote: { findFirst: vi.fn(), updateMany: vi.fn() },
  order: { update: vi.fn() },
  platformShipment: { create: vi.fn() },
  codCollection: { create: vi.fn() },
};

const prismaMock = {
  order: { findUnique: vi.fn() },
  branch: { findFirst: vi.fn() },
  deliveryPartnerPricingRule: { findMany: vi.fn() },
  deliveryQuote: { updateMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));

const { quotePlatformDelivery, acceptDeliveryQuote } = await import('./delivery-operations.service');

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (value: unknown) => {
    if (typeof value === 'function') return (value as (tx: typeof txMock) => unknown)(txMock);
    return Promise.all(value as Promise<unknown>[]);
  });
  txMock.deliveryQuote.updateMany.mockResolvedValue({ count: 1 });
  txMock.order.update.mockResolvedValue({});
  txMock.platformShipment.create.mockResolvedValue({ id: 'shipment_1', trackingCode: 'WSL-1' });
  txMock.codCollection.create.mockResolvedValue({});
});

describe('quotePlatformDelivery', () => {
  it('rejects pickup and completed orders before quoting', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ deliveryMethod: 'PICKUP', status: 'NEW', delivery: null, branch: null, platformShipment: null });
    await expect(quotePlatformDelivery('order_1')).rejects.toThrow(BusinessRuleError);

    prismaMock.order.findUnique.mockResolvedValue({ deliveryMethod: 'MERCHANT_DELIVERY', status: 'DELIVERED', delivery: null, branch: null, platformShipment: null });
    await expect(quotePlatformDelivery('order_1')).rejects.toThrow('can no longer request delivery');
  });

  it('returns one cheapest quote per partner when pricing rules overlap', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      merchantId: 'merchant_1', deliveryMethod: 'MERCHANT_DELIVERY', status: 'NEW', platformShipment: null,
      branch: { lat: 15.5, lng: 32.5 }, delivery: { lat: 15.51, lng: 32.51 },
    });
    prismaMock.deliveryPartnerPricingRule.findMany.mockResolvedValue([
      { id: 'rule_expensive', partnerId: 'partner_1', baseFee: 1000, perKmFee: 0, minimumFee: 0, maximumFee: null, maxDistanceKm: null, currency: 'SDG', partner: { id: 'partner_1' }, serviceArea: null },
      { id: 'rule_cheap', partnerId: 'partner_1', baseFee: 500, perKmFee: 0, minimumFee: 0, maximumFee: null, maxDistanceKm: null, currency: 'SDG', partner: { id: 'partner_1' }, serviceArea: null },
      { id: 'rule_other', partnerId: 'partner_2', baseFee: 700, perKmFee: 0, minimumFee: 0, maximumFee: null, maxDistanceKm: null, currency: 'SDG', partner: { id: 'partner_2' }, serviceArea: null },
    ]);
    prismaMock.deliveryQuote.create.mockImplementation(async ({ data }: { data: { partnerId: string; fee: number; pricingRuleId: string } }) => data);

    const quotes = await quotePlatformDelivery('order_1') as unknown as Array<{ partnerId: string; fee: number; pricingRuleId: string }>;

    expect(quotes).toHaveLength(2);
    expect(quotes).toContainEqual(expect.objectContaining({ partnerId: 'partner_1', fee: 500, pricingRuleId: 'rule_cheap' }));
  });
});

describe('acceptDeliveryQuote', () => {
  it('updates order and payment totals and creates COD custody for the exact final total', async () => {
    txMock.deliveryQuote.findFirst.mockResolvedValue({
      id: 'quote_1', orderId: 'order_1', status: 'OFFERED', expiresAt: new Date(Date.now() + 60_000), fee: 25, currency: 'SDG', partnerId: 'partner_1',
      partner: { supportsCod: true },
      order: { subtotal: 100, discount: 10, tax: 5, total: 90, paymentMethod: 'CASH', payment: { id: 'payment_1' }, platformShipment: null },
    });

    await acceptDeliveryQuote('order_1', 'quote_1');

    expect(txMock.order.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'order_1' },
      data: expect.objectContaining({ deliveryFee: 25, total: 120, payment: { update: { amount: 120 } } }),
    }));
    expect(txMock.codCollection.create).toHaveBeenCalledWith({ data: { shipmentId: 'shipment_1', expectedAmount: 120, currency: 'SDG' } });
  });

  it('rejects duplicate shipment creation', async () => {
    txMock.deliveryQuote.findFirst.mockResolvedValue({
      id: 'quote_1', orderId: 'order_1', status: 'OFFERED', expiresAt: new Date(Date.now() + 60_000), fee: 25, currency: 'SDG', partnerId: 'partner_1',
      partner: { supportsCod: true }, order: { paymentMethod: 'CASH', payment: null, platformShipment: { id: 'existing' } },
    });
    await expect(acceptDeliveryQuote('order_1', 'quote_1')).rejects.toThrow('already exists');
  });
});
