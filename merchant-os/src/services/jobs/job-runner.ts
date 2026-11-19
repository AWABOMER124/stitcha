import { randomUUID } from 'node:crypto';
import { billingJobHandlers, enqueueSubscriptionBilling } from './billing.jobs';
import { processOutboxBatch, type OutboxHandlers } from './outbox.service';
import { notificationJobHandlers } from './notification.jobs';
import prisma from '@/lib/db/prisma';
import { deliveryPartnerJobHandlers } from './delivery-partner.jobs';
import { expireAiUsageReservations } from '@/modules/ai-usage';
import { generateWeeklyOnlineSettlements } from '@/modules/online-settlements/online-settlements.service';
import { communicationJobHandlers } from '@/modules/communications/delivery';
import { enqueueAutomations } from '@/modules/communications/service';

const handlers: OutboxHandlers = new Map([
  ...billingJobHandlers,
  ...notificationJobHandlers,
  ...deliveryPartnerJobHandlers,
  ...communicationJobHandlers,
]);

export async function runScheduledJobs(now = new Date()) {
  const [, expiredAiReservations, onlineSettlements, communicationQueued] = await Promise.all([
    enqueueSubscriptionBilling(now),
    expireAiUsageReservations(now),
    generateWeeklyOnlineSettlements(now),
    enqueueAutomations(now).catch(() => { console.error('[communications] Automation scan deferred'); return 0; }),
  ]);
  const result = await processOutboxBatch({
    workerId: `scheduler-${randomUUID()}`,
    handlers,
  });
  const deadLetters = await prisma.outboxJob.count({ where: { status: 'FAILED' } });
  return { ...result, deadLetters, expiredAiReservations, onlineSettlements, communicationQueued };
}
