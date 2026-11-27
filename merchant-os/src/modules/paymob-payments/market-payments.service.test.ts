import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ plan: vi.fn(), eligible: vi.fn(), subscription: vi.fn(), order: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({ default: { merchant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ subscriptionMarket: 'SA', currency: 'SAR' }) } } }));
vi.mock('@/modules/merchant-subscriptions/merchant-subscriptions.service', () => ({ getMerchantPlanSnapshot: m.plan }));
vi.mock('@/modules/stripe-payments/stripe-payments.service', () => ({ isMerchantEligibleForCentralStripe: m.eligible, getStripeStatus: vi.fn(), createOrderStripeCheckout: vi.fn(), createSubscriptionStripeCheckout: vi.fn() }));
vi.mock('./paymob-settings.service', () => ({ getPaymobSettingsSummary: vi.fn().mockResolvedValue({ enabled: true, configured: true, mode: 'LIVE' }) }));
vi.mock('./paymob-payments.service', () => ({ createPaymobSubscriptionCheckout: m.subscription, createPaymobOrderCheckout: m.order }));
const { getMerchantOnlinePaymentStatus, createMarketOrderCheckout, createMarketSubscriptionCheckout } = await import('./market-payments.service');
describe('free-tier payment visibility and checkout', () => {
  beforeEach(() => { m.plan.mockResolvedValue({ code: 'FREE' }); m.eligible.mockResolvedValue(true); m.order.mockReset(); m.subscription.mockReset().mockResolvedValue({ checkoutUrl: 'https://synthetic.example/payment' }); });
  it('hides online payment even if identity eligibility is true', async () => { expect(await getMerchantOnlinePaymentStatus('m')).toMatchObject({ planEligible: false, ready: false }); });
  it('rejects a direct order-payment call before contacting the provider', async () => { await expect(createMarketOrderCheckout({ merchantId: 'm', orderId: 'order', origin: 'https://synthetic.example' })).rejects.toThrow(); expect(m.order).not.toHaveBeenCalled(); });
  it('allows a free merchant to pay for a subscription upgrade', async () => { await expect(createMarketSubscriptionCheckout({ merchantId: 'm', planChangeRequestId: 'quote', origin: 'https://synthetic.example' })).resolves.toHaveProperty('checkoutUrl'); expect(m.subscription).toHaveBeenCalledOnce(); });
  it('preserves online payments for eligible paid merchants', async () => { m.plan.mockResolvedValue({ code: 'SA_GROWTH' }); expect(await getMerchantOnlinePaymentStatus('m')).toMatchObject({ planEligible: true, ready: true }); });
});
