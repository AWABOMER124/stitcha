import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { createStripeGatewayFromEnv } from '@/services/payment-gateways';
import { evaluateMerchantReferralInTransaction } from '@/modules/merchant-referrals/merchant-referrals.service';
import { evaluateMarketerReferralInTransaction } from '@/modules/marketer-referrals/marketer-referrals.service';
import { getPlatformBillingSettings } from '@/modules/subscription-payments/subscription-payments.service';
import { recordOnlinePaymentEntry, recordRefundEntry } from '@/modules/online-settlements/online-settlements.service';

const PROVIDER = 'stripe';

export function getStripeStatus() {
  return createStripeGatewayFromEnv().status();
}

export async function isMerchantEligibleForCentralStripe(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      isActive: true,
      status: true,
      identityVerification: { select: { status: true } },
      referralPayoutProfile: { select: { id: true } },
    },
  });
  return Boolean(
    merchant?.isActive
    && merchant.status === 'ACTIVE'
    && merchant.identityVerification?.status === 'APPROVED'
    && merchant.referralPayoutProfile,
  );
}

export async function getMerchantStripeStatus(merchantId: string) {
  const account = await prisma.merchantStripeAccount.findUnique({ where: { merchantId } });
  return account && {
    country: account.country,
    detailsSubmitted: account.detailsSubmitted,
    chargesEnabled: account.chargesEnabled,
    payoutsEnabled: account.payoutsEnabled,
    ready: account.detailsSubmitted && account.chargesEnabled && account.payoutsEnabled,
    updatedAt: account.updatedAt,
  };
}

export async function startMerchantStripeOnboarding(input: {
  merchantId: string;
  email?: string | null;
  country: string;
  origin: string;
}) {
  const gateway = createStripeGatewayFromEnv();
  const country = input.country.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new ValidationError('Use a valid two-letter country code');
  let stored = await prisma.merchantStripeAccount.findUnique({ where: { merchantId: input.merchantId } });
  if (!stored) {
    const created = await gateway.createConnectedAccount({ merchantId: input.merchantId, country, email: input.email ?? undefined });
    stored = await prisma.merchantStripeAccount.create({
      data: {
        merchantId: input.merchantId,
        stripeAccountId: created.id,
        country: created.country || country,
        detailsSubmitted: created.detailsSubmitted,
        chargesEnabled: created.chargesEnabled,
        payoutsEnabled: created.payoutsEnabled,
      },
    });
  }
  const url = await gateway.createAccountLink({
    accountId: stored.stripeAccountId,
    refreshUrl: `${input.origin}/api/stripe/connect/refresh`,
    returnUrl: `${input.origin}/api/stripe/connect/return`,
  });
  return { url };
}

export async function refreshMerchantStripeAccount(merchantId: string) {
  const stored = await prisma.merchantStripeAccount.findUnique({ where: { merchantId } });
  if (!stored) throw new NotFoundError('Stripe account');
  const remote = await createStripeGatewayFromEnv().retrieveConnectedAccount(stored.stripeAccountId);
  return prisma.merchantStripeAccount.update({
    where: { id: stored.id },
    data: {
      country: remote.country || stored.country,
      detailsSubmitted: remote.detailsSubmitted,
      chargesEnabled: remote.chargesEnabled,
      payoutsEnabled: remote.payoutsEnabled,
      onboardingCompletedAt: remote.detailsSubmitted && remote.chargesEnabled && remote.payoutsEnabled
        ? stored.onboardingCompletedAt ?? new Date()
        : null,
    },
  });
}

