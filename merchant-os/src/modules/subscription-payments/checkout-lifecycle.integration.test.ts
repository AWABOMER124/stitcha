import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '@/lib/db/prisma';
import { encryptSecret } from '@/lib/crypto/secret';
import { reconcilePaymobSubscriptionAttempt } from '@/modules/paymob-payments/paymob-payments.service';
import { getSubscriptionCheckoutStatus, retrySubscriptionCheckout } from './checkout-status.service';
import { submitManualSubscriptionPayment, reviewSubscriptionPayment } from './subscription-payments.service';

if (!process.env.DATABASE_URL?.includes('/wasla_comms_test')) throw new Error('Lifecycle tests require an isolated database');
vi.mock('@/services/storage', () => ({ privateStorageService: { upload: vi.fn().mockResolvedValue('synthetic-private-receipt'), delete: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('@/modules/merchant-referrals/merchant-referrals.service', () => ({ evaluateMerchantReferralInTransaction: vi.fn() }));
vi.mock('@/modules/marketer-referrals/marketer-referrals.service', () => ({ evaluateMarketerReferralInTransaction: vi.fn() }));
vi.mock('@/modules/platform-notifications/services/platform-notifications.service', () => ({ sendNotification: vi.fn().mockResolvedValue(undefined) }));
const ids: string[] = [];
const suffix = randomUUID().slice(0, 8);
let sequence = 0;
beforeAll(async () => {
  process.env.SECRETS_ENCRYPTION_KEY = 'synthetic-lifecycle-only';
  await prisma.paymobSettings.upsert({ where: { id: 'SA' }, update: { enabled: false, mode: 'LIVE', integrationIds: [6741], publicKey: 'synthetic-public', secretKeyEncrypted: encryptSecret('synthetic-secret'), apiKeyEncrypted: encryptSecret('synthetic-api'), hmacEncrypted: encryptSecret('synthetic-hmac') }, create: { id: 'SA', enabled: false, mode: 'LIVE', integrationIds: [6741], publicKey: 'synthetic-public', secretKeyEncrypted: encryptSecret('synthetic-secret'), apiKeyEncrypted: encryptSecret('synthetic-api'), hmacEncrypted: encryptSecret('synthetic-hmac') } });
});
afterEach(() => vi.unstubAllGlobals());
afterAll(async () => { await prisma.onlineCheckoutAttempt.deleteMany({ where: { merchantId: { in: ids } } }); });
async function fixture(status = 'UNKNOWN', delivered = false, annual = false) {
  const merchant = await prisma.merchant.create({ data: { name: 'Synthetic lifecycle', slug: `lifecycle-${suffix}-${++sequence}`, businessType: 'RETAIL', subscriptionMarket: 'SA', currency: 'SAR' } }); ids.push(merchant.id);
  const plan = await prisma.merchantPlan.findUniqueOrThrow({ where: { code: 'SA_GROWTH' } });
  const request = await prisma.merchantPlanChangeRequest.create({ data: { merchantId: merchant.id, targetPlanId: plan.id, billingInterval: annual ? 'YEARLY' : 'MONTHLY', quotedAmount: annual ? 490 : 49, quotedCurrency: 'SAR' } });
  const number = Date.now() * 10 + sequence;
  const attempt = await prisma.onlineCheckoutAttempt.create({ data: { provider: 'paymob', merchantId: merchant.id, purpose: 'SUBSCRIPTION', referenceId: request.id, amountMinor: BigInt(annual ? 49000 : 4900), currency: 'SAR', mode: 'LIVE', status, integrationIds: [6741], expiresAt: new Date(Date.now() - 600_000), ...(delivered ? { providerOrderId: String(number), providerIntentionId: `synthetic-${number}`, checkoutSecretEncrypted: encryptSecret('synthetic-checkout') } : {}) } });
  return { merchant, request, attempt, number };
}
function inquiry(remote: unknown = null) {
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request) => String(url).includes('/api/auth/tokens') ? new Response(JSON.stringify({ token: 'synthetic-token' }), { status: 201 }) : new Response(JSON.stringify(remote ?? { detail: 'Not found' }), { status: remote ? 200 : 404 })));
}
function transaction(f: Awaited<ReturnType<typeof fixture>>, success = true) {
  return { id: f.number + 1000000000000, order: { id: f.number, merchant_order_id: f.attempt.id }, currency: 'SAR', amount_cents: Number(f.attempt.amountMinor), integration_id: 6741, owner: 1, success, pending: false, error_occured: !success, is_auth: false, has_parent_transaction: false, is_live: true, refunded_amount_cents: 0, is_refunded: false, is_voided: false };
}
describe('subscription checkout lifecycle', () => {
  it('expires only an undelivered, unidentified creation after expiry and authenticated not-found', async () => {
    const f = await fixture(); inquiry();
    await reconcilePaymobSubscriptionAttempt(f.merchant.id, f.request.id);
    expect((await prisma.onlineCheckoutAttempt.findUniqueOrThrow({ where: { id: f.attempt.id } })).status).toBe('EXPIRED');
    expect((await getSubscriptionCheckoutStatus(f.merchant.id, f.request.id)).canRetry).toBe(true);
    const retry = await retrySubscriptionCheckout(f.merchant.id, f.request.id);
    expect(retry.id).not.toBe(f.request.id);
    expect((await prisma.onlineCheckoutAttempt.findUniqueOrThrow({ where: { id: f.attempt.id } })).status).toBe('EXPIRED');
  });
  it('never treats not-found or time alone as failure for a delivered checkout', async () => {
    const f = await fixture('READY', true); inquiry();
    await reconcilePaymobSubscriptionAttempt(f.merchant.id, f.request.id);
    expect((await getSubscriptionCheckoutStatus(f.merchant.id, f.request.id)).canRetry).toBe(false);
    await expect(retrySubscriptionCheckout(f.merchant.id, f.request.id)).rejects.toThrow();
  });
  it('activates automatically from an authenticated paid inquiry and deduplicates repeats', async () => {
    const f = await fixture('READY', true); inquiry(transaction(f));
    await reconcilePaymobSubscriptionAttempt(f.merchant.id, f.request.id);
    await reconcilePaymobSubscriptionAttempt(f.merchant.id, f.request.id);
    expect((await getSubscriptionCheckoutStatus(f.merchant.id, f.request.id)).state).toBe('ACTIVE');
    expect(await prisma.merchantSubscriptionPayment.count({ where: { merchantId: f.merchant.id } })).toBe(1);
  });
  it('allows retry after a verified final decline, but not before checkout expiry', async () => {
    const f = await fixture('READY', true);
    await prisma.onlineCheckoutAttempt.update({ where: { id: f.attempt.id }, data: { expiresAt: new Date(Date.now() + 3600_000) } });
    inquiry(transaction(f, false)); await reconcilePaymobSubscriptionAttempt(f.merchant.id, f.request.id);
    expect((await getSubscriptionCheckoutStatus(f.merchant.id, f.request.id)).state).toBe('AWAITING_PAYMENT');
    await prisma.onlineCheckoutAttempt.update({ where: { id: f.attempt.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await reconcilePaymobSubscriptionAttempt(f.merchant.id, f.request.id);
    expect((await getSubscriptionCheckoutStatus(f.merchant.id, f.request.id)).state).toBe('NOT_COMPLETED');
  });
  it('rejects a paid inquiry with the wrong amount without activation', async () => {
    const f = await fixture('READY', true); inquiry({ ...transaction(f), amount_cents: 1 });
    await expect(reconcilePaymobSubscriptionAttempt(f.merchant.id, f.request.id)).rejects.toThrow('mismatch');
    expect(await prisma.merchantSubscriptionPayment.count({ where: { merchantId: f.merchant.id } })).toBe(0);
  });
  it('keeps an SAR annual transfer pending until admin approval and prevents duplicate activation', async () => {
    const f = await fixture('EXPIRED', false, true);
    const account = await prisma.platformPaymentAccount.create({ data: { label: 'Synthetic SAR transfer', accountName: 'Synthetic account', accountNumber: `SYNTHETIC-${suffix}`, channel: 'OTHER', currency: 'SAR', monthlyAmount: 0 } });
    const payment = await submitManualSubscriptionPayment(f.merchant.id, { planChangeRequestId: f.request.id, paymentAccountId: account.id, transactionRef: `SYNTHETIC-${suffix}`, senderName: 'Synthetic sender' }, { buffer: Buffer.from('synthetic-receipt'), filename: 'synthetic.jpg', mimeType: 'image/jpeg', sha256: `synthetic-${suffix}` });
    expect((await getSubscriptionCheckoutStatus(f.merchant.id, f.request.id)).state).toBe('MANUAL_REVIEW');
    expect(await prisma.merchantSubscription.count({ where: { merchantId: f.merchant.id } })).toBe(0);
    const admin = await prisma.user.create({ data: { name: 'Synthetic reviewer', email: `lifecycle-${suffix}@synthetic.example`, passwordHash: 'unused', role: 'PLATFORM_OWNER' } });
    const results = await Promise.allSettled([reviewSubscriptionPayment(payment.id, admin.id, 'VERIFY'), reviewSubscriptionPayment(payment.id, admin.id, 'VERIFY')]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const subscription = await prisma.merchantSubscription.findUniqueOrThrow({ where: { merchantId: f.merchant.id } });
    expect(subscription.billingInterval).toBe('YEARLY'); expect(subscription.currencyOverride).toBe('SAR'); expect(Number(subscription.priceOverride)).toBe(490);
    expect(subscription.currentPeriodEndsAt!.getTime() - subscription.currentPeriodStartsAt!.getTime()).toBeGreaterThan(360 * 86400_000);
    expect((await getSubscriptionCheckoutStatus(f.merchant.id, f.request.id)).state).toBe('ACTIVE');
  });
  it('does not expose another merchant payment state', async () => {
    const f = await fixture();
    await expect(getSubscriptionCheckoutStatus('another-merchant', f.request.id)).rejects.toThrow('not found');
  });
});
