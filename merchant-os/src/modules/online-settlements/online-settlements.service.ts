import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';

export type OnlinePaymentSettlementInput = {
  merchantId: string;
  orderId: string;
  paymentId: string;
  providerReference: string;
  grossAmount: number;
  processingFee: number;
  platformFee: number;
  currency: string;
  holdDays: number;
  metadata?: Prisma.InputJsonValue;
};

export async function recordOnlinePaymentEntry(
  tx: Prisma.TransactionClient,
  input: OnlinePaymentSettlementInput,
  paidAt = new Date(),
) {
  const netAmount = roundMoney(input.grossAmount - input.processingFee - input.platformFee);
  if (netAmount < 0) throw new ValidationError('Online settlement fees exceed the payment amount');
  const availableAt = new Date(paidAt.getTime() + input.holdDays * 86_400_000);
  return tx.merchantSettlementEntry.upsert({
    where: { providerReference: input.providerReference },
    update: {},
    create: {
      merchantId: input.merchantId,
      orderId: input.orderId,
      paymentId: input.paymentId,
      type: 'ONLINE_PAYMENT',
      status: input.holdDays === 0 ? 'AVAILABLE' : 'HELD',
      grossAmount: roundMoney(input.grossAmount),
      processingFee: roundMoney(input.processingFee),
      platformFee: roundMoney(input.platformFee),
      netAmount,
      currency: input.currency.toUpperCase(),
      providerReference: input.providerReference,
      availableAt,
      metadata: input.metadata,
    },
  });
}

export async function recordRefundEntry(input: {
  eventId: string;
  paymentIntentId: string;
  refundedAt?: Date;
}) {
  const original = await prisma.merchantSettlementEntry.findFirst({
    where: { providerReference: `stripe:payment:${input.paymentIntentId}`, type: 'ONLINE_PAYMENT' },
  });
  if (!original) {
    const legacy = await prisma.payment.updateMany({
      where: { transactionRef: input.paymentIntentId, status: 'COMPLETED' },
      data: { status: 'REFUNDED' },
    });
    return legacy.count > 0;
  }
  const gross = Number(original.grossAmount);
  const platformFee = Number(original.platformFee);
  const refundNet = roundMoney(-gross + platformFee);
  await prisma.$transaction(async tx => {
    await tx.merchantSettlementEntry.upsert({
      where: { providerReference: `stripe:refund:${input.eventId}` },
      update: {},
      create: {
        merchantId: original.merchantId,
        orderId: original.orderId,
        paymentId: original.paymentId,
        type: 'REFUND',
        status: 'AVAILABLE',
        grossAmount: -gross,
        processingFee: 0,
        platformFee: -platformFee,
        netAmount: refundNet,
        currency: original.currency,
        providerReference: `stripe:refund:${input.eventId}`,
        availableAt: input.refundedAt ?? new Date(),
        metadata: { originalEntryId: original.id, paymentIntentId: input.paymentIntentId },
      },
    });
    if (original.paymentId) {
      await tx.payment.updateMany({ where: { id: original.paymentId }, data: { status: 'REFUNDED' } });
    }
  });
  return true;
}

export async function generateWeeklyOnlineSettlements(now = new Date()) {
  await prisma.merchantSettlementEntry.updateMany({
    where: { status: 'HELD', availableAt: { lte: now } },
    data: { status: 'AVAILABLE' },
  });
  const { periodFrom, periodTo } = previousWeekRange(now);
  const entries = await prisma.merchantSettlementEntry.findMany({
    where: { status: 'AVAILABLE', settlementBatchId: null, availableAt: { lt: periodTo } },
    orderBy: { createdAt: 'asc' },
  });
  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = `${entry.merchantId}:${entry.currency}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  let created = 0;
  for (const group of groups.values()) {
    const merchantId = group[0]!.merchantId;
    const currency = group[0]!.currency;
    try {
      await prisma.$transaction(async tx => {
        const batch = await tx.merchantSettlementBatch.create({
          data: {
            merchantId,
            currency,
            periodFrom,
            periodTo,
            grossAmount: roundMoney(sum(group, 'grossAmount')),
            processingFees: roundMoney(sum(group, 'processingFee')),
            platformFees: roundMoney(sum(group, 'platformFee')),
            netAmount: roundMoney(sum(group, 'netAmount')),
            totalPayments: group.filter(item => item.type === 'ONLINE_PAYMENT').length,
            totalRefunds: group.filter(item => item.type === 'REFUND').length,
          },
        });
        const claimed = await tx.merchantSettlementEntry.updateMany({
          where: { id: { in: group.map(item => item.id) }, status: 'AVAILABLE', settlementBatchId: null },
          data: { status: 'SETTLED', settlementBatchId: batch.id, settledAt: now },
        });
        if (claimed.count !== group.length) throw new ConflictError('Settlement entries were claimed by another worker');
      });
      created += 1;
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
    }
  }
  return { created, entries: entries.length, periodFrom, periodTo };
}

export async function listOnlineSettlementsForAdmin() {
  return prisma.merchantSettlementBatch.findMany({
    include: { merchant: { select: { id: true, name: true, slug: true } }, _count: { select: { entries: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function listMerchantOnlineSettlements(merchantId: string) {
  const [batches, balances] = await Promise.all([
    prisma.merchantSettlementBatch.findMany({ where: { merchantId }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.merchantSettlementEntry.groupBy({
      by: ['status', 'currency'],
      where: { merchantId },
      _sum: { netAmount: true },
    }),
  ]);
  return { batches, balances };
}

export async function markOnlineSettlementPaid(input: { id: string; paidById: string; payoutMethod: string; payoutReference: string; notes?: string }) {
  if (!input.payoutMethod.trim() || !input.payoutReference.trim()) throw new ValidationError('Payout method and reference are required');
  const result = await prisma.merchantSettlementBatch.updateMany({
    where: { id: input.id, status: { in: ['PENDING', 'PROCESSING'] } },
    data: {
      status: 'COMPLETED',
      payoutMethod: input.payoutMethod.trim().slice(0, 80),
      payoutReference: input.payoutReference.trim().slice(0, 160),
      notes: input.notes?.trim().slice(0, 500) || null,
      paidAt: new Date(),
      paidById: input.paidById,
    },
  });
  if (result.count !== 1) throw new NotFoundError('Pending online settlement');
}

export function previousWeekRange(now: Date) {
  const periodTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = periodTo.getUTCDay();
  periodTo.setUTCDate(periodTo.getUTCDate() - ((day + 6) % 7));
  const periodFrom = new Date(periodTo);
  periodFrom.setUTCDate(periodFrom.getUTCDate() - 7);
  return { periodFrom, periodTo };
}

function sum(
  items: Array<{ grossAmount: unknown; processingFee: unknown; platformFee: unknown; netAmount: unknown }>,
  key: 'grossAmount' | 'processingFee' | 'platformFee' | 'netAmount',
) {
  return items.reduce((total, item) => total + Number(item[key]), 0);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isUniqueConflict(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
