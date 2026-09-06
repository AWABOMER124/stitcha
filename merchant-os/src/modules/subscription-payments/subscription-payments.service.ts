import prisma from '@/lib/db/prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { privateStorageService } from '@/services/storage';
import type { PrivateEvidence } from '@/services/storage/private-evidence-input';
import { isPlatformRole } from '@/lib/platform-permissions';
import { evaluateMerchantReferralInTransaction } from '@/modules/merchant-referrals/merchant-referrals.service';
import { evaluateMarketerReferralInTransaction } from '@/modules/marketer-referrals/marketer-referrals.service';

export type PlatformPaymentAccountInput = {
  channel: 'BANKAK' | 'MYCASHY' | 'OTHER';
  label: string;
  accountName: string;
  accountNumber: string;
  instructions?: string;
  sortOrder?: number;
};

const DEFAULT_USD_TO_SDG = 100_000;

export async function getPlatformBillingSettings() {
  const setting = await prisma.platformBillingSettings.findUnique({ where: { id: 'default' } });
  return { usdToSdgRate: Number(setting?.usdToSdgRate ?? DEFAULT_USD_TO_SDG), updatedAt: setting?.updatedAt ?? null };
}

export async function setUsdToSdgRate(usdToSdgRate: number, updatedById: string) {
  if (!Number.isFinite(usdToSdgRate) || usdToSdgRate <= 0 || usdToSdgRate > 10_000_000) throw new ValidationError('Exchange rate is invalid');
  return prisma.platformBillingSettings.upsert({ where: { id: 'default' }, update: { usdToSdgRate, updatedById }, create: { id: 'default', usdToSdgRate, updatedById } });
}

function quotePlanInSdg(plan: { monthlyPrice: { toString(): string } | number; currency: string }, usdToSdgRate: number) {
  const price = Number(plan.monthlyPrice);
  if (plan.currency.toUpperCase() === 'SDG') return { usdReference: null, amount: price };
  if (plan.currency.toUpperCase() !== 'USD') throw new ValidationError('Manual billing supports USD or SDG plans only');
  return { usdReference: price, amount: Math.round(price * usdToSdgRate) };
}

export async function listAllPaymentAccounts() {
  const accounts = await prisma.platformPaymentAccount.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return accounts.map(account => ({ ...account, monthlyAmount: Number(account.monthlyAmount) }));
}

