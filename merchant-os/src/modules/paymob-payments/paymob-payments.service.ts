import { createHash } from 'node:crypto';
import type { Prisma, OnlineCheckoutAttempt } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { recordAssistedSalePayment } from '@/modules/assisted-sales/payment-events';
import { decryptSecret, encryptSecret } from '@/lib/crypto/secret';
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { getPaymobGateway } from './paymob-settings.service';
import { PaymobCreationRejected, identifier } from '@/services/payment-gateways/paymob.gateway';
import { planRequestQuote } from '@/modules/merchant-subscriptions/market-pricing';
import { isMerchantEligibleForCentralStripe } from '@/modules/stripe-payments/stripe-payments.service';
import { getPlatformBillingSettings } from '@/modules/subscription-payments/subscription-payments.service';
import { evaluateMerchantReferralInTransaction } from '@/modules/merchant-referrals/merchant-referrals.service';
import { evaluateMarketerReferralInTransaction } from '@/modules/marketer-referrals/marketer-referrals.service';
import { recordOnlinePaymentEntry } from '@/modules/online-settlements/online-settlements.service';
import { paymobPhone } from '@/services/payment-gateways/paymob.gateway';

export async function createPaymobSubscriptionCheckout(input: { planChangeRequestId?: string; merchantId: string; customerEmail?: string | null; origin: string }) {
  const merchant = await requireSaudiMerchant(input.merchantId);
  const request = await prisma.merchantPlanChangeRequest.findFirst({ where: { id: input.planChangeRequestId, merchantId: merchant.id, status: { in: ['PENDING', 'CONTACTED'] } }, include: { targetPlan: true }, orderBy: { createdAt: 'desc' } });
  if (!request) throw new ValidationError('اختر الباقة قبل بدء الدفع.');
  const [current, other] = await Promise.all([
    prisma.merchantSubscription.findUnique({ where: { merchantId: merchant.id } }),
    prisma.merchantSubscriptionPayment.findFirst({ where: { merchantId: merchant.id, status: 'PENDING', provider: 'manual' } }),
  ]);
  if (current?.externalSubscriptionId && current.status !== 'CANCELLED') throw new ConflictError('راجع الاشتراك القائم قبل بدء اشتراك آخر.');
  if (other) throw new ConflictError('يوجد تحويل قيد المراجعة.');
  const quote = planRequestQuote(request);
  if (quote.currency !== 'SAR' || !request.targetPlan.code.startsWith('SA_')) throw new ValidationError('الباقة لا تطابق سوق السعودية.');
  return createIntention({ merchantId: merchant.id, purpose: 'SUBSCRIPTION', referenceId: request.id, amountMinor: sarMinor(quote.amount),
    itemName: `WASLA ${request.targetPlan.name}`, name: merchant.name, phone: merchant.phone, email: input.customerEmail ?? undefined, origin: input.origin,
    returnPath: `/dashboard/subscription/checkout?request=${request.id}&payment=returned` });
}

export async function createPaymobOrderCheckout(input: { merchantId: string; orderId: string; origin: string; returnPath?: string }) {
  await requireSaudiMerchant(input.merchantId);
  if (!await isMerchantEligibleForCentralStripe(input.merchantId)) throw new BusinessRuleError('أكمل التوثيق وبيانات استلام المستحقات لتفعيل الدفع الإلكتروني.');
  const order = await prisma.order.findFirst({ where: { id: input.orderId, merchantId: input.merchantId }, include: { merchant: true, customer: true, payment: true } });
  if (!order?.payment || order.payment.method !== 'ONLINE' || order.payment.status !== 'PENDING') throw new ConflictError('الطلب ليس بانتظار الدفع الإلكتروني.');
  if (order.payment.transactionRef && !order.payment.transactionRef.startsWith('paymob:')) throw new ConflictError('توجد محاولة دفع عبر بوابة سابقة. راجع نتيجتها قبل استخدام Paymob.');
  if (order.merchant.currency !== 'SAR') throw new ValidationError('المتجر السعودي يحتاج تسعير الطلب بالريال السعودي للدفع عبر Paymob.');
  return createIntention({ merchantId: input.merchantId, purpose: 'ORDER', referenceId: order.id, amountMinor: sarMinor(Number(order.payment.amount)),
    itemName: `طلب ${order.orderNumber} — ${order.merchant.name}`, name: order.customerName || order.customer.name,
      phone: order.customerPhone || order.customer.phone, email: order.customer.email ?? undefined, origin: input.origin, returnPath: input.returnPath ?? `/store/${order.merchant.slug}/order/${order.id}?paymob=returned` });
}

