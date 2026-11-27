import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
import prisma from '@/lib/db/prisma';
import { getMerchantSubscriptionMarket, listPublicPlans, requestPlanChange } from './merchant-subscriptions.service';
import { createSubscriptionStripeCheckout, processStripeWebhook, reconcileStripeSubscriptionAttempt } from '@/modules/stripe-payments/stripe-payments.service';

if (!process.env.DATABASE_URL?.includes('/wasla_comms_test')) throw new Error('Market tests require the isolated wasla_comms_test database');
const gateway = vi.hoisted(() => ({ createCheckoutSession: vi.fn(), constructWebhookEvent: vi.fn(), retrieveSubscription: vi.fn(), retrieveCheckoutSession: vi.fn() }));
vi.mock('@/services/payment-gateways', () => ({ createStripeGatewayFromEnv: () => gateway }));
vi.mock('@/modules/platform-notifications/services/platform-notifications.service', () => ({ sendNotification: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/modules/merchant-referrals/merchant-referrals.service', () => ({ evaluateMerchantReferralInTransaction: vi.fn() }));
vi.mock('@/modules/marketer-referrals/marketer-referrals.service', () => ({ evaluateMarketerReferralInTransaction: vi.fn() }));
const suffix = randomUUID().slice(0, 8);
const merchants: string[] = [];
async function merchant(market?: string) {
  const created = await prisma.merchant.create({ data: { name: 'Synthetic market test', slug: `market-${suffix}-${merchants.length}`, businessType: 'RETAIL', ...(market ? { subscriptionMarket: market } : {}) } });
  merchants.push(created.id);
  return created.id;
}
afterAll(async () => { await prisma.onlineCheckoutAttempt.deleteMany({ where: { merchantId: { in: merchants } } }); await prisma.merchant.deleteMany({ where: { id: { in: merchants } } }); });

describe('Saudi catalog and actual billing records', () => {
  it('allows a new reference only after an authenticated Stripe session is expired and unpaid', async () => {
    const id = await merchant();
    const selected = await requestPlanChange(id, 'GROWTH', undefined, 'MONTHLY', { notifyPlatform: false });
    const sessionId = `cs_test_expired_${suffix}`;
    gateway.createCheckoutSession.mockResolvedValue({ sessionId, checkoutUrl: 'https://synthetic.example/checkout' });
    await createSubscriptionStripeCheckout({ merchantId: id, planChangeRequestId: selected.id, origin: 'https://synthetic.example' });
    gateway.retrieveCheckoutSession.mockResolvedValue({ id: sessionId, status: 'open', payment_status: 'unpaid', amount_total: Math.round(Number(selected.quotedAmount) * 100), currency: selected.quotedCurrency!.toLowerCase(), metadata: { kind: 'SUBSCRIPTION', merchant_id: id, plan_change_request_id: selected.id } });
    await reconcileStripeSubscriptionAttempt(id, selected.id);
    expect((await prisma.onlineCheckoutAttempt.findFirstOrThrow({ where: { merchantId: id } })).status).toBe('READY');
    gateway.retrieveCheckoutSession.mockResolvedValue({ ...(await gateway.retrieveCheckoutSession()), status: 'expired' });
    await reconcileStripeSubscriptionAttempt(id, selected.id);
    expect((await prisma.onlineCheckoutAttempt.findFirstOrThrow({ where: { merchantId: id } })).status).toBe('EXPIRED');
    expect(await prisma.merchantSubscriptionPayment.count({ where: { merchantId: id } })).toBe(0);
  });
  it('does not send a historical Saudi quote to Stripe after a market change', async () => {
    const id = await merchant('SA');
    const selected = await requestPlanChange(id, 'SA_GROWTH', undefined, 'MONTHLY', { notifyPlatform: false });
    await prisma.merchant.update({ where: { id }, data: { subscriptionMarket: 'SD' } });
    gateway.createCheckoutSession.mockClear();
    await expect(createSubscriptionStripeCheckout({ merchantId: id, planChangeRequestId: selected.id, origin: 'https://synthetic.example' })).rejects.toThrow('business market');
    expect(gateway.createCheckoutSession).not.toHaveBeenCalled();
  });
  it('pays the selected quote even after a newer selection, and rejects another merchant quote', async () => {
    const id = await merchant();
    const selected = await requestPlanChange(id, 'GROWTH', undefined, 'MONTHLY', { notifyPlatform: false });
    await requestPlanChange(id, 'PRO', undefined, 'MONTHLY', { notifyPlatform: false });
    gateway.createCheckoutSession.mockClear().mockResolvedValue({ sessionId: `cs_test_selected_${suffix}`, checkoutUrl: 'https://synthetic.example/checkout' });
    await createSubscriptionStripeCheckout({ merchantId: id, planChangeRequestId: selected.id, origin: 'https://synthetic.example' });
    expect(gateway.createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({ internalReference: selected.id, amount: Number(selected.quotedAmount), metadata: expect.objectContaining({ plan_change_request_id: selected.id, merchant_id: id }) }));
    gateway.createCheckoutSession.mockClear();
    await expect(createSubscriptionStripeCheckout({ merchantId: await merchant(), planChangeRequestId: selected.id, origin: 'https://synthetic.example' })).rejects.toThrow('paid plan');
    expect(gateway.createCheckoutSession).not.toHaveBeenCalled();
  });
  it('isolates approved Saudi prices and quotas from the existing Sudan catalog', async () => {
    const sa = await listPublicPlans('SA');
    expect(sa.filter(p => p.code !== 'FREE').map(p => [p.code, p.monthlyPrice, p.yearlyPrice, p.currency])).toEqual([
      ['SA_GROWTH', 49, 490, 'SAR'], ['SA_PRO', 99, 990, 'SAR'], ['SA_BUSINESS', 199, 1990, 'SAR'],
    ]);
    expect(sa.find(p => p.code === 'SA_BUSINESS')!.entitlements.maxActiveProducts).toBe(5000);
    expect((await listPublicPlans('SD')).some(p => p.code.startsWith('SA_'))).toBe(false);
    expect(await prisma.merchantPlan.count({ where: { code: { startsWith: 'SA_' }, isPublic: true } })).toBe(0);
    expect(await getMerchantSubscriptionMarket(await merchant())).toBe('SD');
    expect(await getMerchantSubscriptionMarket(await merchant('SA'))).toBe('SA');
  });
  it('rejects choosing a price from another market on the server', async () => {
    await expect(requestPlanChange(await merchant(), 'SA_PRO')).rejects.toThrow('سوق');
    await expect(requestPlanChange(await merchant('SA'), 'PRO')).rejects.toThrow('سوق');
  });
  it('locks monthly SAR pricing without changing storefront currency', async () => {
    const id = await merchant('SA');
    const request = await requestPlanChange(id, 'SA_GROWTH');
    expect(Number(request.quotedAmount)).toBe(49);
    expect(request.quotedCurrency).toBe('SAR');
    expect(request.billingInterval).toBe('MONTHLY');
    expect((await prisma.merchant.findUniqueOrThrow({ where: { id } })).currency).toBe('SDG');
  });
  it('keeps the annual quote through a catalog edit, rejects a mismatched payment and activates a full year', async () => {
    const id = await merchant('SA');
    const request = await requestPlanChange(id, 'SA_PRO', undefined, 'YEARLY');
    await prisma.merchantPlan.update({ where: { code: 'SA_PRO' }, data: { yearlyPrice: 1200 } });
    try {
      gateway.createCheckoutSession.mockResolvedValue({ sessionId: `cs_${suffix}`, checkoutUrl: 'https://checkout.stripe.com/synthetic' });
      await expect(createSubscriptionStripeCheckout({ merchantId: id, origin: 'https://synthetic.example' })).rejects.toThrow('Paymob');
      expect(gateway.createCheckoutSession).not.toHaveBeenCalled();
      // A session created before the market cutover must still reconcile safely.
      gateway.retrieveSubscription.mockResolvedValue({ status: 'active', currentPeriodStart: new Date('2026-11-19T00:00:00Z'), currentPeriodEnd: new Date('2027-11-19T00:00:00Z'), cancelAtPeriodEnd: false });
      const event = { id: `evt_${suffix}`, type: 'checkout.session.completed', data: { object: { id: `cs_${suffix}`, subscription: `sub_${suffix}`, payment_status: 'paid', amount_total: 9900, currency: 'sar', metadata: { kind: 'SUBSCRIPTION', merchant_id: id, plan_change_request_id: request.id } } } };
      gateway.constructWebhookEvent.mockImplementation(() => event);
      await expect(processStripeWebhook('synthetic', null)).rejects.toThrow('locked quote');
      expect(await prisma.merchantSubscription.findUnique({ where: { merchantId: id } })).toBeNull();
      event.data.object.amount_total = 99000;
      await expect(processStripeWebhook('synthetic', null)).resolves.toMatchObject({ processed: true });
      const subscription = await prisma.merchantSubscription.findUniqueOrThrow({ where: { merchantId: id } });
      expect(subscription.billingInterval).toBe('YEARLY');
      expect(subscription.currencyOverride).toBe('SAR');
      expect(Number(subscription.priceOverride)).toBe(990);
      expect(subscription.currentPeriodEndsAt?.toISOString()).toBe('2027-11-19T00:00:00.000Z');
    } finally {
      await prisma.merchantPlan.update({ where: { code: 'SA_PRO' }, data: { yearlyPrice: 990 } });
    }
  });
});
