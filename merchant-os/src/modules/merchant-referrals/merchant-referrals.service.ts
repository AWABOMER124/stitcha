import { createHmac, randomBytes } from 'node:crypto';
import type { Prisma, ReferralQualificationRule, ReferralRewardStatus } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';

export const REFERRAL_PROGRAM_ID = 'merchant-growth';

type Db = Prisma.TransactionClient | typeof prisma;

export function normalizeReferralCode(value: string | null | undefined) {
  const code = String(value ?? '').trim().toUpperCase();
  return /^[A-Z0-9-]{4,32}$/.test(code) ? code : null;
}

export function referralIdentityFingerprint(email: string, phone: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new ValidationError('Referral security is not configured');
  return createHmac('sha256', secret)
    .update(JSON.stringify([email.trim().toLowerCase(), phone.trim()]))
    .digest('hex');
}

export async function ensureMerchantReferralCode(merchantId: string) {
  const current = await prisma.merchantReferralCode.findUnique({ where: { merchantId } });
  if (current) return current;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = `WSL-${randomBytes(5).toString('hex').toUpperCase()}`;
    try {
      return await prisma.merchantReferralCode.create({ data: { merchantId, code } });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const winner = await prisma.merchantReferralCode.findUnique({ where: { merchantId } });
      if (winner) return winner;
    }
  }
  throw new ConflictError('تعذر إنشاء رمز الإحالة، حاول مجدداً');
}

export async function attachMerchantReferral(
  tx: Prisma.TransactionClient,
  input: { code?: string | null; referredMerchantId: string; email: string; phone: string; activated: boolean },
) {
  const code = normalizeReferralCode(input.code);
  if (!code) return null;
  const [program, source] = await Promise.all([
    tx.platformReferralProgram.findUnique({ where: { id: REFERRAL_PROGRAM_ID } }),
    tx.merchantReferralCode.findFirst({
      where: { code, isActive: true, merchant: { is: { status: 'ACTIVE', isActive: true } } },
      include: {
        merchant: {
          select: {
            id: true, email: true, phone: true,
            users: { where: { isOwner: true, isActive: true }, take: 1, select: { user: { select: { email: true, phone: true } } } },
          },
        },
      },
    }),
  ]);
  if (!program?.isActive || !source) return null;

  const fingerprint = referralIdentityFingerprint(input.email, input.phone);
  // Serialize attribution for the same identity without exposing it as a database key.
  // A hash collision can only delay another transaction; the full HMAC comparison below
  // remains the authority for accepting or rejecting the referral.
  await tx.$queryRaw<Array<{ locked: number }>>`
    SELECT 1::int AS "locked"
    FROM (SELECT pg_advisory_xact_lock(hashtext(${fingerprint}))) AS referral_identity_lock
  `;
  const owner = source.merchant.users[0]?.user;
  const sameIdentity = [source.merchant.email, owner?.email].some(value => value?.trim().toLowerCase() === input.email.trim().toLowerCase())
    || [source.merchant.phone, owner?.phone].some(value => value?.trim() === input.phone.trim());
  const priorIdentity = await tx.merchantReferral.findFirst({
    where: { identityFingerprint: fingerprint, status: { not: 'REJECTED' } },
    select: { id: true },
  });
  const rejected = sameIdentity || !!priorIdentity;
  return tx.merchantReferral.create({
    data: {
      programId: program.id,
      referralCodeId: source.id,
      referrerMerchantId: source.merchantId,
      referredMerchantId: input.referredMerchantId,
      codeSnapshot: source.code,
      qualificationRuleSnapshot: program.qualificationRule,
      rewardTypeSnapshot: program.rewardType,
      rewardValueSnapshot: program.rewardValue,
      currencySnapshot: program.currency,
      holdDaysSnapshot: program.holdDays,
      commissionRateSnapshot: program.commissionRate,
      commissionMonthsSnapshot: program.commissionMonths,
      minimumPayoutSnapshot: program.minimumPayout,
      identityFingerprint: fingerprint,
      status: rejected ? 'REJECTED' : input.activated ? 'ACTIVATED' : 'REGISTERED',
      activatedAt: !rejected && input.activated ? new Date() : null,
      rejectedAt: rejected ? new Date() : null,
      rejectionReason: sameIdentity ? 'SELF_REFERRAL_IDENTITY' : priorIdentity ? 'DUPLICATE_REFERRED_IDENTITY' : null,
    },
  });
}

