import prisma from '@/lib/db/prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { privateStorageService } from '@/services/storage';
import type { PrivateEvidence } from '@/services/storage/private-evidence-input';
import { isPlatformRole } from '@/lib/platform-permissions';
import { evaluateMerchantReferralInTransaction } from '@/modules/merchant-referrals/merchant-referrals.service';
import { evaluateMarketerReferralInTransaction } from '@/modules/marketer-referrals/marketer-referrals.service';
import { planRequestQuote } from '@/modules/merchant-subscriptions/market-pricing';

export type PlatformPaymentAccountInput = {
  channel: 'BANKAK' | 'MYCASHY' | 'OTHER';
  currency?: 'SDG' | 'SAR';
  label: string;
  accountName: string;
  accountNumber: string;
  instructions?: string;
  sortOrder?: number;
};

const DEFAULT_USD_TO_SDG = 100_000;

export async function getPlatformBillingSettings() {
  const setting = await prisma.platformBillingSettings.findUnique({ where: { id: 'default' } });
  return {
    usdToSdgRate: Number(setting?.usdToSdgRate ?? DEFAULT_USD_TO_SDG),
    onlinePaymentCommissionRate: Number(setting?.onlinePaymentCommissionRate ?? 0),
    onlineSettlementHoldDays: setting?.onlineSettlementHoldDays ?? 7,
    updatedAt: setting?.updatedAt ?? null,
  };
}

export async function setUsdToSdgRate(usdToSdgRate: number, updatedById: string) {
  if (!Number.isFinite(usdToSdgRate) || usdToSdgRate <= 0 || usdToSdgRate > 10_000_000) throw new ValidationError('Exchange rate is invalid');
  return prisma.platformBillingSettings.upsert({ where: { id: 'default' }, update: { usdToSdgRate, updatedById }, create: { id: 'default', usdToSdgRate, updatedById } });
}

