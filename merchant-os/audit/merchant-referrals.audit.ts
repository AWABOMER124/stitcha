import { randomInt, randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import prisma from '@/lib/db/prisma';
import { POST as register } from '@/app/api/auth/register/route';
import {
  REFERRAL_PROGRAM_ID, attachMerchantReferral, ensureMerchantReferralCode,
  evaluateMerchantReferral, reviewReferralCommission, updateReferralProgram,
} from '@/modules/merchant-referrals/merchant-referrals.service';
import { encryptSecret } from '@/lib/crypto/secret';

const db = new URL(process.env.DATABASE_URL ?? 'http://unset');
if (db.hostname !== '127.0.0.1' || db.port !== '55439' || db.pathname !== '/wasla_partner_audit') throw new Error('Dedicated local audit database required');
let sequence = randomInt(10_000_000, 89_999_999);
const identity = () => ({ email: `ref-${randomUUID()}@example.invalid`, phone: `+2499${String(sequence++).slice(-8)}` });
async function merchant(contact = identity()) {
  return prisma.merchant.create({ data: { name: `REFERRAL AUDIT ${randomUUID()}`, slug: `ref-audit-${randomUUID()}`, email: contact.email, phone: contact.phone, businessType: 'RETAIL', status: 'ACTIVE' } });
}
async function attach(sourceId: string, targetId: string, contact = identity(), activated = true) {
  const code = await ensureMerchantReferralCode(sourceId);
  return prisma.$transaction(tx => attachMerchantReferral(tx, { code: code.code, referredMerchantId: targetId, ...contact, activated }));
}

beforeAll(async () => {
  vi.stubEnv('AUTH_SECRET', 'wasla-local-audit-auth-not-production-20260903');
  vi.stubEnv('SECRETS_ENCRYPTION_KEY', 'wasla-local-audit-encryption-not-production');
  vi.stubEnv('WHATSAPP_SIGNUP_VERIFICATION_ENABLED', 'false');
  await prisma.merchantPlan.upsert({ where: { code: 'FREE' }, update: {}, create: { code: 'FREE', name: 'Basic', monthlyPrice: 0, entitlements: {} } });
  await prisma.merchantPlan.upsert({ where: { code: 'PRO-AUDIT' }, update: {}, create: { code: 'PRO-AUDIT', name: 'Pro Audit', monthlyPrice: 10, entitlements: {} } });
  await updateReferralProgram({ isActive: true, qualificationRule: 'FIRST_DELIVERED_ORDER', rewardType: 'PRO_DAYS', rewardValue: 14, holdDays: 30, terms: 'Synthetic audit only' });
});
afterAll(async () => { vi.unstubAllEnvs(); await prisma.$disconnect(); });

describe('platform merchant referrals', () => {
  it('R01 creates exactly one opaque code under concurrency', async () => {
    const source = await merchant();
    const rows = await Promise.all(Array.from({ length: 6 }, () => ensureMerchantReferralCode(source.id)));
    expect(new Set(rows.map(row => row.id)).size).toBe(1);
    expect(rows[0].code).toMatch(/^WSL-[A-F0-9]{10}$/);
  });

  it('R02 attributes a real registration atomically and snapshots terms', async () => {
    const source = await merchant(); const code = await ensureMerchantReferralCode(source.id); const contact = identity();
    const response = await register(new Request('http://localhost/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ merchantName: 'Referred Audit Store', ownerName: 'Audit Owner', ...contact, password: 'Audit-Password-123!', businessType: 'RETAIL', referralCode: code.code }) }));
    expect(response.status).toBe(201); expect((await response.json()).referralAccepted).toBe(true);
    const row = await prisma.merchantReferral.findFirstOrThrow({ where: { referrerMerchantId: source.id } });
    expect(row).toMatchObject({ status: 'ACTIVATED', codeSnapshot: code.code, rewardTypeSnapshot: 'PRO_DAYS', holdDaysSnapshot: 30 });
  });

  it('R03 never blocks signup for an invalid code', async () => {
    const contact = identity();
    const response = await register(new Request('http://localhost/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ merchantName: 'No Referral Audit', ownerName: 'Audit Owner', ...contact, password: 'Audit-Password-123!', businessType: 'RETAIL', referralCode: 'WSL-INVALID00' }) }));
    expect(response.status).toBe(201); expect((await response.json()).referralAccepted).toBe(false);
  });

  it('R04 records self and duplicate identities as rejected without rewards', async () => {
    const contact = identity(); const source = await merchant(contact); const selfTarget = await merchant();
    const self = await attach(source.id, selfTarget.id, contact); expect(self?.status).toBe('REJECTED'); expect(self?.rejectionReason).toBe('SELF_REFERRAL_IDENTITY');
    const firstSource = await merchant(); const firstTarget = await merchant(); const duplicateTarget = await merchant(); const repeated = identity(); const secondSource = await merchant();
    const concurrent = await Promise.all([attach(firstSource.id, firstTarget.id, repeated), attach(secondSource.id, duplicateTarget.id, repeated)]);
    expect(concurrent.map(row => row?.status).sort()).toEqual(['ACTIVATED', 'REJECTED']);
    expect(concurrent.find(row => row?.status === 'REJECTED')?.rejectionReason).toBe('DUPLICATE_REFERRED_IDENTITY');
    expect(await prisma.merchantReferralReward.count({ where: { referralRecord: { status: 'REJECTED' } } })).toBe(0);
  });

  it('R05 qualifies the first delivered order once and preserves snapshotted terms', async () => {
    const source = await merchant(); const target = await merchant(); const referral = await attach(source.id, target.id); expect(referral).toBeTruthy();
    await updateReferralProgram({ isActive: true, qualificationRule: 'FIRST_DELIVERED_ORDER', rewardType: 'AI_CREDITS', rewardValue: 99, holdDays: 2 });
    const customer = await prisma.customer.create({ data: { merchantId: target.id, name: 'Audit Customer', phone: `+2499${String(sequence++).slice(-8)}` } });
    await prisma.order.create({ data: { merchantId: target.id, customerId: customer.id, orderNumber: `REF-${randomUUID()}`, status: 'DELIVERED', subtotal: 100, total: 100 } });
    const [one, two] = await Promise.all([evaluateMerchantReferral(target.id), evaluateMerchantReferral(target.id)]);
    expect([one, two].filter(Boolean)).toHaveLength(1);
    const reward = await prisma.merchantReferralReward.findUniqueOrThrow({ where: { referralId: referral!.id } });
    expect(reward.type).toBe('PRO_DAYS'); expect(reward.value.toString()).toBe('14');
    expect(Math.round((reward.holdUntil.getTime() - reward.createdAt.getTime()) / 86400000)).toBe(30);
  });

  it('R06 supports paid-Pro qualification and an auditable review lifecycle', async () => {
    await updateReferralProgram({ isActive: true, qualificationRule: 'FIRST_PAID_PRO', rewardType: 'CASH', rewardValue: 0, currency: 'SDG', holdDays: 1, commissionRate: 20, commissionMonths: 12, minimumPayout: 0 });
    const source = await merchant(); const target = await merchant(); const referral = await attach(source.id, target.id); const plan = await prisma.merchantPlan.findUniqueOrThrow({ where: { code: 'PRO-AUDIT' } });
    const account = await prisma.platformPaymentAccount.create({ data: { channel: 'BANKAK', label: 'Audit only', accountName: 'Audit', accountNumber: randomUUID(), monthlyAmount: 10 } });
    const payment = await prisma.merchantSubscriptionPayment.create({ data: { merchantId: target.id, targetPlanId: plan.id, paymentAccountId: account.id, amount: 10, currency: 'SDG', channel: 'BANKAK', transactionRef: randomUUID(), proofStorageKey: 'audit/none', proofMimeType: 'image/png', proofSize: 1, proofSha256: randomUUID().replaceAll('-',''), status: 'VERIFIED' } });
    const commission = await evaluateMerchantReferral(target.id, new Date(), payment.id); expect(commission && 'amount' in commission ? commission.amount.toString() : null).toBe('2');
    await expect(reviewReferralCommission({ commissionId: commission!.id, reviewerId: 'audit', decision: 'APPROVE' })).rejects.toThrow();
    const afterHold = new Date(commission!.holdUntil.getTime() + 1000);
    const approved = await reviewReferralCommission({ commissionId: commission!.id, reviewerId: 'audit', decision: 'APPROVE' }, afterHold);
    expect('status' in approved ? approved.status : null).toBe('APPROVED');
    await expect(reviewReferralCommission({ commissionId: commission!.id, reviewerId: 'audit', decision: 'FULFILL', fulfillmentRef: 'BLOCKED' }, afterHold)).rejects.toThrow();
    await prisma.merchantIdentityVerification.create({ data: { merchantId: source.id, legalName: 'Audit Referrer', documentType: 'NATIONAL_ID', documentNumberEncrypted: encryptSecret('AUDIT12345'), expiresAt: new Date('2035-01-01'), status: 'APPROVED', submittedAt: new Date(), reviewedAt: new Date(), reviewedById: 'audit' } });
    await prisma.merchantReferralPayoutProfile.create({ data: { merchantId: source.id, method: 'BANKAK', accountNameEncrypted: encryptSecret('Audit Referrer'), accountNumberEncrypted: encryptSecret('123456789') } });
    const fulfilled = await reviewReferralCommission({ commissionId: commission!.id, reviewerId: 'audit', decision: 'FULFILL', fulfillmentRef: 'AUDIT-NOT-A-REAL-PAYOUT' }, afterHold);
    expect('count' in fulfilled ? fulfilled.count : 0).toBe(1);
    expect((await prisma.merchantReferral.findUniqueOrThrow({ where: { id: referral!.id } })).status).toBe('QUALIFIED');
  });

  it('R07 stops new attribution while paused without affecting signup data', async () => {
    await prisma.platformReferralProgram.update({ where: { id: REFERRAL_PROGRAM_ID }, data: { isActive: false } });
    const source = await merchant(); const target = await merchant(); expect(await attach(source.id, target.id)).toBeNull();
  });
});