export async function activateMerchantReferral(referredMerchantId: string, tx: Db = prisma) {
  return tx.merchantReferral.updateMany({
    where: { referredMerchantId, status: 'REGISTERED' },
    data: { status: 'ACTIVATED', activatedAt: new Date() },
  });
}

export async function evaluateMerchantReferralInTransaction(
  tx: Prisma.TransactionClient,
  referredMerchantId: string,
  now = new Date(),
  subscriptionPaymentId?: string,
) {
  const candidate = await tx.merchantReferral.findUnique({
    where: { referredMerchantId },
    select: { id: true, status: true },
  });
  if (!candidate || candidate.status === 'REJECTED') return null;
  await tx.$queryRaw`SELECT id FROM merchant_referrals WHERE "referredMerchantId" = ${referredMerchantId} FOR UPDATE`;
  const referral = await tx.merchantReferral.findUnique({ where: { referredMerchantId } });
  if (!referral || referral.status === 'REJECTED') return null;
  const merchant = await tx.merchant.findUnique({ where: { id: referredMerchantId }, select: { status: true } });
  if (merchant?.status !== 'ACTIVE') return null;
  if (referral.status === 'REGISTERED') {
    await tx.merchantReferral.update({ where: { id: referral.id }, data: { status: 'ACTIVATED', activatedAt: now } });
  }
  let qualifiedAt = referral.qualifiedAt;
  if (referral.status !== 'QUALIFIED') {
    const qualifies = await hasQualification(tx, referredMerchantId, referral.qualificationRuleSnapshot);
    if (!qualifies) return null;
    qualifiedAt = now;
    await tx.merchantReferral.update({ where: { id: referral.id }, data: { status: 'QUALIFIED', qualifiedAt } });
  }
  if (referral.qualificationRuleSnapshot === 'FIRST_PAID_PRO') {
    // Paid-acquisition referrals are commission-only. Never fall through to the
    // legacy one-time reward path when an audit/manual invocation has no payment.
    return subscriptionPaymentId && qualifiedAt
      ? createRecurringReferralCommission(tx, referral, subscriptionPaymentId, qualifiedAt, now)
      : null;
  }
  if (referral.status === 'QUALIFIED') return null;
  const holdUntil = new Date(now);
  holdUntil.setUTCDate(holdUntil.getUTCDate() + referral.holdDaysSnapshot);
  return tx.merchantReferralReward.upsert({
    where: { referralId: referral.id },
    update: {},
    create: {
      referralId: referral.id,
      referrerMerchantId: referral.referrerMerchantId,
      type: referral.rewardTypeSnapshot,
      value: referral.rewardValueSnapshot,
      currency: referral.currencySnapshot,
      holdUntil,
    },
  });
}

export async function evaluateMerchantReferral(referredMerchantId: string, now = new Date(), subscriptionPaymentId?: string) {
  return prisma.$transaction(tx => evaluateMerchantReferralInTransaction(tx, referredMerchantId, now, subscriptionPaymentId));
}

