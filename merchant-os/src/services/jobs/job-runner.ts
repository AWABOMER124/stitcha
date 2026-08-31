import { randomUUID } from 'node:crypto';
import { billingJobHandlers, enqueueSubscriptionBilling } from './billing.jobs';
import { processOutboxBatch, type OutboxHandlers } from './outbox.service';
import { notificationJobHandlers } from './notification.jobs';
import prisma from '@/lib/db/prisma';
import { deliveryPartnerJobHandlers } from './delivery-partner.jobs';

const handlers: OutboxHandlers = new Map([
  ...billingJobHandlers,
  ...notificationJobHandlers,
  ...deliveryPartnerJobHandlers,
]);

export async function runScheduledJobs(now = new Date()) {
  await enqueueSubscriptionBilling(now);
  const result = await processOutboxBatch({
    workerId: `scheduler-${randomUUID()}`,
    handlers,
  });
  const deadLetters = await prisma.outboxJob.count({ where: { status: 'FAILED' } });
  return { ...result, deadLetters };
}