export async function createSubscriptionStripeCheckout(input: {
  merchantId: string;
  customerEmail?: string | null;
  origin: string;
}) {
  const [request, current] = await Promise.all([
    prisma.merchantPlanChangeRequest.findFirst({
      where: { merchantId: input.merchantId, status: { in: ['PENDING', 'CONTACTED'] } },
      include: { targetPlan: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.merchantSubscription.findUnique({ where: { merchantId: input.merchantId }, select: { billingProvider: true, externalSubscriptionId: true, status: true } }),
  ]);
  if (!request) throw new ValidationError('Request a paid plan before opening Stripe checkout');
  if (current?.billingProvider === PROVIDER && current.externalSubscriptionId && current.status !== 'CANCELLED') {
    throw new ConflictError('An active Stripe subscription already exists; cancel or change it before starting another subscription');
  }
  const amount = Number(request.targetPlan.monthlyPrice);
  if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('The selected plan does not require payment');
  const pendingManual = await prisma.merchantSubscriptionPayment.findFirst({
    where: { merchantId: input.merchantId, provider: 'manual', status: 'PENDING' },
    select: { id: true },
  });
  if (pendingManual) throw new ConflictError('A bank transfer is already under review');
  return createStripeGatewayFromEnv().createCheckoutSession({
    mode: 'subscription',
    internalReference: request.id,
    idempotencyKey: `wasla-subscription-${request.id}`,
    itemName: `WASLA ${request.targetPlan.name}`,
    amount,
    currency: request.targetPlan.currency,
    customerEmail: input.customerEmail ?? undefined,
    successUrl: `${input.origin}/dashboard/subscription?stripe=success`,
    cancelUrl: `${input.origin}/dashboard/subscription?stripe=cancelled`,
    metadata: {
      kind: 'SUBSCRIPTION',
      merchant_id: input.merchantId,
      plan_change_request_id: request.id,
    },
  });
}

export async function createOrderStripeCheckout(input: { orderId: string; merchantId: string; origin: string }) {
  if (!(await isMerchantEligibleForCentralStripe(input.merchantId))) {
    throw new BusinessRuleError('Online payments require approved merchant identity and payout details');
  }
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, merchantId: input.merchantId },
    include: { merchant: true, payment: true },
  });
  if (!order || !order.payment) throw new NotFoundError('Order');
  if (order.payment.method !== 'ONLINE' || order.payment.status !== 'PENDING') throw new ConflictError('Order is not awaiting online payment');
  const storeAmount = Number(order.total);
  const storeCurrency = order.merchant.currency.toUpperCase();
  const billing = storeCurrency === 'SDG' ? await getPlatformBillingSettings() : null;
  const chargeCurrency = storeCurrency === 'SDG' ? 'USD' : storeCurrency;
  const chargeAmount = storeCurrency === 'SDG' ? Math.round((storeAmount / billing!.usdToSdgRate) * 100) / 100 : storeAmount;
  if (chargeAmount < 0.5) throw new BusinessRuleError('Order total is below the minimum Stripe card charge');
  const session = await createStripeGatewayFromEnv().createCheckoutSession({
    mode: 'payment',
    internalReference: order.id,
    idempotencyKey: `wasla-order-${order.id}`,
    itemName: `Order ${order.orderNumber} — ${order.merchant.name}`,
    amount: chargeAmount,
    currency: chargeCurrency,
    successUrl: `${input.origin}/store/${order.merchant.slug}/order/${order.id}?payment=success`,
    cancelUrl: `${input.origin}/store/${order.merchant.slug}/checkout?payment=cancelled`,
    metadata: { kind: 'ORDER', order_id: order.id, merchant_id: input.merchantId },
  });
  await prisma.payment.update({
    where: { id: order.payment.id },
    data: { transactionRef: session.sessionId, metadata: { provider: PROVIDER, checkoutSessionId: session.sessionId, chargeAmount, chargeCurrency, storeAmount, storeCurrency, usdToSdgRate: billing?.usdToSdgRate ?? null } },
  });
  return session;
}

export async function processStripeWebhook(rawBody: string, signature: string | null) {
  const gateway = createStripeGatewayFromEnv();
  const event = gateway.constructWebhookEvent(rawBody, signature);
  const key = { provider_externalEventId: { provider: PROVIDER, externalEventId: event.id } };
  try {
    await prisma.billingWebhookEvent.create({ data: {
      provider: PROVIDER,
      externalEventId: event.id,
      eventType: event.type,
      payloadSha256: createHash('sha256').update(rawBody).digest('hex'),
    } });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
  }
  const claim = await prisma.billingWebhookEvent.updateMany({
    where: { provider: PROVIDER, externalEventId: event.id, status: { in: ['RECEIVED', 'FAILED'] } },
    data: { status: 'PROCESSING', errorMessage: null },
  });
  if (claim.count !== 1) return { duplicate: true };

  try {
    const object = event.data.object;
    let processed = false;
    if (event.type === 'checkout.session.completed') processed = await processCompletedCheckout(object, gateway);
    else if (event.type === 'account.updated') processed = await processConnectedAccountUpdate(object);
    else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') processed = await processSubscriptionUpdate(object, event.type);
    else if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.payment_failed') processed = await processInvoiceUpdate(object, gateway, event.type);
    else if (event.type === 'charge.refunded') processed = await processRefund(object, event.id);
    await prisma.billingWebhookEvent.update({
      where: key,
      data: { status: processed ? 'PROCESSED' : 'IGNORED', processedAt: new Date() },
    });
    return { duplicate: false, processed };
  } catch (error) {
    await prisma.billingWebhookEvent.update({
      where: key,
      data: { status: 'FAILED', errorMessage: safeErrorMessage(error) },
    }).catch(() => undefined);
    throw error;
  }
}

