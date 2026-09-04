import { createHash } from 'crypto';
import prisma from '@/lib/db/prisma';
import type { BillingProvider, VerifiedBillingEvent } from './billing-provider';

export async function processBillingWebhook(provider: BillingProvider, rawBody: string, headers: Headers) {
  // Signature verification and normalization happen before any database write.
  const event = await provider.verifyWebhook(rawBody, headers);
  validateVerifiedEvent(event);
  const key = { provider_externalEventId: { provider: provider.key, externalEventId: event.id } };

  try {
    await prisma.billingWebhookEvent.create({
      data: {
        provider: provider.key,
        externalEventId: event.id,
        eventType: event.type,
        payloadSha256: createHash('sha256').update(rawBody).digest('hex'),
      },
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
  }

  const claimed = await prisma.billingWebhookEvent.updateMany({
    where: { provider: provider.key, externalEventId: event.id, status: { in: ['RECEIVED', 'FAILED'] } },
    data: { status: 'PROCESSING', errorMessage: null },
  });
  if (claimed.count !== 1) return { duplicate: true, processed: false };

  try {
    return await prisma.$transaction(async (tx) => {
      const subscription = await tx.merchantSubscription.findUnique({
        where: { externalSubscriptionId: event.externalSubscriptionId },
        select: { id: true, merchantId: true },
      });
      if (!subscription) {
        await tx.billingWebhookEvent.update({ where: key, data: { status: 'IGNORED', processedAt: new Date() } });
        return { duplicate: false, processed: false };
      }

      const now = new Date();
      await tx.merchantSubscription.update({
        where: { id: subscription.id },
        data: {
          status: event.status,
          billingProvider: provider.key,
          externalCustomerId: event.externalCustomerId,
          currentPeriodStartsAt: event.currentPeriodStartsAt,
          currentPeriodEndsAt: event.currentPeriodEndsAt,
          trialEndsAt: event.trialEndsAt,
          cancelAtPeriodEnd: event.cancelAtPeriodEnd,
          ...(event.status === 'CANCELLED' && { cancelledAt: now }),
        },
      });
      await tx.merchantSubscriptionEvent.create({
        data: {
          merchantId: subscription.merchantId,
          subscriptionId: subscription.id,
          type: `billing.${event.type}`,
          source: provider.key,
          metadata: { externalEventId: event.id, status: event.status },
        },
      });
      await tx.billingWebhookEvent.update({ where: key, data: { status: 'PROCESSED', processedAt: now } });
      return { duplicate: false, processed: true };
    });
  } catch (error) {
    await prisma.billingWebhookEvent.update({
      where: key,
      data: { status: 'FAILED', errorMessage: safeErrorMessage(error) },
    }).catch(() => undefined);
    throw error;
  }
}

function validateVerifiedEvent(event: VerifiedBillingEvent) {
  if (!event.id || !event.type || !event.externalSubscriptionId) {
    throw new Error('Billing provider returned an invalid verified event');
  }
}

function isUniqueConflict(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function safeErrorMessage(error: unknown) {
  return (error instanceof Error ? error.message : 'Webhook processing failed').slice(0, 500);
}
