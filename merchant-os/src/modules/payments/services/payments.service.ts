import prisma from '@/lib/db/prisma';
import { NotFoundError } from '@/lib/errors';
import * as paymentsRepo from '../repositories/payments.repository';
import type { RecordPaymentInput } from '../schemas/payments.schemas';
import { serializePrismaObject } from '@/lib/serialization';

// ============================================================================
// Payments Service — Business logic
// ============================================================================

/** Get payment for an order — must belong to the calling merchant */
export async function getPayment(merchantId: string, orderId: string) {
  const payment = await paymentsRepo.findByOrder(orderId, merchantId);
  if (!payment) throw new NotFoundError('Payment');
  return payment;
}

/** Record a new payment — the target order must belong to the calling merchant */
export async function recordPayment(merchantId: string, data: RecordPaymentInput) {
  const order = await prisma.order.findFirst({ where: { id: data.orderId, merchantId }, select: { id: true } });
  if (!order) throw new NotFoundError('Order');
  return paymentsRepo.create(data);
}

/** Mark a payment as completed — must belong to the calling merchant */
export async function markAsPaid(merchantId: string, id: string, transactionRef?: string) {
  if (transactionRef) {
    // Update both status and transactionRef atomically, scoped via the order relation
    // (Payment has no merchantId of its own — see prisma/schema.prisma).
    const result = await prisma.payment.updateMany({
      where: { id, order: { merchantId } },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        transactionRef,
      },
    });
    if (result.count === 0) throw new NotFoundError('Payment');
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id } });
    return serializePrismaObject(payment);
  }

  const payment = await paymentsRepo.updateStatus(id, merchantId, 'COMPLETED', new Date());
  if (!payment) throw new NotFoundError('Payment');
  return payment;
}

/** Refund a payment — must belong to the calling merchant */
export async function refund(merchantId: string, id: string) {
  const payment = await paymentsRepo.updateStatus(id, merchantId, 'REFUNDED');
  if (!payment) throw new NotFoundError('Payment');
  return payment;
}
