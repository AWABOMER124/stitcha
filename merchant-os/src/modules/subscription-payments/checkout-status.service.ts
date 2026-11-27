import prisma from '@/lib/db/prisma';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { requestPlanChange } from '@/modules/merchant-subscriptions/merchant-subscriptions.service';
import { reconcileStripeSubscriptionAttempt } from '@/modules/stripe-payments/stripe-payments.service';
import { reconcilePaymobSubscriptionAttempt } from '@/modules/paymob-payments/paymob-payments.service';

export type SubscriptionCheckoutState = 'CHOOSE' | 'AWAITING_PAYMENT' | 'CHECKING' | 'MANUAL_REVIEW' | 'ACTIVE' | 'NOT_COMPLETED';
export interface SubscriptionCheckoutStatus {
  state: SubscriptionCheckoutState;
  needsReview: boolean;
  reason?: string;
  reference?: string;
  canRetry: boolean;
  checkoutPath?: string;
}

export function listUnresolvedSubscriptionCheckouts() {
  return prisma.onlineCheckoutAttempt.findMany({ where: { purpose: 'SUBSCRIPTION', status: { in: ['UNKNOWN', 'CREATING'] }, createdAt: { lt: new Date(Date.now() - 5 * 60_000) } }, orderBy: { createdAt: 'asc' }, take: 50 });
}

export async function getSubscriptionCheckoutStatus(merchantId: string, requestId: string): Promise<SubscriptionCheckoutStatus> {
  const [request, payment, attempt, outstanding, otherAttempt] = await Promise.all([
    prisma.merchantPlanChangeRequest.findFirst({ where: { id: requestId, merchantId } }),
    prisma.merchantSubscriptionPayment.findFirst({ where: { merchantId, planChangeRequestId: requestId }, orderBy: { createdAt: 'desc' } }),
    prisma.onlineCheckoutAttempt.findFirst({ where: { merchantId, purpose: 'SUBSCRIPTION', referenceId: requestId }, orderBy: { createdAt: 'desc' } }),
    prisma.merchantSubscriptionPayment.findFirst({ where: { merchantId, provider: 'manual', status: 'PENDING' } }),
    prisma.onlineCheckoutAttempt.findFirst({ where: { merchantId, purpose: 'SUBSCRIPTION', referenceId: { not: requestId }, status: { in: ['CREATING', 'UNKNOWN', 'READY', 'DECLINED'] } } }),
  ]);
  if (!request) throw new NotFoundError('Subscription request');
  if (request.status === 'COMPLETED' && payment?.status === 'VERIFIED') return { state: 'ACTIVE', needsReview: false, canRetry: false };
  if (otherAttempt) return { state: 'CHECKING', needsReview: false, canRetry: false, checkoutPath: `/dashboard/subscription/checkout?request=${otherAttempt.referenceId}` };
  if (payment?.status === 'PENDING' && payment.provider === 'manual' || outstanding) return { state: 'MANUAL_REVIEW', needsReview: false, canRetry: false, reference: payment?.id ?? outstanding?.id };
  if (attempt && ['CREATING', 'UNKNOWN', 'READY', 'DECLINED', 'SUCCEEDED'].includes(attempt.status)) {
    const uncertain = ['CREATING', 'UNKNOWN'].includes(attempt.status) || attempt.expiresAt <= new Date();
    return { state: uncertain || attempt.status === 'SUCCEEDED' ? 'CHECKING' : 'AWAITING_PAYMENT', needsReview: uncertain && attempt.createdAt.getTime() < Date.now() - 5 * 60_000, canRetry: false, reference: attempt.id, reason: attempt.status === 'DECLINED' ? 'لم تكتمل محاولة الدفع. أعد المحاولة من صفحة الدفع الآمنة نفسها؛ لن ننشئ عملية إضافية.' : undefined };
  }
  if (payment?.status === 'REJECTED' || attempt && ['FAILED', 'EXPIRED'].includes(attempt.status)) return { state: 'NOT_COMPLETED', needsReview: false, canRetry: true, reason: payment?.status === 'REJECTED' ? payment.rejectionReason ?? undefined : undefined };
  if (!['PENDING', 'CONTACTED'].includes(request.status)) return { state: 'NOT_COMPLETED', needsReview: false, canRetry: false };
  return { state: 'CHOOSE', needsReview: false, canRetry: false };
}