async function createRecurringReferralCommission(
  tx: Prisma.TransactionClient,
  referral: {
    id: string; referrerMerchantId: string; referredMerchantId: string; holdDaysSnapshot: number;
    commissionRateSnapshot: Prisma.Decimal; commissionMonthsSnapshot: number; minimumPayoutSnapshot: Prisma.Decimal;
  },
  subscriptionPaymentId: string,
  qualifiedAt: Date,
  now: Date,
) {
  const eligibilityEndsAt = new Date(qualifiedAt);
  eligibilityEndsAt.setUTCMonth(eligibilityEndsAt.getUTCMonth() + referral.commissionMonthsSnapshot);
  if (now >= eligibilityEndsAt) return null;
  const payment = await tx.merchantSubscriptionPayment.findFirst({
    where: { id: subscriptionPaymentId, merchantId: referral.referredMerchantId, status: 'VERIFIED', targetPlan: { code: { not: 'FREE' } } },
    select: { id: true, amount: true, currency: true },
  });
  if (!payment || payment.amount.lte(0)) return null;
  const amount = payment.amount.mul(referral.commissionRateSnapshot).div(100).toDecimalPlaces(2);
  if (amount.lte(0)) return null;
  const holdUntil = new Date(now);
  holdUntil.setUTCDate(holdUntil.getUTCDate() + referral.holdDaysSnapshot);
  return tx.merchantReferralCommission.upsert({
    where: { subscriptionPaymentId: payment.id },
    update: {},
    create: {
      referralId: referral.id,
      referrerMerchantId: referral.referrerMerchantId,
      subscriptionPaymentId: payment.id,
      grossAmount: payment.amount,
      commissionRate: referral.commissionRateSnapshot,
      amount,
      currency: payment.currency,
      minimumPayoutSnapshot: referral.minimumPayoutSnapshot,
      holdUntil,
    },
  });
}

async function hasQualification(tx: Prisma.TransactionClient, merchantId: string, rule: ReferralQualificationRule) {
  if (rule === 'FIRST_DELIVERED_ORDER') {
    return (await tx.order.count({ where: { merchantId, status: 'DELIVERED' } })) > 0;
  }
  return !!await tx.merchantSubscriptionPayment.findFirst({
    where: { merchantId, status: 'VERIFIED', targetPlan: { code: { not: 'FREE' } } },
    select: { id: true },
  });
}