async function requireSaudiMerchant(id: string) {
  const merchant = await prisma.merchant.findUnique({ where: { id } });
  if (!merchant || merchant.subscriptionMarket !== 'SA') throw new ValidationError('Paymob متاح لسوق السعودية فقط.');
  return merchant;
}

async function createIntention(input: { merchantId: string; purpose: string; referenceId: string; amountMinor: number; itemName: string; name: string; phone: string | null; email?: string; origin: string; returnPath: string }) {
  const { gateway, config } = await getPaymobGateway();
  if (!gateway.status().enabled || !gateway.status().configured || (process.env.NODE_ENV === 'production' && config.mode !== 'LIVE')) throw new BusinessRuleError('الدفع عبر Paymob بانتظار تفعيل مفاتيح التشغيل.');
  const phone = paymobPhone(input.phone || '');
  if (!/^\+[1-9][0-9]{6,14}$/.test(phone)) throw new ValidationError('أكمل رقم هاتف صحيحًا قبل الدفع.');
  const key = { provider_purpose_referenceId: { provider: 'paymob', purpose: input.purpose, referenceId: input.referenceId } };
  let attempt = await prisma.onlineCheckoutAttempt.findUnique({ where: key });
  if (attempt) {
    if (attempt.merchantId !== input.merchantId || Number(attempt.amountMinor) !== input.amountMinor || attempt.currency !== 'SAR') throw new ConflictError('تغيرت قيمة الطلب. راجع حالة الدفع القائمة.');
    if (['READY', 'DECLINED'].includes(attempt.status) && attempt.checkoutSecretEncrypted && attempt.expiresAt > new Date()) return { provider: 'PAYMOB' as const, sessionId: attempt.providerIntentionId!, checkoutUrl: gateway.checkoutUrl(decryptSecret(attempt.checkoutSecretEncrypted)) };
    throw new ConflictError('توجد محاولة دفع لهذا الطلب. راجع نتيجتها قبل إنشاء محاولة أخرى.');
  }
  try {
    attempt = await prisma.$transaction(async tx => {
      if (input.purpose === 'SUBSCRIPTION') {
        await tx.$queryRaw`SELECT id FROM merchants WHERE id = ${input.merchantId} FOR UPDATE`;
        if (!await tx.merchantPlanChangeRequest.findFirst({ where: { id: input.referenceId, merchantId: input.merchantId, status: { in: ['PENDING', 'CONTACTED'] } } })) throw new ConflictError('تغير اختيار الباقة. افتح إتمام الاشتراك من الباقة الجديدة.');
        const blocked = await tx.onlineCheckoutAttempt.findFirst({ where: { merchantId: input.merchantId, purpose: 'SUBSCRIPTION', status: { in: ['CREATING', 'READY', 'DECLINED', 'UNKNOWN'] } } });
        const manual = await tx.merchantSubscriptionPayment.findFirst({ where: { merchantId: input.merchantId, provider: 'manual', status: 'PENDING' } });
        if (blocked || manual) throw new ConflictError('توجد عملية دفع قيد المتابعة. افتح حالة اشتراكك قبل بدء عملية أخرى.');
      }
      return tx.onlineCheckoutAttempt.create({ data: { provider: 'paymob', merchantId: input.merchantId, purpose: input.purpose, referenceId: input.referenceId,
      amountMinor: BigInt(input.amountMinor), currency: 'SAR', mode: config.mode, integrationIds: config.integrationIds, expiresAt: new Date(Date.now() + 3900_000) } });
    });
  } catch (error) {
    if (uniqueConflict(error)) throw new ConflictError('الدفع قيد التجهيز. انتظر نتيجة المحاولة الحالية.');
    throw error;
  }
  try {
    const names = input.name.trim().split(/\s+/); const origin = new URL(input.origin).origin;
    const result = await gateway.createIntention({ reference: attempt.id, amountMinor: input.amountMinor, itemName: input.itemName,
      firstName: names[0] || 'عميل', lastName: names.slice(1).join(' ') || names[0] || 'وصلة', phone, email: input.email,
      notificationUrl: `${origin}/api/paymob/webhook`, returnUrl: `${origin}${input.returnPath}` });
    const saved = await prisma.onlineCheckoutAttempt.updateMany({ where: { id: attempt.id, status: 'CREATING' }, data: { status: 'READY', providerIntentionId: result.id, providerOrderId: result.orderId, checkoutSecretEncrypted: encryptSecret(result.clientSecret) } });
    if (saved.count !== 1) throw new ConflictError('تعذر تأكيد حفظ جلسة الدفع.');
    return { provider: 'PAYMOB' as const, sessionId: result.id, checkoutUrl: gateway.checkoutUrl(result.clientSecret) };
  } catch (error) {
    // A timeout may follow successful creation upstream. Never create another
    // intention automatically, and never cancel a possibly paid internal order.
    await prisma.onlineCheckoutAttempt.updateMany({ where: { id: attempt.id, status: 'CREATING' }, data: { status: error instanceof PaymobCreationRejected ? 'FAILED' : 'UNKNOWN' } });
    if (error instanceof PaymobCreationRejected) throw error;
    throw new BusinessRuleError('لم تتأكد نتيجة تجهيز الدفع. الطلب محفوظ؛ راجع حالة الدفع قبل المحاولة مجددًا.');
  }
}