export async function setOnlineSettlementSettings(input: { commissionRate: number; holdDays: number }, updatedById: string) {
  if (!Number.isFinite(input.commissionRate) || input.commissionRate < 0 || input.commissionRate > 100) throw new ValidationError('Online payment commission is invalid');
  if (!Number.isInteger(input.holdDays) || input.holdDays < 0 || input.holdDays > 90) throw new ValidationError('Settlement hold period is invalid');
  return prisma.platformBillingSettings.upsert({
    where: { id: 'default' },
    update: { onlinePaymentCommissionRate: input.commissionRate, onlineSettlementHoldDays: input.holdDays, updatedById },
    create: { id: 'default', onlinePaymentCommissionRate: input.commissionRate, onlineSettlementHoldDays: input.holdDays, updatedById },
  });
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
      currency: input.currency ?? 'SDG',
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function setPlatformPaymentAccountActive(id: string, isActive: boolean) {
  const account = await prisma.platformPaymentAccount.findUnique({ where: { id }, select: { id: true } });
  if (!account) throw new NotFoundError('Payment account');
  return prisma.platformPaymentAccount.update({ where: { id }, data: { isActive } });
}

export async function listActivePaymentAccounts(currency?: string) {
  const accounts = await prisma.platformPaymentAccount.findMany({ where: { isActive: true, ...(currency ? { currency } : {}) }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return accounts.map(account => ({ ...account, monthlyAmount: Number(account.monthlyAmount) }));
}

export async function updatePlatformPaymentAccount(id: string, input: PlatformPaymentAccountInput) {
  const account = await prisma.platformPaymentAccount.findUnique({ where: { id }, select: { id: true } });
  if (!account) throw new NotFoundError('Payment account');
  return prisma.platformPaymentAccount.update({ where: { id }, data: {
    channel: input.channel, label: input.label.trim(), accountName: input.accountName.trim(), accountNumber: input.accountNumber.trim(),
    instructions: input.instructions?.trim() || null, sortOrder: input.sortOrder ?? 0, currency: input.currency ?? 'SDG',
  } });
}

export async function getManualPaymentQuote(merchantId: string, planChangeRequestId?: string) {
  const [request, settings] = await Promise.all([
    prisma.merchantPlanChangeRequest.findFirst({ where: { id: planChangeRequestId, merchantId, status: { in: ['PENDING', 'CONTACTED'] } }, include: { targetPlan: { select: { code: true, name: true, monthlyPrice: true, yearlyPrice: true, currency: true } }, }, orderBy: { createdAt: 'desc' } }),
    getPlatformBillingSettings(),
  ]);
  if (!request) return null;
  const locked = planRequestQuote(request);
  const currency = locked.currency === 'SAR' ? 'SAR' : 'SDG';
  const quote = currency === 'SAR' ? { amount: locked.amount } : quotePlanInSdg({ monthlyPrice: locked.amount, currency: locked.currency }, settings.usdToSdgRate);
  return { planCode: request.targetPlan.code, planName: request.targetPlan.name, planCurrency: locked.currency, planMonthlyPrice: locked.amount, usdToSdgRate: settings.usdToSdgRate, amount: quote.amount, currency };
}

export async function listMerchantPayments(merchantId: string) {
  const payments = await prisma.merchantSubscriptionPayment.findMany({
    where: { merchantId }, include: { paymentAccount: true, targetPlan: { select: { code: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 10,
  });
  return payments.map(payment => ({ ...payment, amount: Number(payment.amount), hasProof: Boolean(payment.proofStorageKey), proofStorageKey: undefined }));
}

export async function submitManualSubscriptionPayment(merchantId: string, input: {
  planChangeRequestId?: string; paymentAccountId: string; transactionRef: string; senderName?: string; transferredAt?: Date;
}, evidence: PrivateEvidence) {
  const [account, changeRequest, currentPayment, settings, stripeSubscription] = await Promise.all([
    prisma.platformPaymentAccount.findFirst({ where: { id: input.paymentAccountId, isActive: true } }),
    prisma.merchantPlanChangeRequest.findFirst({ where: { id: input.planChangeRequestId, merchantId, status: { in: ['PENDING', 'CONTACTED'] } }, include: { targetPlan: { select: { monthlyPrice: true, yearlyPrice: true, currency: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.merchantSubscriptionPayment.findFirst({ where: { merchantId, OR: [{ status: 'PENDING' }, { planChangeRequestId: input.planChangeRequestId, status: 'VERIFIED' }] } }),
    getPlatformBillingSettings(),
    prisma.merchantSubscription.findFirst({ where: { merchantId, billingProvider: 'stripe', externalSubscriptionId: { not: null }, status: { not: 'CANCELLED' } }, select: { id: true } }),
  ]);
  if (!account) throw new NotFoundError('Payment account');
  if (!changeRequest) throw new ValidationError('Request a Pro upgrade before submitting payment');
  if (currentPayment) throw new ConflictError('A subscription payment is already under review or verified');
  if (stripeSubscription) throw new ConflictError('Cancel the active Stripe subscription before paying by transfer');
  const locked = planRequestQuote(changeRequest);
  const currency = locked.currency === 'SAR' ? 'SAR' : 'SDG';
  const quote = currency === 'SAR' ? { amount: locked.amount } : quotePlanInSdg({ monthlyPrice: locked.amount, currency: locked.currency }, settings.usdToSdgRate);
  if (account.currency !== currency) throw new ValidationError('اختر حساب تحويل بعملة الباقة.');

  const transactionRef = input.transactionRef.trim().toUpperCase();
  if (transactionRef.length < 4 || transactionRef.length > 100) throw new ValidationError('Transaction reference is invalid');
  if (input.senderName && input.senderName.trim().length > 120) throw new ValidationError('Sender name is too long');
  // datetime-local has no UTC offset. Allow one calendar-day tolerance so a
  // merchant's local clock is not rejected when the server runs in UTC.
  if (input.transferredAt && input.transferredAt.getTime() > Date.now() + 24 * 60 * 60_000) throw new ValidationError('Transfer date cannot be in the future');
  const storageKey = await privateStorageService.upload(evidence.buffer, evidence.filename, evidence.mimeType, `${merchantId}-subscription-payments`);
  try {
    return await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM merchants WHERE id = ${merchantId} FOR UPDATE`;
      if (!await tx.merchantPlanChangeRequest.findFirst({ where: { id: changeRequest.id, merchantId, status: { in: ['PENDING', 'CONTACTED'] } } })) throw new ConflictError('تغير اختيار الباقة. افتح إتمام الاشتراك من الباقة الجديدة.');
      const busy = await tx.onlineCheckoutAttempt.findFirst({ where: { merchantId, purpose: 'SUBSCRIPTION', status: { in: ['CREATING', 'READY', 'DECLINED', 'UNKNOWN'] } } });
      const duplicate = await tx.merchantSubscriptionPayment.findFirst({ where: { merchantId, OR: [{ status: 'PENDING' }, { planChangeRequestId: changeRequest.id, status: 'VERIFIED' }] } });
      if (busy || duplicate) throw new ConflictError('توجد عملية سداد قيد المتابعة. انتظر نتيجتها قبل التحويل.');
      return tx.merchantSubscriptionPayment.create({
      data: {
        merchantId,
        targetPlanId: changeRequest.targetPlanId,
        planChangeRequestId: changeRequest.id,
        paymentAccountId: account.id,
        amount: quote.amount,
        currency,
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
  return payments.map(payment => ({ ...payment, amount: Number(payment.amount), hasProof: Boolean(payment.proofStorageKey), proofStorageKey: undefined }));
}

export async function reviewSubscriptionPayment(paymentId: string, reviewerId: string, decision: 'VERIFY' | 'REJECT', reason?: string) {
  if (decision === 'REJECT' && !reason?.trim()) throw new ValidationError('Rejection reason is required');
  const now = new Date();
  return prisma.$transaction(async tx => {
    const payment = await tx.merchantSubscriptionPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Subscription payment');
    if (payment.provider !== 'manual') throw new ValidationError('Stripe payments are verified automatically');
    if (payment.status !== 'PENDING') throw new ConflictError('Payment was already reviewed');
    if (decision === 'REJECT') {
      const rejected = await tx.merchantSubscriptionPayment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'REJECTED', rejectionReason: reason!.trim(), reviewedById: reviewerId, reviewedAt: now } });
      if (rejected.count !== 1) throw new ConflictError('Payment was already reviewed');
      return { success: true };
    }

    await tx.$queryRaw`SELECT id FROM merchants WHERE id = ${payment.merchantId} FOR UPDATE`;
    const request = payment.planChangeRequestId ? await tx.merchantPlanChangeRequest.findUnique({ where: { id: payment.planChangeRequestId } }) : null;
    if (request && !['PENDING', 'CONTACTED'].includes(request.status)) throw new ConflictError('طلب الباقة تمت معالجته بالفعل.');
    const current = await tx.merchantSubscription.findUnique({ where: { merchantId: payment.merchantId } });
    if (current?.externalSubscriptionId && current.status !== 'CANCELLED') throw new ConflictError('راجع الاشتراك الإلكتروني القائم قبل تفعيل التحويل.');
    const interval = request?.billingInterval ?? 'MONTHLY';
    const start = current?.billingProvider === 'manual' && current.planId === payment.targetPlanId && current.currentPeriodEndsAt && current.currentPeriodEndsAt > now ? current.currentPeriodEndsAt : now;
    const verified = await tx.merchantSubscriptionPayment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'VERIFIED', reviewedById: reviewerId, reviewedAt: now } });
    if (verified.count !== 1) throw new ConflictError('Payment was already reviewed');
    const periodEnd = new Date(start); const day = periodEnd.getUTCDate(); periodEnd.setUTCDate(1);
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + (interval === 'YEARLY' ? 12 : 1));
    periodEnd.setUTCDate(Math.min(day, new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth() + 1, 0)).getUTCDate()));
    const subscription = await tx.merchantSubscription.upsert({
      where: { merchantId: payment.merchantId },
      update: { planId: payment.targetPlanId, status: 'ACTIVE', billingInterval: interval, billingProvider: 'manual', startsAt: now, currentPeriodStartsAt: now, currentPeriodEndsAt: periodEnd, trialStartedAt: null, trialEndsAt: null, graceEndsAt: null, cancelledAt: null, cancelAtPeriodEnd: false, priceOverride: payment.amount, currencyOverride: payment.currency, isGrandfathered: false },
      create: { merchantId: payment.merchantId, planId: payment.targetPlanId, status: 'ACTIVE', billingInterval: interval, billingProvider: 'manual', startsAt: now, currentPeriodStartsAt: now, currentPeriodEndsAt: periodEnd, priceOverride: payment.amount, currencyOverride: payment.currency },
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
    if (payment.planChangeRequestId) await tx.merchantPlanChangeRequest.update({ where: { id: payment.planChangeRequestId }, data: { status: 'COMPLETED', resolvedAt: now, requestKey: null } });
    await evaluateMerchantReferralInTransaction(tx, payment.merchantId, now, payment.id);
    await evaluateMarketerReferralInTransaction(tx, payment.merchantId, now, payment.id);
    return { success: true };
  });
}

export async function getPaymentProof(paymentId: string, actor: { role?: string; merchantId?: string }) {
  const payment = await prisma.merchantSubscriptionPayment.findUnique({ where: { id: paymentId }, select: { merchantId: true, proofStorageKey: true } });
  if (!payment) throw new NotFoundError('Subscription payment');
  if (!isPlatformRole(actor.role ?? '') && actor.merchantId !== payment.merchantId) throw new NotFoundError('Subscription payment');
  if (!payment.proofStorageKey) throw new NotFoundError('Payment proof');
  return privateStorageService.download(payment.proofStorageKey);
}
