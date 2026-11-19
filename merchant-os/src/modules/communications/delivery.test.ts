import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OutboxJob } from '@prisma/client';
const mocks = vi.hoisted(() => ({
  db: { communicationDelivery: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() }, communicationCampaign: { updateMany: vi.fn() }, communicationRule: { findUnique: vi.fn() } },
  recipient: vi.fn(), email: vi.fn(), whatsapp: vi.fn(),
}));
vi.mock('@/lib/db/prisma', () => ({ default: mocks.db }));
vi.mock('@/services/notifications/providers/email.provider', () => ({ EmailProvider: class { send = mocks.email; } }));
vi.mock('@/services/notifications/providers/whatsapp.provider', () => ({ WhatsAppProvider: class { send = mocks.whatsapp; } }));
vi.mock('./service', () => ({ DELIVERY_TOPIC: 'communication.delivery', recipientStillEligible: mocks.recipient, unsubscribeUrl: () => 'https://wassla-sd.shop/notifications/unsubscribe/test' }));
import { classifyDeliveryError, deliverCommunication } from './delivery';

const job = { attempts: 1, maxAttempts: 5 } as OutboxJob;
function delivery(overrides = {}) { return { id: 'd1', userId: 'u1', entityId: 'store', campaignId: 'c1', channel: 'EMAIL', recipient: 'test@example.com', status: 'QUEUED', title: 'hello', body: 'body', campaign: { id: 'c1', status: 'QUEUED', audience: 'MERCHANT', purpose: 'SERVICE', filters: {}, ruleId: null }, ...overrides }; }
beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.communicationDelivery.findUnique.mockResolvedValue(delivery());
  mocks.db.communicationDelivery.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.communicationDelivery.update.mockResolvedValue({});
  mocks.db.communicationDelivery.count.mockResolvedValue(0);
  mocks.db.communicationCampaign.updateMany.mockResolvedValue({ count: 1 });
  mocks.recipient.mockResolvedValue({ id: 'u1', entityId: 'store', merchantId: 'store', name: 'test', businessName: 'test', email: 'test@example.com', phone: '+966500000000', preference: null });
  mocks.email.mockResolvedValue(undefined); mocks.whatsapp.mockResolvedValue(undefined);
});
describe('Durable communication delivery', () => {
  it('never sends a cancelled campaign', async () => {
    mocks.db.communicationDelivery.findUnique.mockResolvedValue(delivery({ campaign: { ...delivery().campaign, status: 'CANCELLED' } }));
    await deliverCommunication({ deliveryId: 'd1' }, job); expect(mocks.email).not.toHaveBeenCalled();
  });
  it('rechecks resolved conditions and does not send to a changed contact address', async () => {
    mocks.recipient.mockResolvedValue(null); await deliverCommunication({ deliveryId: 'd1' }, job);
    expect(mocks.db.communicationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SKIPPED' }) }));
    expect(mocks.email).not.toHaveBeenCalled();
    mocks.recipient.mockResolvedValue({ email: 'new@example.com', preference: null }); await deliverCommunication({ deliveryId: 'd1' }, job);
    expect(mocks.email).not.toHaveBeenCalled();
  });
  it('honors unsubscribe even after the campaign was queued', async () => {
    mocks.db.communicationDelivery.findUnique.mockResolvedValue(delivery({ campaign: { ...delivery().campaign, purpose: 'MARKETING' } }));
    mocks.recipient.mockResolvedValue({ email: 'test@example.com', preference: { marketing: false, email: true } });
    await deliverCommunication({ deliveryId: 'd1' }, job); expect(mocks.email).not.toHaveBeenCalled();
  });
  it('stops a claimed delivery if cancellation won the race', async () => {
    mocks.db.communicationDelivery.updateMany.mockResolvedValue({ count: 0 });
    await deliverCommunication({ deliveryId: 'd1' }, job); expect(mocks.email).not.toHaveBeenCalled();
  });
  it('gives email a stable idempotency key and records provider acceptance honestly', async () => {
    await deliverCommunication({ deliveryId: 'd1' }, job);
    expect(mocks.email).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ idempotencyKey: 'wasla-communication-d1' }) }));
    expect(mocks.db.communicationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ACCEPTED' }) }));
  });
  it('does not send an already accepted message again', async () => {
    mocks.db.communicationDelivery.findUnique.mockResolvedValue(delivery({ status: 'ACCEPTED' }));
    await deliverCommunication({ deliveryId: 'd1' }, job); expect(mocks.email).not.toHaveBeenCalled();
  });
  it('stores in-app messages without an external provider call', async () => {
    mocks.db.communicationDelivery.findUnique.mockResolvedValue(delivery({ channel: 'IN_APP', recipient: 'u1' }));
    await deliverCommunication({ deliveryId: 'd1' }, job);
    expect(mocks.email).not.toHaveBeenCalled(); expect(mocks.whatsapp).not.toHaveBeenCalled();
    expect(mocks.db.communicationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'DELIVERED' }) }));
  });
  it('holds uncertain WhatsApp results and recovered in-flight claims for review', async () => {
    mocks.db.communicationDelivery.findUnique.mockResolvedValue(delivery({ channel: 'WHATSAPP', recipient: '+966500000000' }));
    mocks.whatsapp.mockRejectedValue(new Error('fetch failed'));
    await deliverCommunication({ deliveryId: 'd1' }, job);
    expect(mocks.db.communicationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'UNKNOWN' }) }));
    mocks.whatsapp.mockClear(); mocks.db.communicationDelivery.findUnique.mockResolvedValue(delivery({ channel: 'WHATSAPP', status: 'SENDING' }));
    await deliverCommunication({ deliveryId: 'd1' }, job); expect(mocks.whatsapp).not.toHaveBeenCalled();
  });
  it('retries transient errors, but never stores provider details or recipient data in errors', async () => {
    mocks.email.mockRejectedValue(new Error('rejected (503): private test@example.com details'));
    await expect(deliverCommunication({ deliveryId: 'd1' }, job)).rejects.toThrow('المزوّد');
    expect(mocks.db.communicationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'RETRYING', lastError: expect.not.stringContaining('test@example.com') } }));
    expect(classifyDeliveryError(new Error('rejected (401)')).permanent).toBe(true);
  });
  it('does not turn a database failure after sending into a second WhatsApp attempt', async () => {
    mocks.db.communicationDelivery.findUnique.mockResolvedValue(delivery({ channel: 'WHATSAPP', recipient: '+966500000000' }));
    mocks.db.communicationDelivery.update.mockRejectedValue(new Error('database unavailable'));
    await expect(deliverCommunication({ deliveryId: 'd1' }, job)).rejects.toThrow('database unavailable');
    expect(mocks.whatsapp).toHaveBeenCalledTimes(1);
    expect(mocks.db.communicationDelivery.update).toHaveBeenCalledTimes(1);
  });
});