async function processCompletedCheckout(object: Record<string, unknown>, gateway: ReturnType<typeof createStripeGatewayFromEnv>) {
  const metadata = readMetadata(object.metadata);
  if (object.payment_status !== 'paid') return false;
  if (metadata.kind === 'ORDER') return completeOrderPayment(object, metadata, gateway);
  if (metadata.kind !== 'SUBSCRIPTION') return false;
  const subscriptionId = typeof object.subscription === 'string' ? object.subscription : '';
  if (!subscriptionId) throw new ValidationError('Stripe checkout has no subscription');
  const snapshot = await gateway.retrieveSubscription(subscriptionId);
  const requestId = metadata.plan_change_request_id;
  const merchantId = metadata.merchant_id;
  if (!requestId || !merchantId) throw new ValidationError('Stripe subscription metadata is incomplete');
  const sessionId = typeof object.id === 'string' ? object.id : '';
  const paymentIntent = typeof object.payment_intent === 'string' ? object.payment_intent : undefined;
  const customerId = typeof object.customer === 'string' ? object.customer : snapshot.customerId;

  await prisma.$transaction(async tx => {
    const request = await tx.merchantPlanChangeRequest.findFirst({
      where: { id: requestId, merchantId },
      include: { targetPlan: true },
    });
    if (!request) throw new NotFoundError('Plan change request');
    if (request.status === 'COMPLETED') return;
    const now = new Date();
    const payment = await tx.merchantSubscriptionPayment.upsert({
      where: { externalCheckoutId: sessionId },
      update: { status: 'VERIFIED', reviewedAt: now, externalPaymentId: paymentIntent },
      create: {
        merchantId,
        targetPlanId: request.targetPlanId,
        planChangeRequestId: request.id,
        amount: request.targetPlan.monthlyPrice,
        currency: request.targetPlan.currency,
        transactionRef: sessionId,
        provider: PROVIDER,
        externalCheckoutId: sessionId,
        externalPaymentId: paymentIntent,
        status: 'VERIFIED',
        reviewedAt: now,
      },
    });
    const subscription = await tx.merchantSubscription.upsert({
      where: { merchantId },
      update: {
        planId: request.targetPlanId,
        status: mapStripeSubscriptionStatus(snapshot.status),
        billingInterval: 'MONTHLY',
        billingProvider: PROVIDER,
        startsAt: snapshot.currentPeriodStart ?? now,
        currentPeriodStartsAt: snapshot.currentPeriodStart ?? now,
        currentPeriodEndsAt: snapshot.currentPeriodEnd,
        externalCustomerId: customerId,
        externalSubscriptionId: subscriptionId,
        priceOverride: request.targetPlan.monthlyPrice,
        currencyOverride: request.targetPlan.currency,
        cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
        cancelledAt: null,
        trialStartedAt: null,
        trialEndsAt: null,
        graceEndsAt: null,
        isGrandfathered: false,
      },
      create: {
        merchantId,
        planId: request.targetPlanId,
        status: mapStripeSubscriptionStatus(snapshot.status),
        billingInterval: 'MONTHLY',
        billingProvider: PROVIDER,
        startsAt: snapshot.currentPeriodStart ?? now,
        currentPeriodStartsAt: snapshot.currentPeriodStart ?? now,
        currentPeriodEndsAt: snapshot.currentPeriodEnd,
        externalCustomerId: customerId,
        externalSubscriptionId: subscriptionId,
        priceOverride: request.targetPlan.monthlyPrice,
        currencyOverride: request.targetPlan.currency,
      },
    });
    await tx.merchantPlanChangeRequest.update({ where: { id: request.id }, data: { status: 'COMPLETED', resolvedAt: now } });
    await tx.merchantSubscriptionEvent.create({ data: {
      merchantId,
      subscriptionId: subscription.id,
      type: 'subscription.activated',
      source: PROVIDER,
      metadata: { checkoutSessionId: sessionId, externalSubscriptionId: subscriptionId },
    } });
    await evaluateMerchantReferralInTransaction(tx, merchantId, now, payment.id);
    await evaluateMarketerReferralInTransaction(tx, merchantId, now, payment.id);
  });
  return true;
}

