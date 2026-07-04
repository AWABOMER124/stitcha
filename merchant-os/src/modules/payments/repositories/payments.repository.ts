import prisma from '@/lib/db/prisma';
import type { PaymentMethod, PaymentStatus } from '@prisma/client';
import { serializePrismaObject } from '@/lib/serialization';

// ============================================================================
// Payments Repository — Data access layer
// ============================================================================

/** Find payment by order ID */
export async function findByOrder(orderId: string) {
  const payment = await prisma.payment.findUnique({
    where: { orderId },
  });
  return serializePrismaObject(payment);
}

/** Create a payment record */
export async function create(data: {
  orderId: string;
  method: string;
  amount: number;
  transactionRef?: string;
}) {
  const payment = await prisma.payment.create({
    data: {
      orderId: data.orderId,
      method: data.method as PaymentMethod,
      amount: data.amount,
      transactionRef: data.transactionRef,
    },
  });
  return serializePrismaObject(payment);
}

/** Update payment status */
export async function updateStatus(id: string, status: PaymentStatus, paidAt?: Date) {
  const payment = await prisma.payment.update({
    where: { id },
    data: {
      status,
      ...(paidAt && { paidAt }),
    },
  });
  return serializePrismaObject(payment);
}