export async function getMerchantReferralDashboard(merchantId: string) {
  const [program, code, referrals, rewards, commissions] = await Promise.all([
    prisma.platformReferralProgram.findUnique({ where: { id: REFERRAL_PROGRAM_ID } }),
    ensureMerchantReferralCode(merchantId),
    prisma.merchantReferral.findMany({
      where: { referrerMerchantId: merchantId },
      include: { referredMerchant: { select: { name: true, createdAt: true } }, reward: true },
      orderBy: { registeredAt: 'desc' }, take: 100,
    }),
    prisma.merchantReferralReward.groupBy({
      by: ['status'], where: { referrerMerchantId: merchantId }, _count: { _all: true }, _sum: { value: true },
    }),
    prisma.merchantReferralCommission.findMany({
      where: { referrerMerchantId: merchantId },
      include: { referralRecord: { select: { referredMerchant: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    }),
  ]);
  return { program, code, referrals, rewards, commissions };
}

export async function getAdminReferralDashboard() {
  const [program, referrals, rewards, commissions] = await Promise.all([
    prisma.platformReferralProgram.findUniqueOrThrow({ where: { id: REFERRAL_PROGRAM_ID } }),
    prisma.merchantReferral.findMany({
      include: {
        referrerMerchant: { select: { name: true, slug: true } },
        referredMerchant: { select: { name: true, slug: true } }, reward: true,
      },
      orderBy: { registeredAt: 'desc' }, take: 200,
    }),
    prisma.merchantReferralReward.findMany({
      include: { referrerMerchant: { select: { name: true } }, referralRecord: { select: { referredMerchant: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }, take: 200,
    }),
    prisma.merchantReferralCommission.findMany({
      include: { referrerMerchant: { select: { name: true } }, referralRecord: { select: { referredMerchant: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }, take: 200,
    }),
  ]);
  return { program, referrals, rewards, commissions };
}

export async function updateReferralProgram(input: {
  isActive: boolean; qualificationRule: ReferralQualificationRule; rewardType: 'PRO_DAYS' | 'AI_CREDITS' | 'ACCOUNT_CREDIT' | 'CASH';
  rewardValue: number; currency?: string; holdDays: number; commissionRate?: number; commissionMonths?: number; minimumPayout?: number; terms?: string;
}) {
  const commissionRate = input.commissionRate ?? 20;
  const commissionMonths = input.commissionMonths ?? 12;
  const minimumPayout = input.minimumPayout ?? 0;
  if (input.rewardValue < 0 || input.rewardValue > 1_000_000_000 || input.holdDays < 0 || input.holdDays > 180 || commissionRate <= 0 || commissionRate > 100 || commissionMonths < 1 || commissionMonths > 24 || minimumPayout < 0) throw new ValidationError('Referral terms are outside the allowed range');
  const monetary = input.rewardType === 'CASH' || input.rewardType === 'ACCOUNT_CREDIT';
  const currency = monetary ? (input.currency?.trim().toUpperCase() || 'SDG') : null;
  return prisma.platformReferralProgram.update({
    where: { id: REFERRAL_PROGRAM_ID },
    data: { ...input, commissionRate, commissionMonths, minimumPayout, currency, terms: input.terms?.trim() || null },
  });
}

export async function reviewReferralCommission(input: {
  commissionId: string; reviewerId: string; decision: 'APPROVE' | 'REJECT' | 'FULFILL'; note?: string; fulfillmentRef?: string;
}, now = new Date()) {
  return prisma.$transaction(async tx => {
    const owned = await tx.merchantReferralCommission.findUnique({ where: { id: input.commissionId }, select: { referrerMerchantId: true } });
    if (!owned) throw new NotFoundError('Referral commission');
    await tx.$queryRaw`SELECT id FROM merchants WHERE id = ${owned.referrerMerchantId} FOR UPDATE`;
    const commission = await tx.merchantReferralCommission.findUnique({
      where: { id: input.commissionId },
      include: { referrerMerchant: { select: { identityVerification: { select: { status: true, expiresAt: true } }, referralPayoutProfile: { select: { id: true } } } } },
    });
    if (!commission) throw new NotFoundError('Referral commission');
    if (input.decision === 'APPROVE') {
      if (commission.status !== 'PENDING') throw new ConflictError('تمت مراجعة العمولة مسبقاً');
      if (commission.holdUntil > now) throw new ConflictError('لم تنتهِ فترة تعليق العمولة');
      return tx.merchantReferralCommission.update({ where: { id: commission.id }, data: { status: 'APPROVED', reviewedById: input.reviewerId, reviewedAt: now, note: input.note?.trim() || null } });
    }
    if (input.decision === 'REJECT') {
      if (commission.status !== 'PENDING' || !input.note?.trim()) throw new ValidationError('سبب الرفض مطلوب أو تغيرت حالة العمولة');
      return tx.merchantReferralCommission.update({ where: { id: commission.id }, data: { status: 'REJECTED', reviewedById: input.reviewerId, reviewedAt: now, note: input.note.trim() } });
    }
    if (commission.status !== 'APPROVED') throw new ConflictError('اعتمد العمولة أولاً');
    if (!input.fulfillmentRef?.trim()) throw new ValidationError('مرجع التحويل مطلوب');
    if (commission.referrerMerchant.identityVerification?.status !== 'APPROVED' || commission.referrerMerchant.identityVerification.expiresAt <= now) throw new ConflictError('يجب تأكيد هوية المسوّق بوثيقة سارية');
    if (!commission.referrerMerchant.referralPayoutProfile) throw new ConflictError('بيانات سداد المسوّق غير مكتملة');
    const approved = await tx.merchantReferralCommission.findMany({ where: { referrerMerchantId: commission.referrerMerchantId, currency: commission.currency, status: 'APPROVED' }, select: { amount: true, minimumPayoutSnapshot: true } });
    const total = approved.reduce((sum, item) => sum + Number(item.amount), 0);
    const threshold = Math.max(...approved.map(item => Number(item.minimumPayoutSnapshot)), 0);
    if (total < threshold) throw new ConflictError('الرصيد لم يبلغ الحد الأدنى للسداد');
    return tx.merchantReferralCommission.updateMany({ where: { referrerMerchantId: commission.referrerMerchantId, currency: commission.currency, status: 'APPROVED' }, data: { status: 'FULFILLED', fulfilledAt: now, fulfillmentRef: input.fulfillmentRef.trim(), note: input.note?.trim() || commission.note } });
  });
}

export async function reviewReferralReward(input: {
  rewardId: string; reviewerId: string; decision: 'APPROVE' | 'REJECT' | 'FULFILL'; note?: string; fulfillmentRef?: string;
}, now = new Date()) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM merchant_referral_rewards WHERE id = ${input.rewardId} FOR UPDATE`;
    const reward = await tx.merchantReferralReward.findUnique({
      where: { id: input.rewardId },
      include: {
        referralRecord: { select: { referredMerchant: { select: { status: true, isActive: true } } } },
        referrerMerchant: { select: { identityVerification: { select: { status: true, expiresAt: true } }, referralPayoutProfile: { select: { id: true } } } },
      },
    });
    if (!reward) throw new NotFoundError('Referral reward');
    if (input.decision === 'APPROVE') {
      if (reward.status !== 'PENDING') throw new ConflictError('المكافأة تمت مراجعتها مسبقاً');
      if (reward.holdUntil > now) throw new ConflictError('لم تنتهِ فترة تعليق المكافأة');
      if (!reward.referralRecord.referredMerchant.isActive || reward.referralRecord.referredMerchant.status !== 'ACTIVE') throw new ConflictError('المتجر المُحال غير نشط؛ راجع الإحالة قبل الاعتماد');
      return tx.merchantReferralReward.update({ where: { id: reward.id }, data: { status: 'APPROVED', reviewedById: input.reviewerId, reviewedAt: now, note: input.note?.trim() || null } });
    }
    if (input.decision === 'REJECT') {
      if (reward.status !== 'PENDING') throw new ConflictError('المكافأة تمت مراجعتها مسبقاً');
      if (!input.note?.trim()) throw new ValidationError('سبب الرفض مطلوب');
      return tx.merchantReferralReward.update({ where: { id: reward.id }, data: { status: 'REJECTED', reviewedById: input.reviewerId, reviewedAt: now, note: input.note.trim() } });
    }
    if (reward.status !== 'APPROVED') throw new ConflictError('اعتمد المكافأة أولاً');
    if (!input.fulfillmentRef?.trim()) throw new ValidationError('مرجع تنفيذ المكافأة مطلوب');
    if ((reward.type === 'CASH' || reward.type === 'ACCOUNT_CREDIT') && (reward.referrerMerchant.identityVerification?.status !== 'APPROVED' || reward.referrerMerchant.identityVerification.expiresAt <= now)) {
      throw new ConflictError('يجب تأكيد هوية المُحيل بوثيقة سارية قبل تنفيذ المكافأة المالية');
    }
    if ((reward.type === 'CASH' || reward.type === 'ACCOUNT_CREDIT') && !reward.referrerMerchant.referralPayoutProfile) {
      throw new ConflictError('يجب إضافة بيانات سداد المُحيل قبل تنفيذ المكافأة المالية');
    }
    return tx.merchantReferralReward.update({ where: { id: reward.id }, data: { status: 'FULFILLED', fulfilledAt: now, fulfillmentRef: input.fulfillmentRef.trim(), note: input.note?.trim() || reward.note } });
  });
}

function isUniqueConflict(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

export type RewardStatus = ReferralRewardStatus;
