import prisma from '@/lib/db/prisma';
import { ConflictError, ValidationError } from '@/lib/errors';
import type { Prisma } from '@prisma/client';

export async function listPaymobBlockedPayments() {
  return prisma.merchantSettlementEntry.findMany({ where: { provider: 'paymob', type: 'ONLINE_PAYMENT', payoutBlocked: true },
    include: { merchant: { select: { name: true } } }, orderBy: { createdAt: 'asc' }, take: 200 });
}

export async function listPaymobFeesAwaitingReconciliation() {
  const rows = await prisma.merchantSettlementEntry.findMany({ where: { provider: 'paymob', type: 'ONLINE_PAYMENT', feeReconciled: false },
    include: { merchant: { select: { name: true } } }, orderBy: { createdAt: 'asc' }, take: 200 });
  const ids = rows.flatMap(row => row.orderId ? [row.orderId] : []);
  const orders = await prisma.order.findMany({ where: { id: { in: ids } }, select: { id: true, orderNumber: true } });
  const names = new Map(orders.map(row => [row.id, row.orderNumber]));
  return rows.map(row => ({ ...row, orderNumber: row.orderId ? names.get(row.orderId) : undefined }));
}

export async function reconcilePaymobFee(input: { entryId: string; feeMinor: number; statementReference: string; actorId: string }) {
  if (!Number.isSafeInteger(input.feeMinor) || input.feeMinor < 0 || input.feeMinor > 9_999_999_999 || !input.statementReference.trim() || input.statementReference.length > 160) throw new ValidationError('أدخل رسوم العملية الفعلية ومرجع كشف Paymob.');
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM merchant_settlement_entries WHERE id = ${input.entryId} FOR UPDATE`;
    const entry = await tx.merchantSettlementEntry.findUniqueOrThrow({ where: { id: input.entryId } });
    if (entry.provider !== 'paymob' || entry.currency !== 'SAR' || Number(entry.platformFee) !== 0 || entry.type !== 'ONLINE_PAYMENT' || entry.feeReconciled || entry.settlementBatchId || entry.status !== 'HELD') throw new ConflictError('تمت مطابقة هذه الرسوم أو أدرجت العملية في تسوية.');
    const grossMinor = Math.round(Number(entry.grossAmount) * 100);
    const previous = entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata) ? entry.metadata as Prisma.JsonObject : {};
    await tx.merchantSettlementEntry.update({ where: { id: entry.id }, data: { feeReconciled: true, processingFee: input.feeMinor / 100,
      netAmount: (grossMinor - input.feeMinor) / 100, status: !entry.payoutBlocked && entry.availableAt <= new Date() ? 'AVAILABLE' : 'HELD',
      metadata: { ...previous, processingFeeStatus: 'RECONCILED', feeStatementReference: input.statementReference.trim(), feeReviewedById: input.actorId, feeReviewedAt: new Date().toISOString() } } });
    await tx.merchantSettlementEntry.updateMany({ where: { provider: 'paymob', type: 'REFUND', feeReconciled: false, metadata: { path: ['originalEntryId'], equals: entry.id } },
      data: { feeReconciled: true, availableAt: entry.availableAt, status: !entry.payoutBlocked && entry.availableAt <= new Date() ? 'AVAILABLE' : 'HELD' } });
  });
}