async function completeOrderPayment(object: Record<string, unknown>, metadata: Record<string, string>, gateway: ReturnType<typeof createStripeGatewayFromEnv>) {
  const orderId = metadata.order_id;
  const merchantId = metadata.merchant_id;
  if (!orderId || !merchantId) throw new ValidationError('Stripe order metadata is incomplete');
  const amountTotal = typeof object.amount_total === 'number' ? object.amount_total : null;
  const currency = typeof object.currency === 'string' ? object.currency.toUpperCase() : '';
  const paymentIntent = typeof object.payment_intent === 'string' ? object.payment_intent : undefined;
  const sessionId = typeof object.id === 'string' ? object.id : '';
  if (!paymentIntent) throw new ValidationError('Stripe order payment intent is missing');
  const [stripeCost, billing] = await Promise.all([
    gateway.retrievePaymentCost(paymentIntent),
    getPlatformBillingSettings(),
  ]);
  return prisma.$transaction(async tx => {
    const order = await tx.order.findFirst({ where: { id: orderId, merchantId }, include: { merchant: true, payment: true } });
    if (!order?.payment || order.payment.method !== 'ONLINE') throw new NotFoundError('Online order payment');
    const quote = order.payment.metadata && typeof order.payment.metadata === 'object' && !Array.isArray(order.payment.metadata)
      ? order.payment.metadata as Prisma.JsonObject
      : {};
    const expectedCurrency = typeof quote.chargeCurrency === 'string' ? quote.chargeCurrency.toUpperCase() : order.merchant.currency.toUpperCase();
    const expectedAmount = typeof quote.chargeAmount === 'number' ? quote.chargeAmount : Number(order.payment.amount);
    if (currency !== expectedCurrency || amountTotal !== toMinorUnits(expectedAmount, currency)) {
      throw new ValidationError('Stripe amount does not match the order');
    }
    if (stripeCost.currency !== expectedCurrency || toMinorUnits(stripeCost.amount, stripeCost.currency) !== amountTotal) {
      throw new ValidationError('Stripe balance transaction does not match the order');
    }
    await tx.payment.updateMany({
      where: { id: order.payment.id, status: 'PENDING' },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        transactionRef: paymentIntent ?? sessionId,
        metadata: { ...quote, provider: PROVIDER, checkoutSessionId: sessionId, paymentIntentId: paymentIntent ?? null },
      },
    });
    const storeAmount = typeof quote.storeAmount === 'number' ? quote.storeAmount : Number(order.payment.amount);
    const storeCurrency = typeof quote.storeCurrency === 'string' ? quote.storeCurrency.toUpperCase() : order.merchant.currency.toUpperCase();
    const exchangeRate = typeof quote.usdToSdgRate === 'number' ? quote.usdToSdgRate : null;
    const processingFee = stripeCost.currency === storeCurrency
      ? stripeCost.fee
      : storeCurrency === 'SDG' && stripeCost.currency === 'USD' && exchangeRate
        ? stripeCost.fee * exchangeRate
        : (() => { throw new ValidationError('Stripe fee currency cannot be converted for settlement'); })();
    const platformFee = storeAmount * billing.onlinePaymentCommissionRate / 100;
    await recordOnlinePaymentEntry(tx, {
      merchantId,
      orderId,
      paymentId: order.payment.id,
      providerReference: `stripe:payment:${paymentIntent}`,
      grossAmount: storeAmount,
      processingFee,
      platformFee,
      currency: storeCurrency,
      holdDays: billing.onlineSettlementHoldDays,
      metadata: {
        checkoutSessionId: sessionId,
        chargeId: stripeCost.chargeId,
        chargeAmount: stripeCost.amount,
        chargeCurrency: stripeCost.currency,
        exchangeRate,
      },
    });
    return true;
  });
}

