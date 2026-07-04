import prisma from '@/lib/db/prisma';
import { NotFoundError } from '@/lib/errors';
import * as paymentsRepo from '../repositories/payments.repository';
import type { RecordPaymentInput } from '../schemas/payments.schemas';
import { serializePrismaObject } from '@/lib/serialization';

// ============================================================================
// Payments Service — Business logic
// ============================================================================

/** Get payment for an order */
export async function getPayment(orderId: string) {
  const payment = await paymentsRepo.findByOrder(orderId);
  if (!payment) throw new NotFoundError('Payment');
  return payment;
}

/** Record a new payment */
export async function recordPayment(data: RecordPaymentInput) {
  return paymentsRepo.create(data);
}

/** Mark a payment as completed */
export async function markAsPaid(id: string, transactionRef?: string) {
  const updateData: Record<string, unknown> = {
    status: 'COMPLETED' as const,
    paidAt: new Date(),
  };

  if (transactionRef) {
    // Update both status and transactionRef atomically
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        transactionRef,
      },
    });
    return serializePrismaObject(payment);
  }

  return paymentsRepo.updateStatus(id, 'COMPLETED', new Date());
}

/** Refund a payment */
export async function refund(id: string) {
  return paymentsRepo.updateStatus(id, 'REFUNDED');
}
