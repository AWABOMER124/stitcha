import { createHmac } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { ValidationError } from '@/lib/errors';
import { REFERRAL_PROGRAM_ID, referralIdentityFingerprint } from '@/modules/merchant-referrals/merchant-referrals.service';

export function normalizeMarketerReferralCode(value: string | null | undefined) {
  const code = String(value ?? '').trim().toUpperCase();
  return /^MK-[A-Z0-9]{6,24}$/.test(code) ? code : null;
}

export async function attachMarketerMerchantReferral(
  tx: Prisma.TransactionClient,
  input: { code?: string | null; referredMerchantId: string; email: string; phone: string; activated: boolean },
) {
  const code = normalizeMarketerReferralCode(input.code);
  if (!code) return null;
  const [program, marketer] = await Promise.all([
    tx.platformReferralProgram.findUnique({ where: { id: REFERRAL_PROGRAM_ID } }),
    tx.marketerAccount.findFirst({ where: { acquisitionCode: code, isActive: true }, include: { user: { select: { email: true, phone: true } } } }),
  ]);
  if (!program?.isActive || program.qualificationRule !== 'FIRST_PAID_PRO' || !marketer) return null;
  const fingerprint = referralIdentityFingerprint(input.email, input.phone);
  const selfReferral = marketer.user.email.toLowerCase() === input.email.trim().toLowerCase() || marketer.user.phone === input.phone;
  const existing = await tx.marketerMerchantReferral.findFirst({ where: { identityFingerprint: fingerprint, status: { not: 'REJECTED' } }, select: { id: true } });
  return tx.marketerMerchantReferral.create({ data: {
    programId: program.id, marketerAccountId: marketer.id, referredMerchantId: input.referredMerchantId, codeSnapshot: code, identityFingerprint: fingerprint,
    holdDaysSnapshot: program.holdDays, commissionRateSnapshot: program.commissionRate, commissionMonthsSnapshot: program.commissionMonths, minimumPayoutSnapshot: program.minimumPayout,
    status: selfReferral || existing ? 'REJECTED' : input.activated ? 'ACTIVATED' : 'REGISTERED', activatedAt: !selfReferral && !existing && input.activated ? new Date() : null,
    rejectedAt: selfReferral || existing ? new Date() : null, rejectionReason: selfReferral ? 'SELF_REFERRAL_IDENTITY' : existing ? 'DUPLICATE_REFERRED_IDENTITY' : null,
  } });
}

/**
 * Operational backfill for a legitimate referral that was submitted before the
 * acquisition-referral flow was released.  This is intentionally only exposed
 * to platform staff; normal referrals are always captured at registration.
 */
export async function backfillMarketerMerchantReferral(
  tx: Prisma.TransactionClient,
  input: { code: string; merchantSlug: string },
) {
  const merchant = await tx.merchant.findUnique({
    where: { slug: input.merchantSlug.trim().toLowerCase() },
    select: { id: true, email: true, phone: true, status: true },
  });
  if (!merchant) throw new ValidationError('المتجر غير موجود');
  if (!merchant.email || !merchant.phone) throw new ValidationError('لا يمكن إسناد الإحالة: بيانات اتصال المتجر غير مكتملة');

  const alreadyAttributed = await tx.marketerMerchantReferral.findUnique({
    where: { referredMerchantId: merchant.id }, select: { id: true },
  });
  if (alreadyAttributed) throw new ValidationError('هذا المتجر مرتبط بالفعل بإحالة مسوّق');

  const referral = await attachMarketerMerchantReferral(tx, {
    code: input.code,
    referredMerchantId: merchant.id,
    email: merchant.email,
    phone: merchant.phone,
    activated: merchant.status === 'ACTIVE',
  });
  if (!referral || referral.status === 'REJECTED') return referral;

  // A merchant may have paid before this operational correction.  Reuse the
  // first verified paid subscription so the attribution is not lost, while
  // preserving the original payment as the immutable commission source.
  const payment = await tx.merchantSubscriptionPayment.findFirst({
    where: { merchantId: merchant.id, status: 'VERIFIED', targetPlan: { code: { not: 'FREE' } } },
    select: { id: true }, orderBy: { reviewedAt: 'asc' },
  });
  if (payment) await evaluateMarketerReferralInTransaction(tx, merchant.id, new Date(), payment.id);
  return referral;
}

export async function evaluateMarketerReferralInTransaction(tx: Prisma.TransactionClient, merchantId: string, now = new Date(), subscriptionPaymentId?: string) {
  if (!subscriptionPaymentId) return null;
  const referral = await tx.marketerMerchantReferral.findUnique({ where: { referredMerchantId: merchantId } });
  if (!referral || referral.status === 'REJECTED') return null;
  await tx.$queryRaw`SELECT id FROM marketer_merchant_referrals WHERE "referredMerchantId" = ${merchantId} FOR UPDATE`;
  const locked = await tx.marketerMerchantReferral.findUnique({ where: { referredMerchantId: merchantId } });
  if (!locked || locked.status === 'REJECTED') return null;
  const payment = await tx.merchantSubscriptionPayment.findFirst({ where: { id: subscriptionPaymentId, merchantId, status: 'VERIFIED', targetPlan: { code: { not: 'FREE' } } }, select: { id: true, amount: true, currency: true } });
  if (!payment || payment.amount.lte(0)) return null;
  const qualifiedAt = locked.qualifiedAt ?? now;
  const endsAt = new Date(qualifiedAt); endsAt.setUTCMonth(endsAt.getUTCMonth() + locked.commissionMonthsSnapshot);
  if (now >= endsAt) return null;
  if (locked.status !== 'QUALIFIED') await tx.marketerMerchantReferral.update({ where: { id: locked.id }, data: { status: 'QUALIFIED', activatedAt: locked.activatedAt ?? now, qualifiedAt } });
  const holdUntil = new Date(now); holdUntil.setUTCDate(holdUntil.getUTCDate() + locked.holdDaysSnapshot);
  const amount = payment.amount.mul(locked.commissionRateSnapshot).div(100).toDecimalPlaces(2);
  if (amount.lte(0)) return null;
  return tx.marketerSubscriptionCommission.upsert({ where: { subscriptionPaymentId: payment.id }, update: {}, create: {
    referralId: locked.id, marketerAccountId: locked.marketerAccountId, subscriptionPaymentId: payment.id, grossAmount: payment.amount,
    commissionRate: locked.commissionRateSnapshot, amount, currency: payment.currency, minimumPayoutSnapshot: locked.minimumPayoutSnapshot, holdUntil,
  } });
}

export function marketerCodeForAccount(id: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new ValidationError('Marketer referral security is not configured');
  return `MK-${createHmac('sha256', secret).update(`marketer:${id}`).digest('hex').slice(0, 10).toUpperCase()}`;
}