async function processConnectedAccountUpdate(object: Record<string, unknown>) {
  const id = typeof object.id === 'string' ? object.id : '';
  if (!id.startsWith('acct_')) return false;
  const existing = await prisma.merchantStripeAccount.findUnique({ where: { stripeAccountId: id } });
  if (!existing) return false;
  const ready = object.details_submitted === true && object.charges_enabled === true && object.payouts_enabled === true;
  await prisma.merchantStripeAccount.update({ where: { id: existing.id }, data: {
    detailsSubmitted: object.details_submitted === true,
    chargesEnabled: object.charges_enabled === true,
    payoutsEnabled: object.payouts_enabled === true,
    onboardingCompletedAt: ready ? existing.onboardingCompletedAt ?? new Date() : null,
  } });
  return true;
}

async function processSubscriptionUpdate(object: Record<string, unknown>, eventType: string) {
  const externalSubscriptionId = typeof object.id === 'string' ? object.id : '';
  if (!externalSubscriptionId.startsWith('sub_')) return false;
  const current = await prisma.merchantSubscription.findUnique({ where: { externalSubscriptionId } });
  if (!current) return false;
  const now = new Date();
  const status = eventType.endsWith('.deleted') ? 'CANCELLED' : mapStripeSubscriptionStatus(String(object.status ?? ''));
  await prisma.$transaction(async tx => {
    await tx.merchantSubscription.update({ where: { id: current.id }, data: {
      status,
      currentPeriodStartsAt: timestampToDate(object.current_period_start),
      currentPeriodEndsAt: timestampToDate(object.current_period_end),
      cancelAtPeriodEnd: object.cancel_at_period_end === true,
      ...(status === 'CANCELLED' ? { cancelledAt: now } : {}),
    } });
    await tx.merchantSubscriptionEvent.create({ data: {
      merchantId: current.merchantId,
      subscriptionId: current.id,
      type: `billing.${eventType}`,
      source: PROVIDER,
      metadata: { externalSubscriptionId, status },
    } });
  });
  return true;
}

async function processInvoiceUpdate(object: Record<string, unknown>, gateway: ReturnType<typeof createStripeGatewayFromEnv>, eventType: string) {
  const subscriptionId = readInvoiceSubscriptionId(object);
  if (!subscriptionId) return false;
  const snapshot = await gateway.retrieveSubscription(subscriptionId);
  const current = await prisma.merchantSubscription.findUnique({ where: { externalSubscriptionId: subscriptionId } });
  if (!current) return false;
  const status = eventType === 'invoice.payment_failed' ? 'PAST_DUE' : mapStripeSubscriptionStatus(snapshot.status);
  await prisma.$transaction(async tx => {
    await tx.merchantSubscription.update({ where: { id: current.id }, data: {
      status,
      externalCustomerId: snapshot.customerId,
      currentPeriodStartsAt: snapshot.currentPeriodStart,
      currentPeriodEndsAt: snapshot.currentPeriodEnd,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    } });
    await tx.merchantSubscriptionEvent.create({ data: {
      merchantId: current.merchantId,
      subscriptionId: current.id,
      type: `billing.${eventType}`,
      source: PROVIDER,
      metadata: { externalSubscriptionId: subscriptionId, status },
    } });
  });
  return true;
}

async function processRefund(object: Record<string, unknown>, eventId: string) {
  if (object.refunded !== true) return false;
  const paymentIntentId = typeof object.payment_intent === 'string' ? object.payment_intent : '';
  if (!paymentIntentId) return false;
  return recordRefundEntry({ eventId, paymentIntentId });
}

function readInvoiceSubscriptionId(object: Record<string, unknown>) {
  if (typeof object.subscription === 'string') return object.subscription;
  const parent = object.parent;
  if (!parent || typeof parent !== 'object' || Array.isArray(parent)) return null;
  const details = (parent as Record<string, unknown>).subscription_details;
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  const subscription = (details as Record<string, unknown>).subscription;
  return typeof subscription === 'string' ? subscription : null;
}

function mapStripeSubscriptionStatus(status: string): 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' {
  if (status === 'trialing') return 'TRIALING';
  if (status === 'active') return 'ACTIVE';
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'PAST_DUE';
  return 'CANCELLED';
}

function timestampToDate(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? new Date(value * 1000) : undefined;
}

function readMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

function toMinorUnits(amount: number, currency: string) {
  const zeroDecimal = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
  return Math.round(amount * (zeroDecimal.has(currency.toUpperCase()) ? 1 : 100));
}

function isUniqueConflict(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function safeErrorMessage(error: unknown) {
  return (error instanceof Error ? error.message : 'Stripe webhook processing failed').slice(0, 500);
}