export async function processPaymobWebhook(rawBody: string, signature: string | null) {
  const { gateway } = await getPaymobGateway();
  const callback = gateway.verifyCallback(rawBody, signature);
  const transactionId = identifier(callback.id); const orderId = identifier((callback.order as Record<string, unknown>)?.id);
  if (!transactionId || !orderId) throw new ValidationError('Invalid Paymob reference');
  const remote = await gateway.retrieveTransaction(transactionId);
  if (identifier(remote.id) !== transactionId || identifier((remote.order as Record<string, unknown>)?.id) !== orderId
    || remote.currency !== callback.currency || remote.amount_cents !== callback.amount_cents || Number(remote.integration_id) !== Number(callback.integration_id)
    || String(remote.owner) !== String(callback.owner)) throw new ValidationError('Paymob inquiry does not match the signed callback');
  return applyAuthenticatedPaymobTransaction(remote);
}

async function applyAuthenticatedPaymobTransaction(remote: Record<string, unknown>) {
  const { gateway } = await getPaymobGateway();
  const transactionId = identifier(remote.id); const orderId = identifier((remote.order as Record<string, unknown>)?.id);
  if (!transactionId || !orderId) throw new ValidationError('Invalid verified transaction');
  // A successful upstream creation can outlive a lost HTTP response. Only the
  // authenticated inquiry may supply the fallback reference, never the unsigned
  // merchant_order_id in the callback body.
  const verifiedReference = identifier((remote.order as Record<string, unknown>)?.merchant_order_id);
  const byOrder = await prisma.onlineCheckoutAttempt.findUnique({ where: { providerOrderId: orderId } });
  const attempt = byOrder ?? (verifiedReference ? await prisma.onlineCheckoutAttempt.findUnique({ where: { id: verifiedReference } }) : null);
  if (!attempt || attempt.provider !== 'paymob') throw new NotFoundError('Paymob checkout');
  if (!byOrder && (attempt.providerOrderId || attempt.status !== 'UNKNOWN')) throw new ConflictError('Paymob reference requires reconciliation');
  const parent = identifier(typeof remote.parent_transaction === 'object' && remote.parent_transaction ? (remote.parent_transaction as Record<string, unknown>).id : remote.parent_transaction);
  const originalId = attempt.providerTransactionId || (remote.has_parent_transaction === true ? parent : transactionId);
  if (!originalId) throw new ValidationError('Paymob parent transaction needs reconciliation');
  if (attempt.providerTransactionId && attempt.providerTransactionId !== transactionId && remote.has_parent_transaction !== true) throw new ConflictError('A second payment requires reconciliation');
  const original = originalId === transactionId ? remote : await gateway.retrieveTransaction(originalId);
  if (identifier(original.id) !== originalId || identifier((original.order as Record<string, unknown>)?.id) !== orderId || String(original.owner) !== String(remote.owner)
    || attempt.currency !== 'SAR' || original.currency !== 'SAR' || Number(attempt.amountMinor) !== original.amount_cents || !Array.isArray(attempt.integrationIds) || !attempt.integrationIds.includes(Number(original.integration_id))) throw new ValidationError('Paymob payment does not match the locked quote');
  if (typeof original.is_live === 'boolean' && original.is_live !== (attempt.mode === 'LIVE')) throw new ValidationError('Paymob payment mode mismatch');
  if (typeof original.is_test === 'boolean' && original.is_test !== (attempt.mode === 'TEST')) throw new ValidationError('Paymob payment mode mismatch');
  if (process.env.NODE_ENV === 'production' && attempt.mode !== 'LIVE') return { ignored: true, reason: 'test_payment' };
  if (original.pending !== false || original.success !== true || original.error_occured !== false || original.is_auth === true || original.has_parent_transaction === true) {
    return { ignored: true, reason: 'not_a_completed_sale' };
  }
  const refunded = original.is_voided === true ? Number(attempt.amountMinor) : original.refunded_amount_cents ?? 0;
  if (!Number.isSafeInteger(refunded) || Number(refunded) < 0 || Number(refunded) > Number(attempt.amountMinor) || (original.is_refunded === true && Number(refunded) === 0)) throw new ValidationError('Paymob refund amount needs reconciliation');
  const eventKey = `${originalId}:paid`;
  const digest = createHash('sha256').update(JSON.stringify(remote)).digest('hex');
  const billing = await getPlatformBillingSettings();
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM online_checkout_attempts WHERE id = ${attempt.id} FOR UPDATE`;
    const current = await tx.onlineCheckoutAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    if (current.providerOrderId && current.providerOrderId !== orderId) throw new ConflictError('Paymob order reference changed');
    const duplicate = current.status === 'SUCCEEDED';
    if (duplicate && current.providerTransactionId !== originalId) throw new ConflictError('A second payment requires reconciliation');
    if (!duplicate) {
      if (current.purpose === 'SUBSCRIPTION') await completeSubscription(tx, current, originalId);
      else if (current.purpose === 'ORDER') await completeOrder(tx, current, originalId, billing.onlineSettlementHoldDays);
      else throw new ValidationError('Unknown checkout purpose');
      await tx.onlineCheckoutAttempt.update({ where: { id: current.id }, data: { status: 'SUCCEEDED', providerOrderId: orderId, providerTransactionId: originalId, completedAt: new Date() } });
    }
    const refundChanged = Number(refunded) > Number(current.refundedMinor);
    if (refundChanged) await applyVerifiedRefund(tx, current, originalId, Number(refunded), digest);
    await tx.billingWebhookEvent.upsert({ where: { provider_externalEventId: { provider: 'paymob', externalEventId: eventKey } }, update: {}, create: {
      provider: 'paymob', externalEventId: eventKey, eventType: 'payment.succeeded', payloadSha256: digest, status: 'PROCESSED', processedAt: new Date() } });
    return { duplicate: duplicate && !refundChanged, processed: true, refundChanged };
  });
}

async function applyVerifiedRefund(tx: Prisma.TransactionClient, attempt: OnlineCheckoutAttempt, transactionId: string, cumulative: number, digest: string) {
  const delta = cumulative - Number(attempt.refundedMinor); const full = cumulative === Number(attempt.amountMinor);
  if (delta <= 0) return;
  if (attempt.purpose === 'ORDER') {
    const payment = await tx.payment.findUniqueOrThrow({ where: { orderId: attempt.referenceId } });
    if (full) await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
    if (attempt.mode !== 'TEST') {
      const reference = `paymob:payment:${transactionId}`;
      await tx.$queryRaw`SELECT id FROM merchant_settlement_entries WHERE "providerReference" = ${reference} FOR UPDATE`;
      const original = await tx.merchantSettlementEntry.findUniqueOrThrow({ where: { providerReference: reference } });
      await tx.merchantSettlementEntry.create({ data: { merchantId: attempt.merchantId, orderId: attempt.referenceId, paymentId: payment.id, provider: 'paymob',
        providerReference: `paymob:refund:${transactionId}:${cumulative}`, type: 'REFUND', status: original.feeReconciled && !original.payoutBlocked && original.availableAt <= new Date() ? 'AVAILABLE' : 'HELD', payoutBlocked: original.payoutBlocked,
        feeReconciled: original.feeReconciled, grossAmount: -delta / 100, processingFee: 0, platformFee: 0, netAmount: -delta / 100, currency: 'SAR', availableAt: original.availableAt,
        metadata: { originalEntryId: original.id, transactionId, cumulativeRefundMinor: cumulative } } });
      if (full && original.payoutBlocked) await tx.merchantSettlementEntry.updateMany({ where: { orderId: attempt.referenceId, provider: 'paymob', payoutBlocked: true }, data: { payoutBlocked: false } });
    }
  } else {
    const payment = await tx.merchantSubscriptionPayment.findUniqueOrThrow({ where: { externalCheckoutId: `paymob:${attempt.providerIntentionId || attempt.id}` } });
    const latest = await tx.merchantSubscriptionPayment.findFirst({ where: { merchantId: attempt.merchantId, provider: 'paymob', status: 'VERIFIED' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
    if (full) {
      await tx.merchantSubscriptionPayment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
      if (latest?.id === payment.id) await restorePreviousPaymobPeriod(tx, attempt);
    }
    const remaining = Number(attempt.amountMinor) - cumulative;
    const merchantCommission = await tx.merchantReferralCommission.findUnique({ where: { subscriptionPaymentId: payment.id } });
    const marketerCommission = await tx.marketerSubscriptionCommission.findUnique({ where: { subscriptionPaymentId: payment.id } });
    for (const [kind, commission] of [['merchant', merchantCommission], ['marketer', marketerCommission]] as const) {
      if (!commission) continue;
      const update = async (data: { note: string; grossAmount?: number; amount?: number; status?: 'REVERSED' | 'PENDING'; reversedAt?: Date | null }) => {
        if (kind === 'merchant') await tx.merchantReferralCommission.update({ where: { id: commission.id }, data });
        else await tx.marketerSubscriptionCommission.update({ where: { id: commission.id }, data });
      };
      if (commission.status === 'FULFILLED') {
        await update({ note: 'استرداد Paymob: يلزم مراجعة العمولة التي سبق صرفها.' });
      } else if (['PENDING', 'APPROVED'].includes(commission.status)) {
        const rateBps = Math.round(Number(commission.commissionRate) * 100);
        const amount = Math.floor((remaining * rateBps + 5000) / 10000) / 100;
        await update({ grossAmount: remaining / 100, amount, status: full ? 'REVERSED' : 'PENDING', reversedAt: full ? new Date() : null,
          note: 'أعيد احتساب العمولة بعد استرداد Paymob.' });
      }
    }
    const subscription = await tx.merchantSubscription.findUnique({ where: { merchantId: attempt.merchantId } });
    await tx.merchantSubscriptionEvent.create({ data: { merchantId: attempt.merchantId, subscriptionId: subscription?.id, type: 'subscription.payment_refunded', source: 'paymob',
      metadata: { transactionId, cumulativeRefundMinor: cumulative, full } } });
  }
  await tx.onlineCheckoutAttempt.update({ where: { id: attempt.id }, data: { refundedMinor: BigInt(cumulative) } });
  await tx.billingWebhookEvent.create({ data: { provider: 'paymob', externalEventId: `${transactionId}:refund:${cumulative}`, eventType: 'payment.refunded', payloadSha256: digest, status: 'PROCESSED', processedAt: new Date() } });
}

async function completeOrder(tx: Prisma.TransactionClient, attempt: OnlineCheckoutAttempt, transactionId: string, holdDays: number) {
  await tx.$queryRaw`SELECT id FROM orders WHERE id = ${attempt.referenceId} FOR UPDATE`;
  const order = await tx.order.findFirst({ where: { id: attempt.referenceId, merchantId: attempt.merchantId }, include: { payment: true, merchant: true } });
  if (!order?.payment || order.payment.method !== 'ONLINE' || order.merchant.subscriptionMarket !== 'SA' || order.merchant.currency !== 'SAR') throw new ValidationError('Unexpected Paymob order');
  if (sarMinor(Number(order.payment.amount)) !== Number(attempt.amountMinor)) throw new ValidationError('Order amount changed after checkout');
  if (order.payment.status !== 'PENDING') throw new ConflictError('Order payment already resolved');
  await tx.payment.update({ where: { id: order.payment.id }, data: { status: 'COMPLETED', paidAt: new Date(), transactionRef: `paymob:${transactionId}`, metadata: {
    provider: 'paymob', attemptId: attempt.id, transactionId, amountMinor: Number(attempt.amountMinor), currency: 'SAR', processingFeeStatus: 'AWAITING_RECONCILIATION', fulfillmentBlocked: ['CANCELLED', 'REJECTED'].includes(order.status) } } });
  await recordAssistedSalePayment(tx, order.id);
  if (attempt.mode === 'TEST') return;
  await recordOnlinePaymentEntry(tx, { provider: 'paymob', feeReconciled: false, payoutBlocked: ['CANCELLED', 'REJECTED'].includes(order.status), merchantId: attempt.merchantId, orderId: order.id, paymentId: order.payment.id,
    providerReference: `paymob:payment:${transactionId}`, grossAmount: Number(attempt.amountMinor) / 100, processingFee: 0, platformFee: 0, currency: 'SAR', holdDays,
    metadata: { attemptId: attempt.id, transactionId, processingFeeStatus: 'AWAITING_RECONCILIATION', legalMerchant: 'مؤسسة فهد لاين' } });
}

async function completeSubscription(tx: Prisma.TransactionClient, attempt: OnlineCheckoutAttempt, transactionId: string) {
  await tx.$queryRaw`SELECT id FROM merchants WHERE id = ${attempt.merchantId} FOR UPDATE`;
  const request = await tx.merchantPlanChangeRequest.findFirst({ where: { id: attempt.referenceId, merchantId: attempt.merchantId }, include: { targetPlan: true } });
  if (!request || !['PENDING', 'CONTACTED'].includes(request.status)) throw new ConflictError('Plan request already resolved');
  const quote = planRequestQuote(request);
  if (quote.currency !== 'SAR' || !request.targetPlan.code.startsWith('SA_') || sarMinor(quote.amount) !== Number(attempt.amountMinor)) throw new ValidationError('Subscription quote changed after checkout');
  const merchant = await tx.merchant.findUniqueOrThrow({ where: { id: attempt.merchantId }, select: { subscriptionMarket: true } });
  if (merchant.subscriptionMarket !== 'SA') throw new ValidationError('Subscription market changed');
  const existing = await tx.merchantSubscription.findUnique({ where: { merchantId: attempt.merchantId } });
  if (existing?.externalSubscriptionId && existing.status !== 'CANCELLED') throw new ConflictError('A recurring subscription is already active');
  const now = new Date();
  const periodStart = existing?.billingProvider === 'paymob' && existing.planId === request.targetPlanId && existing.status === 'ACTIVE' && existing.currentPeriodEndsAt && existing.currentPeriodEndsAt > now ? existing.currentPeriodEndsAt : now;
  const end = prepaidPeriodEnd(periodStart, quote.billingInterval);
  const previousPayment = existing?.billingProvider === 'paymob' && existing.status === 'ACTIVE' && existing.currentPeriodEndsAt && existing.currentPeriodEndsAt > now
    ? await tx.merchantSubscriptionPayment.findFirst({ where: { merchantId: attempt.merchantId, targetPlanId: existing.planId, provider: 'paymob', status: 'VERIFIED' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } }) : null;
  const previousPeriod = previousPayment && existing ? { paymentId: previousPayment.id, planId: existing.planId, billingInterval: existing.billingInterval,
    startsAt: existing.startsAt.toISOString(), periodStartsAt: existing.currentPeriodStartsAt?.toISOString() ?? existing.startsAt.toISOString(),
    periodEndsAt: existing.currentPeriodEndsAt!.toISOString(), price: existing.priceOverride == null ? null : Number(existing.priceOverride), currency: existing.currencyOverride } : null;
  const payment = await tx.merchantSubscriptionPayment.create({ data: { merchantId: attempt.merchantId, targetPlanId: request.targetPlanId, planChangeRequestId: request.id,
    amount: quote.amount, currency: 'SAR', transactionRef: `paymob:${transactionId}`, provider: attempt.mode === 'TEST' ? 'paymob_test' : 'paymob', externalCheckoutId: `paymob:${attempt.providerIntentionId || attempt.id}`,
    externalPaymentId: transactionId, status: 'VERIFIED', reviewedAt: now } });
  const values = { planId: request.targetPlanId, status: 'ACTIVE' as const, billingProvider: 'paymob', billingInterval: quote.billingInterval, startsAt: now,
    currentPeriodStartsAt: now, currentPeriodEndsAt: end, priceOverride: quote.amount, currencyOverride: 'SAR', externalSubscriptionId: null, externalCustomerId: null,
    trialStartedAt: null, trialEndsAt: null, graceEndsAt: null, cancelledAt: null, cancelAtPeriodEnd: false, isGrandfathered: false };
  const subscription = await tx.merchantSubscription.upsert({ where: { merchantId: attempt.merchantId }, update: values, create: { merchantId: attempt.merchantId, ...values } });
  await tx.merchantPlanChangeRequest.update({ where: { id: request.id }, data: { status: 'COMPLETED', resolvedAt: now, requestKey: null } });
  await tx.merchantSubscriptionEvent.create({ data: { merchantId: attempt.merchantId, subscriptionId: subscription.id, type: 'subscription.activated', source: 'paymob', metadata: { attemptId: attempt.id, transactionId, prepaid: true, previousPeriod } } });
  if (attempt.mode !== 'TEST') { await evaluateMerchantReferralInTransaction(tx, attempt.merchantId, now, payment.id); await evaluateMarketerReferralInTransaction(tx, attempt.merchantId, now, payment.id); }
}

async function restorePreviousPaymobPeriod(tx: Prisma.TransactionClient, attempt: OnlineCheckoutAttempt) {
  const activation = await tx.merchantSubscriptionEvent.findFirst({ where: { merchantId: attempt.merchantId, source: 'paymob', type: 'subscription.activated', metadata: { path: ['attemptId'], equals: attempt.id } }, select: { metadata: true } });
  const metadata = activation?.metadata as Prisma.JsonObject | undefined;
  const previous = metadata?.previousPeriod as Prisma.JsonObject | null | undefined;
  const now = new Date();
  if (previous && typeof previous.paymentId === 'string' && typeof previous.planId === 'string' && typeof previous.periodEndsAt === 'string'
    && typeof previous.startsAt === 'string' && typeof previous.periodStartsAt === 'string' && new Date(previous.periodEndsAt) > now
    && (previous.billingInterval === 'MONTHLY' || previous.billingInterval === 'YEARLY')) {
    const paid = await tx.merchantSubscriptionPayment.findFirst({ where: { id: previous.paymentId, merchantId: attempt.merchantId, status: 'VERIFIED', provider: 'paymob' }, select: { id: true } });
    if (paid) {
      await tx.merchantSubscription.updateMany({ where: { merchantId: attempt.merchantId, billingProvider: 'paymob' }, data: { planId: previous.planId, status: 'ACTIVE', cancelledAt: null,
        billingInterval: previous.billingInterval, startsAt: new Date(previous.startsAt), currentPeriodStartsAt: new Date(previous.periodStartsAt), currentPeriodEndsAt: new Date(previous.periodEndsAt),
        priceOverride: typeof previous.price === 'number' ? previous.price : null, currencyOverride: typeof previous.currency === 'string' ? previous.currency : null } });
      return;
    }
  }
  await tx.merchantSubscription.updateMany({ where: { merchantId: attempt.merchantId, billingProvider: 'paymob' }, data: { status: 'CANCELLED', cancelledAt: now, currentPeriodEndsAt: now } });
}

export function prepaidPeriodEnd(start: Date, interval: 'MONTHLY' | 'YEARLY') {
  const end = new Date(start); const day = end.getUTCDate(); end.setUTCDate(1);
  if (interval === 'YEARLY') end.setUTCFullYear(end.getUTCFullYear() + 1); else end.setUTCMonth(end.getUTCMonth() + 1);
  const finalDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate(); end.setUTCDate(Math.min(day, finalDay));
  return end;
}

export function sarMinor(amount: number) {
  const minor = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(minor) || minor <= 0 || Math.abs(amount * 100 - minor) > 0.0001) throw new ValidationError('Invalid SAR amount');
  return minor;
}
function uniqueConflict(error: unknown) { return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002'); }

// Server-only reconciliation. Browser query parameters never establish payment.
export async function reconcilePaymobSubscriptionAttempt(merchantId: string, requestId: string) {
  const attempt = await prisma.onlineCheckoutAttempt.findUnique({ where: { provider_purpose_referenceId: { provider: 'paymob', purpose: 'SUBSCRIPTION', referenceId: requestId } } });
  if (!attempt || attempt.merchantId !== merchantId || ['SUCCEEDED', 'FAILED', 'EXPIRED'].includes(attempt.status)) return;
  if (attempt.status === 'CREATING' && attempt.updatedAt.getTime() > Date.now() - 60000) return;
  if (attempt.status === 'CREATING') await prisma.onlineCheckoutAttempt.updateMany({ where: { id: attempt.id, status: 'CREATING' }, data: { status: 'UNKNOWN' } });
  const { gateway } = await getPaymobGateway();
  const remote = await gateway.inquireOrder({ orderId: attempt.providerOrderId, merchantOrderId: attempt.id });
  if (!remote) {
    // Creation is the only transition into UNKNOWN, and it never returns a
    // checkout URL unless READY was persisted first. An expired UNKNOWN with
    // no stored provider identity/secret therefore never delivered a payment
    // page. Authenticated "not found" plus expiry can close this *unstarted*
    // attempt; a READY or identifiable payment always requires reconciliation.
    if (attempt.status === 'UNKNOWN' && !attempt.providerIntentionId && !attempt.providerOrderId && !attempt.providerTransactionId && !attempt.checkoutSecretEncrypted
      && attempt.expiresAt.getTime() + 5 * 60_000 < Date.now()) {
      await prisma.onlineCheckoutAttempt.updateMany({ where: { id: attempt.id, status: 'UNKNOWN', providerIntentionId: null, providerOrderId: null, providerTransactionId: null, checkoutSecretEncrypted: null }, data: { status: 'EXPIRED', completedAt: new Date() } });
    }
    return;
  }
  const order = remote.order as Record<string, unknown> | undefined;
  if (!order || (attempt.providerOrderId ? identifier(order.id) !== attempt.providerOrderId : identifier(order.merchant_order_id) !== attempt.id)
    || remote.currency !== attempt.currency || remote.amount_cents !== Number(attempt.amountMinor)
    || !Array.isArray(attempt.integrationIds) || !attempt.integrationIds.includes(Number(remote.integration_id))
    || (typeof remote.is_live === 'boolean' && remote.is_live !== (attempt.mode === 'LIVE'))
    || (typeof remote.is_test === 'boolean' && remote.is_test !== (attempt.mode === 'TEST'))) throw new ValidationError('Payment inquiry mismatch');
  if (remote.pending === false && remote.success === true) { await applyAuthenticatedPaymobTransaction(remote); return; }
  if (attempt.expiresAt > new Date() && remote.pending === false && remote.success === false && remote.is_auth === false && remote.has_parent_transaction === false) {
    await prisma.onlineCheckoutAttempt.updateMany({ where: { id: attempt.id, status: 'READY' }, data: { status: 'DECLINED' } });
  }
  // A declined transaction on an unexpired hosted page can still be retried
  // there. Only a final decline after its expiry unlocks a new payment method.
  if (attempt.expiresAt <= new Date() && remote.pending === false && remote.success === false && remote.is_auth === false && remote.has_parent_transaction === false) {
    await prisma.onlineCheckoutAttempt.updateMany({ where: { id: attempt.id, status: { in: ['READY', 'DECLINED', 'UNKNOWN'] } }, data: { status: 'FAILED', completedAt: new Date() } });
  }
}
