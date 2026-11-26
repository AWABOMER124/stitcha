import type { Prisma } from '@prisma/client';

export async function recordAssistedSalePayment(tx: Prisma.TransactionClient, orderId: string) {
  const quote = await tx.salesQuote.findUnique({ where: { orderId }, select: { id: true, merchantId: true, createdById: true, customerName: true } });
  if (!quote) return;
  await tx.salesQuoteEvent.upsert({ where: { id: `sale-paid-${quote.id}` }, update: {},
    create: { id: `sale-paid-${quote.id}`, quoteId: quote.id, type: 'PAID', details: { orderId } } });
  await tx.notificationLog.upsert({ where: { idempotencyKey: `sale:paid:${quote.id}` }, update: {}, create: {
    merchantId: quote.merchantId, type: 'SYSTEM', channel: 'IN_APP', recipient: quote.createdById,
    title: 'تم سداد طلب المبيعات', body: `وصل تأكيد دفع طلب ${quote.customerName}.`,
    metadata: { kind: 'ORDER', orderId }, idempotencyKey: `sale:paid:${quote.id}`,
  } });
}