export async function refreshSubscriptionCheckoutStatus(merchantId: string, requestId: string) {
  await getSubscriptionCheckoutStatus(merchantId, requestId); // ownership before upstream inquiry
  try { await Promise.all([reconcilePaymobSubscriptionAttempt(merchantId, requestId), reconcileStripeSubscriptionAttempt(merchantId, requestId)]); } catch {
    // A temporary inquiry failure must never be shown as a declined payment.
  }
  return getSubscriptionCheckoutStatus(merchantId, requestId);
}

export async function retrySubscriptionCheckout(merchantId: string, requestId: string) {
  const selected = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM merchants WHERE id = ${merchantId} FOR UPDATE`;
    const request = await tx.merchantPlanChangeRequest.findFirst({ where: { id: requestId, merchantId }, include: { targetPlan: true } });
    if (!request) throw new NotFoundError('Subscription request');
    const [attempt, payment, unresolved, manual] = await Promise.all([
      tx.onlineCheckoutAttempt.findFirst({ where: { merchantId, purpose: 'SUBSCRIPTION', referenceId: requestId } }),
      tx.merchantSubscriptionPayment.findFirst({ where: { merchantId, planChangeRequestId: requestId }, orderBy: { createdAt: 'desc' } }),
      tx.onlineCheckoutAttempt.findFirst({ where: { merchantId, purpose: 'SUBSCRIPTION', status: { in: ['CREATING', 'READY', 'DECLINED', 'UNKNOWN'] } } }),
      tx.merchantSubscriptionPayment.findFirst({ where: { merchantId, status: 'PENDING' } }),
    ]);
    if (unresolved || manual || payment?.status === 'VERIFIED' || !['PENDING', 'CONTACTED'].includes(request.status)
      || !(payment?.status === 'REJECTED' || attempt && ['FAILED', 'EXPIRED'].includes(attempt.status))) throw new ConflictError('نتيجة الدفع لم تتأكد بعد. لا تبدأ عملية أخرى.');
    await tx.merchantPlanChangeRequest.update({ where: { id: request.id }, data: { status: 'REJECTED', requestKey: null, resolvedAt: new Date() } });
    return { code: request.targetPlan.code, interval: request.billingInterval === 'YEARLY' ? 'YEARLY' as const : 'MONTHLY' as const };
  });
  // A fresh reference preserves the old payment and receipt audit trail.
  return requestPlanChange(merchantId, selected.code, undefined, selected.interval, { notifyPlatform: false });
}

export async function reconcilePendingSubscriptionPayments(now = new Date()) {
  const attempts = await prisma.onlineCheckoutAttempt.findMany({ where: { purpose: 'SUBSCRIPTION', status: { in: ['READY', 'DECLINED', 'UNKNOWN', 'CREATING'] }, createdAt: { gte: new Date(now.getTime() - 7 * 86400_000), lt: new Date(now.getTime() - 60_000) }, updatedAt: { lt: new Date(now.getTime() - 60_000) } }, orderBy: { updatedAt: 'asc' }, take: 3 });
  await Promise.all(attempts.map(async attempt => {
    try { await refreshSubscriptionCheckoutStatus(attempt.merchantId, attempt.referenceId); }
    finally { await prisma.onlineCheckoutAttempt.updateMany({ where: { id: attempt.id, status: { in: ['READY', 'DECLINED', 'UNKNOWN'] } }, data: { updatedAt: now } }); }
  }));
  return attempts.length;
}