export async function createPlatformPaymentAccount(input: PlatformPaymentAccountInput) {
  return prisma.platformPaymentAccount.create({
    data: {
      channel: input.channel,
      label: input.label.trim(),
      accountName: input.accountName.trim(),
      accountNumber: input.accountNumber.trim(),
      instructions: input.instructions?.trim() || null,
      // Kept as a legacy database field for older records; quotes now come
      // from the selected plan and the platform exchange-rate setting.
      monthlyAmount: 0,
      currency: 'SDG',
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function setPlatformPaymentAccountActive(id: string, isActive: boolean) {
  const account = await prisma.platformPaymentAccount.findUnique({ where: { id }, select: { id: true } });
  if (!account) throw new NotFoundError('Payment account');
  return prisma.platformPaymentAccount.update({ where: { id }, data: { isActive } });
}

export async function listActivePaymentAccounts() {
  const accounts = await prisma.platformPaymentAccount.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return accounts.map(account => ({ ...account, monthlyAmount: Number(account.monthlyAmount) }));
}

export async function getManualPaymentQuote(merchantId: string) {
  const [request, settings] = await Promise.all([
    prisma.merchantPlanChangeRequest.findFirst({ where: { merchantId, status: { in: ['PENDING', 'CONTACTED'] } }, include: { targetPlan: { select: { code: true, name: true, monthlyPrice: true, currency: true } }, }, orderBy: { createdAt: 'desc' } }),
    getPlatformBillingSettings(),
  ]);
  if (!request) return null;
  const quote = quotePlanInSdg(request.targetPlan, settings.usdToSdgRate);
  return { planCode: request.targetPlan.code, planName: request.targetPlan.name, planCurrency: request.targetPlan.currency, planMonthlyPrice: Number(request.targetPlan.monthlyPrice), usdToSdgRate: settings.usdToSdgRate, amount: quote.amount, currency: 'SDG' };
}

export async function listMerchantPayments(merchantId: string) {
  const payments = await prisma.merchantSubscriptionPayment.findMany({
    where: { merchantId }, include: { paymentAccount: true, targetPlan: { select: { code: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 10,
  });
  return payments.map(payment => ({ ...payment, amount: Number(payment.amount), proofStorageKey: undefined }));
}

export async function submitManualSubscriptionPayment(merchantId: string, input: {
  paymentAccountId: string; transactionRef: string; senderName?: string; transferredAt?: Date;
}, evidence: PrivateEvidence) {
  const [account, changeRequest, currentPayment, settings] = await Promise.all([
    prisma.platformPaymentAccount.findFirst({ where: { id: input.paymentAccountId, isActive: true } }),
    prisma.merchantPlanChangeRequest.findFirst({ where: { merchantId, status: { in: ['PENDING', 'CONTACTED'] } }, include: { targetPlan: { select: { monthlyPrice: true, currency: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.merchantSubscriptionPayment.findFirst({ where: { merchantId, status: { in: ['PENDING', 'VERIFIED'] } } }),
    getPlatformBillingSettings(),
  ]);
  if (!account) throw new NotFoundError('Payment account');
  if (!changeRequest) throw new ValidationError('Request a Pro upgrade before submitting payment');
  if (currentPayment) throw new ConflictError('A subscription payment is already under review or verified');
  const quote = quotePlanInSdg(changeRequest.targetPlan, settings.usdToSdgRate);

  const transactionRef = input.transactionRef.trim().toUpperCase();
  if (transactionRef.length < 4 || transactionRef.length > 100) throw new ValidationError('Transaction reference is invalid');
  if (input.senderName && input.senderName.trim().length > 120) throw new ValidationError('Sender name is too long');
  // datetime-local has no UTC offset. Allow one calendar-day tolerance so a
  // merchant's local clock is not rejected when the server runs in UTC.
  if (input.transferredAt && input.transferredAt.getTime() > Date.now() + 24 * 60 * 60_000) throw new ValidationError('Transfer date cannot be in the future');
  const storageKey = await privateStorageService.upload(evidence.buffer, evidence.filename, evidence.mimeType, `${merchantId}-subscription-payments`);
  try {
    return await prisma.merchantSubscriptionPayment.create({
      data: {
        merchantId,
        targetPlanId: changeRequest.targetPlanId,
        planChangeRequestId: changeRequest.id,
        paymentAccountId: account.id,
        amount: quote.amount,
        currency: 'SDG',
        channel: account.channel,
        transactionRef,
        senderName: input.senderName?.trim() || null,
        transferredAt: input.transferredAt,
        proofStorageKey: storageKey,
        proofMimeType: evidence.mimeType,
        proofSize: evidence.buffer.byteLength,
        proofSha256: evidence.sha256,
      },
      select: { id: true, status: true },
    });
  } catch (error) {
    await privateStorageService.delete(storageKey).catch(() => undefined);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      throw new ConflictError('This transaction reference or receipt was already submitted');
    }
    throw error;
  }
}

export async function listPaymentsForReview() {
  const payments = await prisma.merchantSubscriptionPayment.findMany({
    include: { merchant: { select: { name: true, slug: true } }, targetPlan: { select: { code: true, name: true } }, paymentAccount: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 100,
  });
  return payments.map(payment => ({ ...payment, amount: Number(payment.amount), proofStorageKey: undefined }));
}

export async function reviewSubscriptionPayment(paymentId: string, reviewerId: string, decision: 'VERIFY' | 'REJECT', reason?: string) {
  if (decision === 'REJECT' && !reason?.trim()) throw new ValidationError('Rejection reason is required');
  const now = new Date();
  return prisma.$transaction(async tx => {
    const payment = await tx.merchantSubscriptionPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Subscription payment');
    if (payment.status !== 'PENDING') throw new ConflictError('Payment was already reviewed');
    if (decision === 'REJECT') {
      const rejected = await tx.merchantSubscriptionPayment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'REJECTED', rejectionReason: reason!.trim(), reviewedById: reviewerId, reviewedAt: now } });
      if (rejected.count !== 1) throw new ConflictError('Payment was already reviewed');
      return { success: true };
    }

    const verified = await tx.merchantSubscriptionPayment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'VERIFIED', reviewedById: reviewerId, reviewedAt: now } });
    if (verified.count !== 1) throw new ConflictError('Payment was already reviewed');
    const periodEnd = new Date(now); periodEnd.setMonth(periodEnd.getMonth() + 1);
    const subscription = await tx.merchantSubscription.upsert({
      where: { merchantId: payment.merchantId },
      update: { planId: payment.targetPlanId, status: 'ACTIVE', billingInterval: 'MONTHLY', billingProvider: 'manual', startsAt: now, currentPeriodStartsAt: now, currentPeriodEndsAt: periodEnd, trialStartedAt: null, trialEndsAt: null, graceEndsAt: null, cancelledAt: null, cancelAtPeriodEnd: false, priceOverride: payment.amount, currencyOverride: payment.currency, isGrandfathered: false },
      create: { merchantId: payment.merchantId, planId: payment.targetPlanId, status: 'ACTIVE', billingInterval: 'MONTHLY', billingProvider: 'manual', startsAt: now, currentPeriodStartsAt: now, currentPeriodEndsAt: periodEnd, priceOverride: payment.amount, currencyOverride: payment.currency },
    });
    await tx.merchantSubscriptionEvent.create({
      data: {
        merchantId: payment.merchantId,
        subscriptionId: subscription.id,
        type: 'subscription.activated',
        source: 'manual_payment',
        actorId: reviewerId,
        metadata: { paymentId: payment.id, planId: payment.targetPlanId },
      },
    });
    if (payment.planChangeRequestId) await tx.merchantPlanChangeRequest.update({ where: { id: payment.planChangeRequestId }, data: { status: 'COMPLETED', resolvedAt: now } });
    await evaluateMerchantReferralInTransaction(tx, payment.merchantId, now, payment.id);
    await evaluateMarketerReferralInTransaction(tx, payment.merchantId, now, payment.id);
    return { success: true };
  });
}

export async function getPaymentProof(paymentId: string, actor: { role?: string; merchantId?: string }) {
  const payment = await prisma.merchantSubscriptionPayment.findUnique({ where: { id: paymentId }, select: { merchantId: true, proofStorageKey: true } });
  if (!payment) throw new NotFoundError('Subscription payment');
  if (!isPlatformRole(actor.role ?? '') && actor.merchantId !== payment.merchantId) throw new NotFoundError('Subscription payment');
  return privateStorageService.download(payment.proofStorageKey);
}
