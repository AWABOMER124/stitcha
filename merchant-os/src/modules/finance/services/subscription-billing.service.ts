import prisma from '@/lib/db/prisma';
import * as financeService from './finance.service';

/**
 * Auto-generates monthly settlements for every merchant on a SUBSCRIPTION
 * commission plan. Previously, SUBSCRIPTION billing only happened when a
 * distributor manually created a settlement (see finance.service.createSettlement)
 * — this closes that gap without needing a real job queue (this app has none,
 * see SyncQueueService): it's a plain idempotent function, safe to call from
 * a cron tick or at server startup to catch up after downtime.
 *
 * Idempotent: re-running for a period that's already billed is a no-op per
 * merchant (checked via an existing-Settlement lookup), so calling this
 * extra times (startup + scheduled tick landing the same day) never double-bills.
 */

/** The most recently fully-completed calendar month, as [periodFrom, periodTo). */
function previousMonthRange(now = new Date()): { periodFrom: Date; periodTo: Date } {
  const periodFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const periodTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { periodFrom, periodTo };
}

export interface SubscriptionBillingResult {
  periodFrom: Date;
  periodTo: Date;
  billed: string[];
  skippedAlreadyBilled: string[];
  failed: { merchantId: string; error: string }[];
}

export async function runSubscriptionBilling(now = new Date()): Promise<SubscriptionBillingResult> {
  const { periodFrom, periodTo } = previousMonthRange(now);

  const merchants = await prisma.merchant.findMany({
    where: {
      isActive: true,
      status: 'ACTIVE',
      commissionPlan: { type: 'SUBSCRIPTION', isActive: true },
    },
    select: { id: true, distributorId: true },
  });

  const result: SubscriptionBillingResult = { periodFrom, periodTo, billed: [], skippedAlreadyBilled: [], failed: [] };

  for (const merchant of merchants) {
    if (!merchant.distributorId) continue; // SUBSCRIPTION plans are distributor-owned; a merchant without one can't have one assigned anyway.

    const existing = await prisma.settlement.findFirst({
      where: { merchantId: merchant.id, periodFrom, periodTo },
      select: { id: true },
    });
    if (existing) {
      result.skippedAlreadyBilled.push(merchant.id);
      continue;
    }

    try {
      await financeService.createSettlement(merchant.distributorId, {
        merchantId: merchant.id,
        periodFrom,
        periodTo,
        notes: 'Auto-generated monthly subscription billing',
      });
      result.billed.push(merchant.id);
    } catch (err) {
      result.failed.push({ merchantId: merchant.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return result;
}
