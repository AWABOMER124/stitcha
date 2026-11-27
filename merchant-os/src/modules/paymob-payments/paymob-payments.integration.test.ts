import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import prisma from '@/lib/db/prisma';
import { encryptSecret } from '@/lib/crypto/secret';
import { paymobSignatureText } from '@/services/payment-gateways/paymob.gateway';
import { processPaymobWebhook, prepaidPeriodEnd, sarMinor, createPaymobSubscriptionCheckout } from './paymob-payments.service';
import { reconcilePaymobFee } from './paymob-fees.service';
import { placeOrder } from '@/modules/storefront/services/storefront.service';
import { placeOrderSchema } from '@/modules/storefront/schemas/storefront.schemas';
import { quotePlatformDelivery, acceptDeliveryQuote } from '@/modules/delivery-partners/services/delivery-operations.service';
import { requestPlanChange } from '@/modules/merchant-subscriptions/merchant-subscriptions.service';

if (!process.env.DATABASE_URL?.includes('/wasla_comms_test')) throw new Error('Paymob tests require the isolated wasla_comms_test database');
vi.mock('@/modules/merchant-referrals/merchant-referrals.service', () => ({ evaluateMerchantReferralInTransaction: vi.fn() }));
vi.mock('@/modules/marketer-referrals/marketer-referrals.service', () => ({ evaluateMarketerReferralInTransaction: vi.fn() }));
vi.mock('@/modules/platform-notifications/services/platform-notifications.service', () => ({ sendNotification: vi.fn().mockResolvedValue(undefined) }));
const suffix = randomUUID().slice(0, 8), hmac = 'synthetic-paymob-hmac-only';
let merchantId: string, slug: string, productId: string, partnerId: string, sequence = Math.floor(Math.random() * 1_000_000) + 8000000;
const attempts: string[] = [];
beforeAll(async () => {
  process.env.SECRETS_ENCRYPTION_KEY = 'isolated-paymob-synthetic-only';
  await prisma.paymobSettings.upsert({ where: { id: 'SA' }, update: { enabled: false, mode: 'LIVE', integrationIds: [6741], publicKey: 'ksa_pk_live_synthetic', secretKeyEncrypted: encryptSecret('synthetic-secret-only'), apiKeyEncrypted: encryptSecret('synthetic-api-only'), hmacEncrypted: encryptSecret(hmac) },
    create: { id: 'SA', enabled: false, mode: 'LIVE', integrationIds: [6741], publicKey: 'ksa_pk_live_synthetic', secretKeyEncrypted: encryptSecret('synthetic-secret-only'), apiKeyEncrypted: encryptSecret('synthetic-api-only'), hmacEncrypted: encryptSecret(hmac) } });
  const merchant = await prisma.merchant.create({ data: { name: 'Synthetic Saudi store', slug: `paymob-${suffix}`, businessType: 'RETAIL', status: 'ACTIVE', subscriptionMarket: 'SA', currency: 'SAR', branches: { create: { name: 'Synthetic branch', address: 'عنوان اختبار الرياض', phone: '+966500000000', isMain: true } } } });
  merchantId = merchant.id; slug = merchant.slug;
  const category = await prisma.category.create({ data: { merchantId, name: 'Synthetic', slug: `paymob-${suffix}` } });
  productId = (await prisma.product.create({ data: { merchantId, categoryId: category.id, name: 'Synthetic product', slug: `paymob-${suffix}`, price: 100 } })).id;
  partnerId = (await prisma.deliveryPartner.create({ data: { name: 'Synthetic Saudi carrier', slug: `paymob-${suffix}`, isActive: true, status: 'ACTIVE', appStatus: 'PUBLISHED', supportsCod: true,
    providerConfig: { create: { providerKey: 'TEST_SIMULATOR', market: 'SA', isActive: true } }, merchantConnections: { create: { merchantId, isActive: true } } } })).id;
  const area = await prisma.deliveryPartnerServiceArea.create({ data: { partnerId, name: 'الرياض — كل المدن والأحياء', code: 'SA-RIYADH', state: 'الرياض', allCities: true, allDistricts: true } });
  await prisma.deliveryPartnerPricingRule.create({ data: { partnerId, serviceAreaId: area.id, baseFee: 20, perKmFee: 0, currency: 'SAR' } });
});
afterAll(async () => {
  vi.unstubAllGlobals();
  if (!merchantId) return;
  const orders = await prisma.order.findMany({ where: { merchantId }, select: { id: true, platformShipment: { select: { id: true } } } });
  const ids = [merchantId, ...orders.flatMap(row => [row.id, ...(row.platformShipment ? [row.platformShipment.id] : [])])];
  await prisma.outboxJob.deleteMany({ where: { OR: ids.map(id => ({ idempotencyKey: { contains: id } })) } });
  await prisma.onlineCheckoutAttempt.deleteMany({ where: { merchantId } });
});
async function order() {
  const created = await placeOrder(slug, placeOrderSchema.parse({ customerName: 'Synthetic customer', customerPhone: '+966500000000', deliveryMethod: 'MERCHANT_DELIVERY', paymentMethod: 'CASH', customerState: 'الرياض', customerCity: 'الرياض', customerDistrict: 'العليا', customerAddress: 'شارع اختبار، مبنى 1', deliveryAddressVersion: '3', items: [{ productId, quantity: 1 }] }));
  return created.orderId;
}
async function checkout(referenceId: string, purpose = 'ORDER', amountMinor = 10000) {
  const number = ++sequence;
  const attempt = await prisma.onlineCheckoutAttempt.create({ data: { merchantId, provider: 'paymob', purpose, referenceId, amountMinor, currency: 'SAR', mode: 'LIVE', status: 'READY', providerIntentionId: `synthetic-${suffix}-${number}`, providerOrderId: String(number), integrationIds: [6741], expiresAt: new Date(Date.now() + 3600000) } }); attempts.push(attempt.id);
  const transaction = { amount_cents: amountMinor, created_at: '2026-11-20T00:00:00Z', currency: 'SAR', error_occured: false, has_parent_transaction: false, id: number + 10000000,
    integration_id: 6741, is_3d_secure: true, is_auth: false, is_capture: false, is_refunded: false, is_standalone_payment: true, is_voided: false,
    order: { id: number }, owner: 4705, pending: false, source_data: { pan: '2346', sub_type: 'MasterCard', type: 'card' }, success: true, is_live: true, refunded_amount_cents: 0 };
  return { attempt, transaction };
}
async function callback(transaction: Record<string, unknown>, remote = transaction) {
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL) => String(url).includes('/api/auth/tokens') ? new Response(JSON.stringify({ token: 'synthetic-token-only' })) : new Response(JSON.stringify(remote))));
  const raw = JSON.stringify({ type: 'TRANSACTION', obj: transaction });
  return processPaymobWebhook(raw, createHmac('sha512', hmac).update(paymobSignatureText(transaction)).digest('hex'));
}
describe('Verified Saudi payment and carrier lifecycle', () => {
  it('recovers a paid attempt after an upstream response was lost using only the authenticated inquiry reference', async () => {
    const id = await order();
    await prisma.payment.update({ where: { orderId: id }, data: { method: 'ONLINE' } });
    await prisma.order.update({ where: { id }, data: { paymentMethod: 'ONLINE' } });
    const { attempt, transaction } = await checkout(id);
    await prisma.onlineCheckoutAttempt.update({ where: { id: attempt.id }, data: { status: 'UNKNOWN', providerIntentionId: null, providerOrderId: null } });
    const verified = { ...transaction, order: { ...transaction.order, merchant_order_id: attempt.id } };
    await callback(transaction, verified);
    const saved = await prisma.onlineCheckoutAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    expect(saved.status).toBe('SUCCEEDED');
    expect(saved.providerOrderId).toBe(String(transaction.order.id));
    await callback(transaction, verified);
    expect(await prisma.merchantSettlementEntry.count({ where: { orderId: id, type: 'ONLINE_PAYMENT' } })).toBe(1);
  });
  it('does not recover an unknown attempt from an unsigned callback reference', async () => {
    const id = await order();
    const { attempt, transaction } = await checkout(id);
    await prisma.onlineCheckoutAttempt.update({ where: { id: attempt.id }, data: { status: 'UNKNOWN', providerIntentionId: null, providerOrderId: null } });
    await expect(callback({ ...transaction, order: { ...transaction.order, merchant_order_id: attempt.id } }, transaction)).rejects.toThrow();
    expect((await prisma.onlineCheckoutAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).status).toBe('UNKNOWN');
    expect((await prisma.payment.findUniqueOrThrow({ where: { orderId: id } })).status).toBe('PENDING');
  });

  it('does not add merchant logistics charges to the customer invoice; COD commission excludes customer delivery charges', async () => {
    const id = await order();
    await prisma.order.update({ where: { id }, data: { deliveryFee: 35, total: 135, payment: { update: { amount: 135 } }, delivery: { update: { fee: 35 } } } });
    const quotes = await quotePlatformDelivery(id); expect(quotes).toHaveLength(1); expect(Number(quotes[0].fee)).toBe(20);
    const shipment = await acceptDeliveryQuote(id, quotes[0].id);
    expect(Number(shipment.collectionFee)).toBe(2); expect(shipment.feePayer).toBe('MERCHANT');
    const saved = await prisma.order.findUniqueOrThrow({ where: { id }, include: { payment: true, platformShipment: { include: { codCollection: true } } } });
    expect(Number(saved.total)).toBe(135); expect(Number(saved.payment!.amount)).toBe(135); expect(Number(saved.platformShipment!.codCollection!.expectedAmount)).toBe(135);
  });
  it('ignores unsigned success, rejects a mismatched inquiry and books one payment despite concurrent duplicate callbacks', async () => {
    const id = await order(); await prisma.payment.update({ where: { orderId: id }, data: { method: 'ONLINE' } }); await prisma.order.update({ where: { id }, data: { paymentMethod: 'ONLINE' } });
    const { transaction } = await checkout(id);
    await expect(processPaymobWebhook(JSON.stringify({ type: 'TRANSACTION', obj: transaction }), '0'.repeat(128))).rejects.toThrow();
    await expect(callback(transaction, { ...transaction, amount_cents: 9999 })).rejects.toThrow('does not match');
    expect((await prisma.payment.findUniqueOrThrow({ where: { orderId: id } })).status).toBe('PENDING');
    await Promise.all([callback(transaction), callback(transaction)]);
    expect((await prisma.payment.findUniqueOrThrow({ where: { orderId: id } })).status).toBe('COMPLETED');
    expect(await prisma.merchantSettlementEntry.count({ where: { orderId: id, type: 'ONLINE_PAYMENT' } })).toBe(1);
    const entry = await prisma.merchantSettlementEntry.findFirstOrThrow({ where: { orderId: id } });
    expect(entry.status).toBe('HELD'); expect(entry.feeReconciled).toBe(false); expect(Number(entry.platformFee)).toBe(0);
    await reconcilePaymobFee({ entryId: entry.id, feeMinor: 325, statementReference: 'synthetic-statement', actorId: 'synthetic-finance' });
    expect(Number((await prisma.merchantSettlementEntry.findUniqueOrThrow({ where: { id: entry.id } })).netAmount)).toBe(96.75);
    await expect(reconcilePaymobFee({ entryId: entry.id, feeMinor: 325, statementReference: 'synthetic-statement', actorId: 'synthetic-finance' })).rejects.toThrow();
    const quotes = await quotePlatformDelivery(id); const shipment = await acceptDeliveryQuote(id, quotes[0].id);
    expect(Number(shipment.collectionFee)).toBe(0); expect(await prisma.codCollection.count({ where: { shipmentId: shipment.id } })).toBe(0);
    await callback({ ...transaction, is_refunded: true, refunded_amount_cents: 4000 });
    await callback({ ...transaction, is_refunded: true, refunded_amount_cents: 10000 });
    await callback({ ...transaction, is_refunded: true, refunded_amount_cents: 10000 });
    const refunds = await prisma.merchantSettlementEntry.findMany({ where: { orderId: id, type: 'REFUND' } });
    expect(refunds).toHaveLength(2); expect(refunds.reduce((sum, row) => sum + Number(row.netAmount), 0)).toBe(-100);
    expect((await prisma.payment.findUniqueOrThrow({ where: { orderId: id } })).status).toBe('REFUNDED');
  });
  it('keeps a late payment for a cancelled order blocked even after fee reconciliation', async () => {
    const id = await order(); await prisma.order.update({ where: { id }, data: { status: 'CANCELLED', paymentMethod: 'ONLINE', payment: { update: { method: 'ONLINE' } } } });
    const { transaction } = await checkout(id); await callback(transaction);
    const entry = await prisma.merchantSettlementEntry.findFirstOrThrow({ where: { orderId: id } });
    await prisma.merchantSettlementEntry.update({ where: { id: entry.id }, data: { availableAt: new Date(0) } });
    await reconcilePaymobFee({ entryId: entry.id, feeMinor: 300, statementReference: 'synthetic-late-payment', actorId: 'synthetic-finance' });
    expect(await prisma.merchantSettlementEntry.findUnique({ where: { id: entry.id } })).toMatchObject({ payoutBlocked: true, status: 'HELD' });
    await callback({ ...transaction, is_refunded: true, refunded_amount_cents: 10000 });
    const entries = await prisma.merchantSettlementEntry.findMany({ where: { orderId: id } });
    expect(entries.every(row => !row.payoutBlocked)).toBe(true);
    expect(entries.reduce((sum, row) => sum + Number(row.netAmount), 0)).toBe(-3);
  });
  it('activates a locked annual Saudi subscription and deduplicates full refunds', async () => {
    const request = await requestPlanChange(merchantId, 'SA_PRO', undefined, 'YEARLY');
    const { transaction } = await checkout(request.id, 'SUBSCRIPTION', 99000);
    await callback(transaction);
    const subscription = await prisma.merchantSubscription.findUniqueOrThrow({ where: { merchantId } });
    expect(subscription.billingProvider).toBe('paymob'); expect(subscription.billingInterval).toBe('YEARLY'); expect(subscription.currencyOverride).toBe('SAR'); expect(Number(subscription.priceOverride)).toBe(990);
    expect(subscription.currentPeriodEndsAt!.getUTCFullYear()).toBe(subscription.currentPeriodStartsAt!.getUTCFullYear() + 1);
    await callback({ ...transaction, is_refunded: true, refunded_amount_cents: 99000 });
    await callback({ ...transaction, is_refunded: true, refunded_amount_cents: 99000 });
    expect((await prisma.merchantSubscription.findUniqueOrThrow({ where: { merchantId } })).status).toBe('CANCELLED');
  });
  it('clamps prepaid periods at month ends and rejects fractional halalas', () => {
    expect(prepaidPeriodEnd(new Date('2028-01-31T12:00:00Z'), 'MONTHLY').toISOString()).toBe('2028-02-29T12:00:00.000Z');
    expect(prepaidPeriodEnd(new Date('2028-02-29T12:00:00Z'), 'YEARLY').toISOString()).toBe('2029-02-28T12:00:00.000Z');
    expect(() => sarMinor(1.001)).toThrow();
  });
  it('preserves an already-paid period when an early renewal is fully refunded', async () => {
    const firstRequest = await requestPlanChange(merchantId, 'SA_GROWTH');
    const first = await checkout(firstRequest.id, 'SUBSCRIPTION', 4900); await callback(first.transaction);
    const paid = await prisma.merchantSubscription.findUniqueOrThrow({ where: { merchantId } });
    const renewalRequest = await requestPlanChange(merchantId, 'SA_GROWTH');
    expect(renewalRequest.id).not.toBe(firstRequest.id);
    const renewal = await checkout(renewalRequest.id, 'SUBSCRIPTION', 4900); await callback(renewal.transaction);
    expect((await prisma.merchantSubscription.findUniqueOrThrow({ where: { merchantId } })).currentPeriodEndsAt! > paid.currentPeriodEndsAt!).toBe(true);
    await callback({ ...renewal.transaction, is_refunded: true, refunded_amount_cents: 4900 });
    const restored = await prisma.merchantSubscription.findUniqueOrThrow({ where: { merchantId } });
    expect(restored.status).toBe('ACTIVE'); expect(restored.currentPeriodEndsAt).toEqual(paid.currentPeriodEndsAt);
    await callback({ ...first.transaction, is_refunded: true, refunded_amount_cents: 4900 });
    expect((await prisma.merchantSubscription.findUniqueOrThrow({ where: { merchantId } })).status).toBe('CANCELLED');
  });
  it('reuses a ready hosted checkout and refuses to create another intention after an ambiguous timeout', async () => {
    await prisma.merchant.update({ where: { id: merchantId }, data: { phone: '+966500000000' } });
    await prisma.paymobSettings.update({ where: { id: 'SA' }, data: { enabled: true } });
    await requestPlanChange(merchantId, 'SA_GROWTH');
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: `synthetic-intent-${suffix}`, intention_order_id: ++sequence, client_secret: 'synthetic-checkout-secret' }), { status: 201 }));
    vi.stubGlobal('fetch', fetcher);
    const first = await createPaymobSubscriptionCheckout({ merchantId, origin: 'https://synthetic.example' });
    expect(first.provider).toBe('PAYMOB');
    expect(await createPaymobSubscriptionCheckout({ merchantId, origin: 'https://synthetic.example' })).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(requestPlanChange(merchantId, 'SA_BUSINESS')).rejects.toThrow('قيد المتابعة');
    expect(fetcher).toHaveBeenCalledTimes(1);
    // Explicit isolated fixture transition: another selection must not bypass
    // a payable checkout. The timeout scenario starts only after its closure.
    await prisma.onlineCheckoutAttempt.updateMany({ where: { merchantId, purpose: 'SUBSCRIPTION', status: 'READY' }, data: { status: 'FAILED' } });
    const next = await requestPlanChange(merchantId, 'SA_BUSINESS');
    fetcher.mockReset().mockRejectedValue(new Error('synthetic timeout'));
    await expect(createPaymobSubscriptionCheckout({ merchantId, origin: 'https://synthetic.example' })).rejects.toThrow('لم تتأكد');
    await expect(createPaymobSubscriptionCheckout({ merchantId, origin: 'https://synthetic.example' })).rejects.toThrow('محاولة دفع');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await prisma.onlineCheckoutAttempt.findFirst({ where: { referenceId: next.id } })).toMatchObject({ status: 'UNKNOWN' });
    await prisma.paymobSettings.update({ where: { id: 'SA' }, data: { enabled: false } });
  });
});
