import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db/prisma';
import { GET as openAffiliateLink } from '@/app/store/[slug]/affiliate/[code]/route';
import { refund } from '@/modules/payments/services/payments.service';
import { encryptSecret } from '@/lib/crypto/secret';
import {
  AFFILIATE_COOKIE,
  affiliateTokenHash,
  attachStoreAffiliateAttribution,
  createStoreAffiliate,
  createStoreAffiliateVisit,
  ensureStoreAffiliateProgram,
  qualifyStoreAffiliateCommission,
  reviewStoreAffiliateCommission,
  setStoreAffiliateStatus,
  updateStoreAffiliateProgram,
  voidStoreAffiliateAttribution,
} from '@/modules/store-affiliates/store-affiliates.service';

const db = new URL(process.env.DATABASE_URL ?? 'http://unset');
if (db.hostname !== '127.0.0.1' || db.port !== '55439' || db.pathname !== '/wasla_partner_audit') throw new Error('Dedicated local audit database required');

async function merchant() {
  const suffix = randomUUID();
  return prisma.merchant.create({ data: { name: `AFFILIATE AUDIT ${suffix}`, slug: `aff-audit-${suffix}`, businessType: 'RETAIL', status: 'ACTIVE' } });
}

async function setup(options: { rate?: number; holdDays?: number; minimumPayout?: number } = {}) {
  const store = await merchant();
  await updateStoreAffiliateProgram(store.id, {
    isActive: true,
    commissionRate: options.rate ?? 7.5,
    attributionDays: 30,
    holdDays: options.holdDays ?? 2,
    minimumPayout: options.minimumPayout ?? 0,
    currency: 'SDG',
    terms: 'Synthetic audit only',
  });
  const affiliate = await createStoreAffiliate(store.id, { name: 'Audit Marketer', phone: `+249${randomUUID().replace(/\D/g, '').padEnd(9, '1').slice(0, 9)}` });
  await prisma.storeAffiliateIdentityVerification.create({ data: { merchantId: store.id, affiliateId: affiliate.id, legalName: 'Audit Marketer', documentType: 'NATIONAL_ID', documentNumberEncrypted: encryptSecret('AUDIT12345'), expiresAt: new Date('2035-01-01'), status: 'APPROVED', submittedAt: new Date(), reviewedAt: new Date(), reviewedById: 'audit' } });
  await prisma.storeAffiliatePayoutProfile.create({ data: { merchantId: store.id, affiliateId: affiliate.id, method: 'BANKAK', accountNameEncrypted: encryptSecret('Audit Marketer'), accountNumberEncrypted: encryptSecret('123456789') } });
  return { store, affiliate };
}

async function order(merchantId: string, status: 'NEW' | 'DELIVERED' = 'NEW', amount = 1000) {
  const customer = await prisma.customer.create({ data: { merchantId, name: 'Audit Customer', phone: `+249${randomUUID().replace(/\D/g, '').padEnd(9, '2').slice(0, 9)}` } });
  return prisma.order.create({
    data: {
      merchantId, customerId: customer.id, orderNumber: `AFF-${randomUUID()}`, status,
      subtotal: amount, total: amount, completedAt: status === 'DELIVERED' ? new Date() : null,
      paymentMethod: 'CASH', deliveryMethod: 'PICKUP',
      payment: { create: { method: 'CASH', status: 'COMPLETED', amount, paidAt: new Date() } },
    },
    include: { payment: true },
  });
}

async function attributedOrder(merchantId: string, token: string, status: 'NEW' | 'DELIVERED' = 'NEW', amount = 1000) {
  const created = await order(merchantId, status, amount);
  const attribution = await prisma.$transaction(tx => attachStoreAffiliateAttribution(tx, { merchantId, orderId: created.id, token }));
  return { created, attribution };
}

beforeAll(() => { vi.stubEnv('AUTH_SECRET', 'wasla-local-store-affiliate-audit-secret-20260903'); vi.stubEnv('SECRETS_ENCRYPTION_KEY', 'wasla-local-audit-encryption-not-production'); });
afterAll(async () => { vi.unstubAllEnvs(); await prisma.$disconnect(); });

