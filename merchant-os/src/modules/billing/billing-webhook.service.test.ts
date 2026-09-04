import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BillingProvider, VerifiedBillingEvent } from './billing-provider';

const txMock = {
  merchantSubscription: { findUnique: vi.fn(), update: vi.fn() },
  merchantSubscriptionEvent: { create: vi.fn() },
  billingWebhookEvent: { update: vi.fn() },
};
const prismaMock = {
  billingWebhookEvent: { create: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) => callback(txMock)),
};
vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));

const { processBillingWebhook } = await import('./billing-webhook.service');

function provider(event: VerifiedBillingEvent): BillingProvider {
  return {
    key: 'stripe',
    createCheckout: vi.fn(), createSubscription: vi.fn(), cancelSubscription: vi.fn(), getSubscription: vi.fn(),
    verifyWebhook: vi.fn().mockResolvedValue(event),
  };
}

const event: VerifiedBillingEvent = {
  id: 'evt_1', type: 'subscription.updated', externalSubscriptionId: 'sub_1', status: 'ACTIVE',
  externalCustomerId: 'cus_1', currentPeriodEndsAt: new Date('2026-10-01T00:00:00Z'),
};

describe('billing webhook processing', () => {
  beforeEach(() => {
    for (const group of [prismaMock.billingWebhookEvent, txMock.merchantSubscription, txMock.merchantSubscriptionEvent, txMock.billingWebhookEvent]) {
      Object.values(group).forEach(mock => mock.mockReset());
    }
    prismaMock.$transaction.mockClear();
    prismaMock.billingWebhookEvent.create.mockResolvedValue({ id: 'webhook_1' });
    prismaMock.billingWebhookEvent.updateMany.mockResolvedValue({ count: 1 });
    txMock.merchantSubscription.findUnique.mockResolvedValue({ id: 'subscription_1', merchantId: 'merchant_1' });
  });

  it('verifies the signature before persisting or applying an event', async () => {
    const adapter = provider(event);
    vi.mocked(adapter.verifyWebhook).mockRejectedValue(new Error('Invalid signature'));

    await expect(processBillingWebhook(adapter, '{"event":1}', new Headers())).rejects.toThrow('Invalid signature');
    expect(prismaMock.billingWebhookEvent.create).not.toHaveBeenCalled();
    expect(txMock.merchantSubscription.update).not.toHaveBeenCalled();
  });

  it('claims an event once and updates only the server-matched external subscription', async () => {
    const result = await processBillingWebhook(provider(event), '{"event":1}', new Headers());

    expect(result).toEqual({ duplicate: false, processed: true });
    expect(txMock.merchantSubscription.findUnique).toHaveBeenCalledWith({
      where: { externalSubscriptionId: 'sub_1' }, select: { id: true, merchantId: true },
    });
    expect(txMock.merchantSubscription.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'subscription_1' }, data: expect.objectContaining({ status: 'ACTIVE', billingProvider: 'stripe' }),
    }));
    expect(txMock.merchantSubscriptionEvent.create).toHaveBeenCalledOnce();
  });

  it('treats an already-claimed event as an idempotent duplicate', async () => {
    prismaMock.billingWebhookEvent.create.mockRejectedValue({ code: 'P2002' });
    prismaMock.billingWebhookEvent.updateMany.mockResolvedValue({ count: 0 });

    await expect(processBillingWebhook(provider(event), '{"event":1}', new Headers()))
      .resolves.toEqual({ duplicate: true, processed: false });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
