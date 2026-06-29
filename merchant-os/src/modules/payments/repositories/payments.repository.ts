import prisma from '@/lib/db/prisma';
import type { PaymentMethod, PaymentStatus } from '@prisma/client';

// ============================================================================
// Payments Repository — Data access layer
// ============================================================================

/** Find payment by order ID */
export async function findByOrder(orderId: string) {
  return prisma.payment.findUnique({
    where: { orderId },
  });
}

/** Create a payment record */
export async function create(data: {
  orderId: string;
  method: string;
  amount: number;
  transactionRef?: string;
}) {
  return prisma.payment.create({
    data: {
      orderId: data.orderId,
      method: data.method as PaymentMethod,
      amount: data.amount,
      transactionRef: data.transactionRef,
    },
  });
}

/** Update payment status */
export async function updateStatus(id: string, status: PaymentStatus, paidAt?: Date) {
  return prisma.payment.update({
    where: { id },
    data: {
      status,
      ...(paidAt && { paidAt }),
    },
  });
}