describe('storefront affiliate commissions', () => {
  it('A01 keeps every merchant program inactive by default', async () => {
    const store = await merchant();
    const program = await ensureStoreAffiliateProgram(store.id);
    expect(program).toMatchObject({ isActive: false });
    const affiliate = await createStoreAffiliate(store.id, { name: 'Paused Marketer', phone: `+249${Date.now()}` });
    expect(await createStoreAffiliateVisit(store.slug, affiliate.code)).toBeNull();
  });

  it('A02 records an HttpOnly, scoped, pseudonymous last-click token', async () => {
    const { store, affiliate } = await setup();
    const request = new NextRequest(`http://localhost/store/${store.slug}/affiliate/${affiliate.code}`);
    const response = await openAffiliateLink(request, { params: Promise.resolve({ slug: store.slug, code: affiliate.code }) });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`http://localhost/store/${store.slug}`);
    const cookie = response.cookies.get(AFFILIATE_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.path).toBe(`/api/store/${store.slug}`);
    const visit = await prisma.storeAffiliateVisit.findUniqueOrThrow({ where: { tokenHash: affiliateTokenHash(cookie!.value) } });
    expect(visit.tokenHash).not.toContain(cookie!.value);
    expect(visit.expiresAt.getTime()).toBeGreaterThan(visit.visitedAt.getTime());
  });

  it('A03 snapshots trusted order value and creates one commission under concurrency', async () => {
    const { store, affiliate } = await setup({ rate: 7.5, holdDays: 2, minimumPayout: 50 });
    const visit = await createStoreAffiliateVisit(store.slug, affiliate.code);
    const { created, attribution } = await attributedOrder(store.id, visit!.token, 'NEW', 1000);
    expect(attribution).toMatchObject({ codeSnapshot: affiliate.code, currencySnapshot: 'SDG', holdDaysSnapshot: 2 });
    expect(Number(attribution!.baseAmount)).toBe(1000);
    expect(Number(attribution!.minimumPayoutSnapshot)).toBe(50);
    await updateStoreAffiliateProgram(store.id, { isActive: true, commissionRate: 20, attributionDays: 5, holdDays: 10, minimumPayout: 500, currency: 'USD' });
    await prisma.order.update({ where: { id: created.id }, data: { status: 'DELIVERED', completedAt: new Date() } });
    const results = await Promise.all([
      prisma.$transaction(tx => qualifyStoreAffiliateCommission(tx, created.id)),
      prisma.$transaction(tx => qualifyStoreAffiliateCommission(tx, created.id)),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const commission = await prisma.storeAffiliateCommission.findUniqueOrThrow({ where: { orderId: created.id } });
    expect(Number(commission.amount)).toBe(75);
    expect(commission.currency).toBe('SDG');
    expect(Math.round((commission.holdUntil.getTime() - commission.createdAt.getTime()) / 86_400_000)).toBe(2);
  });

  it('A04 rejects expired, cross-store and non-delivered attribution attempts', async () => {
    const first = await setup(); const second = await setup();
    const visit = await createStoreAffiliateVisit(first.store.slug, first.affiliate.code);
    const foreign = await order(second.store.id);
    expect(await prisma.$transaction(tx => attachStoreAffiliateAttribution(tx, { merchantId: second.store.id, orderId: foreign.id, token: visit!.token }))).toBeNull();
    const pending = await attributedOrder(first.store.id, visit!.token);
    expect(await prisma.$transaction(tx => qualifyStoreAffiliateCommission(tx, pending.created.id))).toBeNull();
    const expired = await createStoreAffiliateVisit(first.store.slug, first.affiliate.code);
    await prisma.storeAffiliateVisit.update({ where: { tokenHash: affiliateTokenHash(expired!.token) }, data: { expiresAt: new Date(0) } });
    const another = await order(first.store.id);
    expect(await prisma.$transaction(tx => attachStoreAffiliateAttribution(tx, { merchantId: first.store.id, orderId: another.id, token: expired!.token }))).toBeNull();
  });

  it('A05 voids cancelled attribution and never creates a commission later', async () => {
    const { store, affiliate } = await setup(); const visit = await createStoreAffiliateVisit(store.slug, affiliate.code);
    const { created } = await attributedOrder(store.id, visit!.token);
    await prisma.$transaction(tx => voidStoreAffiliateAttribution(tx, created.id, 'ORDER_CANCELLED'));
    await prisma.order.update({ where: { id: created.id }, data: { status: 'DELIVERED' } });
    expect(await prisma.$transaction(tx => qualifyStoreAffiliateCommission(tx, created.id))).toBeNull();
    expect(await prisma.storeAffiliateAttribution.findUnique({ where: { orderId: created.id } })).toMatchObject({ status: 'VOID', voidReason: 'ORDER_CANCELLED' });
  });

  it('A06 enforces hold, minimum payout, batch payment and tenant ownership', async () => {
    const { store, affiliate } = await setup({ rate: 5, holdDays: 1, minimumPayout: 100 });
    const visit = await createStoreAffiliateVisit(store.slug, affiliate.code);
    const first = await attributedOrder(store.id, visit!.token, 'DELIVERED', 1000);
    const second = await attributedOrder(store.id, visit!.token, 'DELIVERED', 1000);
    const one = await prisma.$transaction(tx => qualifyStoreAffiliateCommission(tx, first.created.id));
    const two = await prisma.$transaction(tx => qualifyStoreAffiliateCommission(tx, second.created.id));
    await expect(reviewStoreAffiliateCommission({ merchantId: store.id, commissionId: one!.id, reviewerId: 'audit', decision: 'APPROVE' })).rejects.toThrow();
    const afterHold = new Date(one!.holdUntil.getTime() + 1000);
    await reviewStoreAffiliateCommission({ merchantId: store.id, commissionId: one!.id, reviewerId: 'audit', decision: 'APPROVE' }, afterHold);
    await expect(reviewStoreAffiliateCommission({ merchantId: store.id, commissionId: one!.id, reviewerId: 'audit', decision: 'PAY', paymentRef: 'TOO-SMALL' }, afterHold)).rejects.toThrow();
    await reviewStoreAffiliateCommission({ merchantId: store.id, commissionId: two!.id, reviewerId: 'audit', decision: 'APPROVE' }, afterHold);
    const other = await merchant();
    await expect(reviewStoreAffiliateCommission({ merchantId: other.id, commissionId: one!.id, reviewerId: 'audit', decision: 'PAY', paymentRef: 'WRONG-TENANT' }, afterHold)).rejects.toThrow();
    const paid = await reviewStoreAffiliateCommission({ merchantId: store.id, commissionId: one!.id, reviewerId: 'audit', decision: 'PAY', paymentRef: 'AUDIT-BATCH' }, afterHold);
    expect('count' in paid ? paid.count : 0).toBe(2);
    expect(await prisma.storeAffiliateCommission.count({ where: { affiliateId: affiliate.id, status: 'PAID', paymentRef: 'AUDIT-BATCH' } })).toBe(2);
  });

  it('A07 reverses a paid commission when its payment is refunded', async () => {
    const { store, affiliate } = await setup({ rate: 10, holdDays: 0 }); const visit = await createStoreAffiliateVisit(store.slug, affiliate.code);
    const { created } = await attributedOrder(store.id, visit!.token, 'DELIVERED', 500);
    const commission = await prisma.$transaction(tx => qualifyStoreAffiliateCommission(tx, created.id));
    await reviewStoreAffiliateCommission({ merchantId: store.id, commissionId: commission!.id, reviewerId: 'audit', decision: 'APPROVE' });
    await reviewStoreAffiliateCommission({ merchantId: store.id, commissionId: commission!.id, reviewerId: 'audit', decision: 'PAY', paymentRef: 'AUDIT-PAID' });
    await refund(store.id, created.payment!.id);
    expect(await prisma.storeAffiliateCommission.findUnique({ where: { id: commission!.id } })).toMatchObject({ status: 'REVERSED', note: 'PAYMENT_REFUNDED' });
    expect(await prisma.storeAffiliateAttribution.findUnique({ where: { orderId: created.id } })).toMatchObject({ status: 'VOID', voidReason: 'PAYMENT_REFUNDED' });
  });

  it('A08 stops new visits for paused programs and suspended marketers', async () => {
    const { store, affiliate } = await setup();
    await setStoreAffiliateStatus(store.id, affiliate.id, 'SUSPENDED');
    expect(await createStoreAffiliateVisit(store.slug, affiliate.code)).toBeNull();
    await setStoreAffiliateStatus(store.id, affiliate.id, 'ACTIVE');
    await updateStoreAffiliateProgram(store.id, { isActive: false, commissionRate: 7.5, attributionDays: 30, holdDays: 2, minimumPayout: 0, currency: 'SDG' });
    expect(await createStoreAffiliateVisit(store.slug, affiliate.code)).toBeNull();
  });
});
