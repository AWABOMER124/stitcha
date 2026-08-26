import type { OutboxHandlers } from './outbox.service';
import { enqueueJob } from './outbox.service';
import { previousMonthRange, runSubscriptionBilling } from '@/modules/finance/services/subscription-billing.service';

export const SUBSCRIPTION_BILLING_TOPIC = 'billing.subscription.monthly';

export async function enqueueSubscriptionBilling(now = new Date()) {
  const { periodFrom, periodTo } = previousMonthRange(now);
  const period = periodFrom.toISOString().slice(0, 7);
  return enqueueJob({
    topic: SUBSCRIPTION_BILLING_TOPIC,
    idempotencyKey: `billing:subscription:${period}`,
    payload: {
      runAt: now.toISOString(),
      periodFrom: periodFrom.toISOString(),
      periodTo: periodTo.toISOString(),
    },
    maxAttempts: 8,
  });
}

export const billingJobHandlers: OutboxHandlers = new Map([
  [
    SUBSCRIPTION_BILLING_TOPIC,
    async (payload: unknown) => {
      const runAt = readRunAt(payload);
      const result = await runSubscriptionBilling(runAt);
      if (result.failed.length > 0) {
        throw new Error(`Subscription billing failed for ${result.failed.length} merchant(s)`);
      }
    },
  ],
]);

function readRunAt(payload: unknown): Date {
  if (typeof payload !== 'object' || payload === null || !('runAt' in payload)) {
    throw new Error('Invalid subscription billing payload');
  }
  const runAt = new Date(String(payload.runAt));
  if (Number.isNaN(runAt.getTime())) throw new Error('Invalid subscription billing runAt');
  return runAt;
}
